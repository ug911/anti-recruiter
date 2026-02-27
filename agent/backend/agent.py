"""
Agent core — Claude + MCP agentic loop.

This module:
  1. Spawns the Zoho MCP server as a child process.
  2. Discovers its tools and converts them to Anthropic tool format.
  3. Runs a multi-turn agentic loop until Claude stops calling tools.
  4. Yields structured events (text delta, tool call, tool result, done) for SSE.
"""

import os
import sys
import json
import asyncio
import logging
from pathlib import Path
from typing import AsyncGenerator, Any

import anthropic
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

logger = logging.getLogger("agent")

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")
MCP_SERVER_SCRIPT = os.getenv(
    "MCP_SERVER_PATH",
    str(Path(__file__).parent.parent / "mcp_server" / "zoho_mcp_server.py"),
)
MODEL = os.getenv("CLAUDE_MODEL", "claude-haiku-4-5-20251001")
MAX_TOKENS = int(os.getenv("MAX_TOKENS", "4096"))

SYSTEM_PROMPT = """You are a helpful recruiting assistant with access to Zoho Recruit.
You can list job openings, view candidate details, create new jobs, archive jobs,
and update candidate pipeline statuses. Always be concise and factual.
When you need information from Zoho, use the available tools — don't guess.
Format your final answers clearly using markdown."""


# ---------------------------------------------------------------------------
# Tool conversion helpers
# ---------------------------------------------------------------------------

def _mcp_tool_to_anthropic(tool) -> dict:
    """Convert an MCP Tool object to Anthropic's tool definition format."""
    return {
        "name": tool.name,
        "description": tool.description or "",
        "input_schema": tool.inputSchema or {"type": "object", "properties": {}},
    }


# ---------------------------------------------------------------------------
# Agentic loop
# ---------------------------------------------------------------------------

async def run_agent(
    messages: list[dict],
    session_id: str = "default",
) -> AsyncGenerator[dict, None]:
    """
    Run the full Claude + MCP agentic loop.

    Yields event dicts:
      {"type": "text",        "content": "..."}
      {"type": "tool_call",   "name": "...", "input": {...}}
      {"type": "tool_result", "name": "...", "content": "..."}
      {"type": "done",        "message": "..."}
      {"type": "error",       "message": "..."}
    """
    client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

    server_params = StdioServerParameters(
        command=sys.executable,
        args=[MCP_SERVER_SCRIPT],
        env={**os.environ},
    )

    try:
        async with stdio_client(server_params) as (read_stream, write_stream):
            async with ClientSession(read_stream, write_stream) as session:
                await session.initialize()

                # Discover available MCP tools
                tools_response = await session.list_tools()
                anthropic_tools = [_mcp_tool_to_anthropic(t) for t in tools_response.tools]
                logger.info(f"MCP tools loaded: {[t['name'] for t in anthropic_tools]}")

                # Build conversation (clone to avoid mutating caller's list)
                conversation = list(messages)

                # Agentic loop
                while True:
                    response = client.messages.create(
                        model=MODEL,
                        max_tokens=MAX_TOKENS,
                        system=SYSTEM_PROMPT,
                        tools=anthropic_tools,
                        messages=conversation,
                    )
                    logger.debug(f"Claude stop_reason={response.stop_reason}")

                    # Collect assistant content blocks
                    assistant_content = []
                    full_text = ""

                    for block in response.content:
                        if block.type == "text":
                            full_text += block.text
                            assistant_content.append({"type": "text", "text": block.text})
                            yield {"type": "text", "content": block.text}

                        elif block.type == "tool_use":
                            assistant_content.append({
                                "type": "tool_use",
                                "id":    block.id,
                                "name":  block.name,
                                "input": block.input,
                            })
                            yield {"type": "tool_call", "name": block.name, "input": block.input}

                    # Append assistant turn
                    conversation.append({"role": "assistant", "content": assistant_content})

                    # If Claude is done, break
                    if response.stop_reason == "end_turn":
                        yield {"type": "done", "message": full_text}
                        break

                    # Execute tool calls and build tool_result blocks
                    if response.stop_reason == "tool_use":
                        tool_results = []
                        for block in response.content:
                            if block.type != "tool_use":
                                continue
                            try:
                                result = await session.call_tool(block.name, block.input)
                                # MCP returns a list of content objects; extract text
                                if result.content:
                                    result_text = "\n".join(
                                        c.text for c in result.content if hasattr(c, "text")
                                    )
                                else:
                                    result_text = "{}"
                            except Exception as exc:
                                result_text = json.dumps({"error": str(exc)})

                            logger.info(f"Tool {block.name} → {result_text[:200]}")
                            yield {"type": "tool_result", "name": block.name, "content": result_text}

                            tool_results.append({
                                "type":        "tool_result",
                                "tool_use_id": block.id,
                                "content":     result_text,
                            })

                        conversation.append({"role": "user", "content": tool_results})
                    else:
                        # Unexpected stop reason — bail
                        yield {"type": "done", "message": full_text}
                        break

    except Exception as exc:
        logger.exception("Agent error")
        # Unwrap ExceptionGroup (Python 3.11+ / asyncio TaskGroup) to surface root cause
        if hasattr(exc, "exceptions") and exc.exceptions:
            detail = " | ".join(str(e) for e in exc.exceptions)
        else:
            detail = str(exc)
        yield {"type": "error", "message": detail}
