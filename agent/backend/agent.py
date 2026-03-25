"""
Agent core — Claude + MCP agentic loop with Langfuse v3 tracing.

Tracing hierarchy per request:
  zoho-recruit-agent  (root span)
  ├── claude-turn-1   (generation — input tokens, output tokens, model)
  │   └── tool:list_jobs  (span — input args, result)
  └── claude-turn-2   (generation — final text reply)
"""

import os
import sys
import json
import logging
import time
from contextlib import nullcontext
from pathlib import Path
from typing import AsyncGenerator

import anthropic
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client
from dotenv import load_dotenv

# Load .env FIRST — all keys must be available before any SDK init
load_dotenv(Path(__file__).parent / ".env")

# ── Langfuse (v3 context-manager API) ───────────────────────────────────────
try:
    from langfuse import Langfuse as _LF
    _LANGFUSE_ENABLED = bool(os.getenv("LANGFUSE_PUBLIC_KEY"))
    _langfuse = _LF() if _LANGFUSE_ENABLED else None
    if _LANGFUSE_ENABLED:
        ok = _langfuse.auth_check()
        logging.getLogger("agent").info(f"Langfuse auth_check: {ok}")
except Exception:
    _LANGFUSE_ENABLED = False
    _langfuse = None

logger = logging.getLogger("agent")

# ── Config ───────────────────────────────────────────────────────────────────
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
MCP_SERVER_SCRIPT = os.getenv(
    "MCP_SERVER_PATH",
    str(Path(__file__).parent.parent / "mcp_server" / "zoho_mcp_server.py"),
)
MODEL      = os.getenv("CLAUDE_MODEL", "claude-haiku-4-5-20251001")
MAX_TOKENS = int(os.getenv("MAX_TOKENS", "4096"))

SYSTEM_PROMPT = """You are a friendly, expert hiring assistant from Talendy.
Your goal is to make the user's life easier and help them manage their hiring workflow within Talendy.
You can read the user's screen (provided as [CURRENT PAGE CONTEXT]) and perform actions using your internal recruitment tools.
You can list job openings, view candidate details, create new jobs, archive jobs, and update candidate stages.

CRITICAL RULES:
1. NEVER mention "Zoho Recruit" or "Zoho" to the user. From their perspective, every tool and feature is provided by Talendy.
2. Be friendly, professional but approachable. Use a warm, energetic "Talendy" tone.
3. Use the page context to be smart — if the user is on a LinkedIn job page, offer to help them post it to Talendy.
4. Format your responses using well-structured markdown:
   - Use **bold** for emphasis.
   - Use bullet points or numbered lists for sets of items.
   - Use headers (###) for sections.
   - Use Markdown Tables for structured data comparisons or status lists.
   - Use fenced code blocks (```) for any technical snippets or structured examples.
5. Keep responses compact and avoid unnecessary blank lines. NEVER show raw JSON or internal IDs. Always summarize tool results in clean, professional markdown. Avoid hashtags (#) except for headers. """


# ── Helpers ──────────────────────────────────────────────────────────────────

def _mcp_tool_to_anthropic(tool) -> dict:
    return {
        "name":         tool.name,
        "description":  tool.description or "",
        "input_schema": tool.inputSchema or {"type": "object", "properties": {}},
    }


def _lf_span(name: str, **kwargs):
    """Return a Langfuse start_as_current_span ctx-manager, or nullcontext."""
    if _LANGFUSE_ENABLED and _langfuse:
        return _langfuse.start_as_current_span(name=name, **kwargs)
    return nullcontext()


def _lf_generation(name: str, **kwargs):
    """Return a Langfuse start_as_current_generation ctx-manager, or nullcontext."""
    if _LANGFUSE_ENABLED and _langfuse:
        return _langfuse.start_as_current_generation(name=name, **kwargs)
    return nullcontext()


# ── Agentic loop ─────────────────────────────────────────────────────────────

async def run_agent(
    messages: list[dict],
    session_id: str = "default",
    page_context: str = "",
) -> AsyncGenerator[dict, None]:
    """
    Run the Claude + MCP agentic loop.

    Yields:
      {"type": "text",        "content": "..."}
      {"type": "tool_call",   "name": "...", "input": {...}}
      {"type": "tool_result", "name": "...", "content": "..."}
      {"type": "done",        "message": "..."}
      {"type": "error",       "message": "..."}
    """
    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)
    user_msg = messages[-1]["content"] if messages else ""

    server_params = StdioServerParameters(
        command=sys.executable,
        args=[MCP_SERVER_SCRIPT],
        env={**os.environ},
    )

    # The root Langfuse span wraps the entire request (including all yields).
    # Using sync 'with' is fine inside an async generator — Python supports it.
    with _lf_span(
        name="zoho-recruit-agent",
        input={"query": user_msg},
        metadata={"session_id": session_id},
    ):
        if _LANGFUSE_ENABLED and _langfuse:
            try:
                _langfuse.update_current_trace(session_id=session_id, input=user_msg)
            except Exception:
                pass

        try:
            async with stdio_client(server_params) as (read, write):
                async with ClientSession(read, write) as session:
                    await session.initialize()

                    tools_resp = await session.list_tools()
                    anthropic_tools = [_mcp_tool_to_anthropic(t) for t in tools_resp.tools]
                    logger.info(f"MCP tools loaded: {[t['name'] for t in anthropic_tools]}")

                    conversation = list(messages)

                    current_system_prompt = SYSTEM_PROMPT
                    if page_context:
                        logger.info(f"Received page context ({len(page_context)} chars)")
                        current_system_prompt += (
                            f"\n\n[CURRENT PAGE CONTEXT]:\n{page_context}\n\n"
                            "Use this page content to answer questions about what the user is viewing."
                        )

                    turn = 0
                    final_text = ""

                    while True:
                        turn += 1

                        # ── LLM call (traced as a generation) ──────────────
                        with _lf_generation(
                            name=f"claude-turn-{turn}",
                            model=MODEL,
                            input=conversation,
                            metadata={"tools": [t["name"] for t in anthropic_tools]},
                        ) as gen:
                            t0 = time.time()
                            response = client.messages.create(
                                model=MODEL,
                                max_tokens=MAX_TOKENS,
                                system=current_system_prompt,
                                tools=anthropic_tools,
                                messages=conversation,
                            )
                            logger.debug(
                                f"[turn {turn}] stop={response.stop_reason} "
                                f"tokens={response.usage.input_tokens}→{response.usage.output_tokens}"
                            )

                            # Update generation with response data
                            if _LANGFUSE_ENABLED and _langfuse:
                                try:
                                    # Collect output: text blocks + tool_use blocks
                                    out_blocks = []
                                    for b in response.content:
                                        if hasattr(b, "text"):
                                            out_blocks.append(b.text)
                                        elif b.type == "tool_use":
                                            out_blocks.append(f"🛠️ Tool Use: {b.name}({b.input})")

                                    _langfuse.update_current_generation(
                                        output="\n".join(out_blocks) or str(response.content),
                                        usage_details={
                                            "input":  response.usage.input_tokens,
                                            "output": response.usage.output_tokens,
                                        },
                                    )
                                except Exception:
                                    pass

                        # ── Collect content blocks ─────────────────────────
                        assistant_content = []

                        for block in response.content:
                            if block.type == "text":
                                final_text += block.text
                                assistant_content.append({"type": "text", "text": block.text})
                                yield {"type": "text", "content": block.text}

                            elif block.type == "tool_use":
                                assistant_content.append({
                                    "type":  "tool_use",
                                    "id":    block.id,
                                    "name":  block.name,
                                    "input": block.input,
                                })
                                yield {"type": "tool_call", "name": block.name, "input": block.input}

                        conversation.append({"role": "assistant", "content": assistant_content})

                        # ── Done? ──────────────────────────────────────────
                        if response.stop_reason == "end_turn":
                            if _LANGFUSE_ENABLED and _langfuse:
                                try:
                                    _langfuse.update_current_span(output=final_text)
                                    _langfuse.flush()
                                except Exception:
                                    pass
                            yield {"type": "done", "message": final_text}
                            break

                        # ── Execute tool calls ─────────────────────────────
                        if response.stop_reason == "tool_use":
                            tool_results = []

                            for block in response.content:
                                if block.type != "tool_use":
                                    continue

                                with _lf_span(
                                    name=f"tool:{block.name}",
                                    input=block.input,
                                ):
                                    try:
                                        result = await session.call_tool(block.name, block.input)
                                        result_text = "\n".join(
                                            c.text for c in result.content
                                            if hasattr(c, "text")
                                        ) if result.content else "{}"
                                    except Exception as exc:
                                        result_text = json.dumps({"error": str(exc)})

                                    if _LANGFUSE_ENABLED and _langfuse:
                                        try:
                                            _langfuse.update_current_span(
                                                output=result_text[:500]
                                            )
                                        except Exception:
                                            pass

                                logger.info(f"[turn {turn}] {block.name} → {result_text[:200]}")
                                yield {"type": "tool_result", "name": block.name, "content": result_text}

                                tool_results.append({
                                    "type":        "tool_result",
                                    "tool_use_id": block.id,
                                    "content":     result_text,
                                })

                            conversation.append({"role": "user", "content": tool_results})
                        else:
                            if _LANGFUSE_ENABLED and _langfuse:
                                try:
                                    _langfuse.flush()
                                except Exception:
                                    pass
                            yield {"type": "done", "message": final_text}
                            break

        except Exception as exc:
            logger.exception("Agent error")
            if _LANGFUSE_ENABLED and _langfuse:
                try:
                    _langfuse.update_current_span(
                        output=f"ERROR: {exc}", level="ERROR"
                    )
                    _langfuse.flush()
                except Exception:
                    pass
            detail = (
                " | ".join(str(e) for e in exc.exceptions)
                if hasattr(exc, "exceptions") and exc.exceptions
                else str(exc)
            )
            yield {"type": "error", "message": detail}
