const API_BASE = "http://localhost:8000";

// Lightweight markdown renderer — no external library needed
function formatText(text) {
  // Compress 3+ newlines into 2, and trim
  let s = text.trim().replace(/\n{3,}/g, "\n\n");

  // Escape HTML first
  s = s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Bold / Italic
  s = s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/\*(.+?)\*/g, "<em>$1</em>");

  // Headers: ### → <h4>, ## → <h3>
  s = s.replace(/^### (.+)$/gm, "<h4>$1</h4>");
  s = s.replace(/^## (.+)$/gm, "<h3>$1</h3>");

  // Numbered / Bullet list items
  s = s.replace(/^(\d+)\. (.+)$/gm, "<li class='num-item'><span class='num'>$1.</span> $2</li>");
  s = s.replace(/^[-*] (.+)$/gm, "<li>$1</li>");

  // Wrap list items in <ul>
  s = s.replace(/(<li[^>]*>.*<\/li>\n?)+/g, (match) => `<ul>${match}</ul>`);

  // Split into paragraphs ONLY for lines that aren't already block elements
  const lines = s.split("\n");
  let result = "";
  let currentPara = "";

  lines.forEach(line => {
    const isBlock = /^(<h|<ul|<li)/.test(line);
    if (isBlock) {
      if (currentPara) {
        result += `<p>${currentPara}</p>`;
        currentPara = "";
      }
      result += line;
    } else {
      currentPara += (currentPara ? "<br>" : "") + line;
    }
  });
  if (currentPara) result += `<p>${currentPara}</p>`;

  // Final cleanup of any empty tags or leading breaks
  return result.replace(/<p><\/p>/g, "").trim();
}

// State
let conversationHistory = []; // {role, text} for API
let pendingJobData = null;

// DOM Elements
const chatArea = document.getElementById("chatArea");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const statusDot = document.getElementById("statusDot");

// ---- Initialization ----
document.addEventListener("DOMContentLoaded", () => {
  checkBackendStatus();
  messageInput.focus();
});

sendBtn.addEventListener("click", handleSend);
messageInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    handleSend();
  }
});

// Auto-resize textarea
messageInput.addEventListener("input", () => {
  messageInput.style.height = "auto";
  messageInput.style.height = Math.min(messageInput.scrollHeight, 80) + "px";
});

// ---- Core Functions ----

async function checkBackendStatus() {
  try {
    const res = await fetch(`${API_BASE}/`);
    if (res.ok) {
      statusDot.classList.remove("disconnected");
      statusDot.title = "Backend connected";
    } else {
      throw new Error();
    }
  } catch {
    statusDot.classList.add("disconnected");
    statusDot.title = "Backend not reachable";
  }
}

async function handleSend() {
  const text = messageInput.value.trim();
  if (!text) return;

  // Get or create session ID (safely, in case storage permission isn't ready)
  let session_id;
  try {
    const stored = await chrome.storage.local.get("session_id");
    session_id = stored.session_id;
    if (!session_id) {
      session_id = Math.random().toString(36).substring(7);
      await chrome.storage.local.set({ session_id });
    }
  } catch (e) {
    session_id = session_id || Math.random().toString(36).substring(7);
  }

  // Add user message to UI
  addMessage(text, "user");
  messageInput.value = "";
  messageInput.style.height = "auto";

  // Add to conversation history
  conversationHistory.push({ role: "user", content: text });

  // Show typing indicator
  currentTypingEl = showTyping();

  // Get Page Context — try content script first, fall back to executeScript
  let pageContext = "";
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.url && tab.url.startsWith("http")) {
      // Try content script message first
      try {
        const response = await chrome.tabs.sendMessage(tab.id, { type: "GET_PAGE_CONTEXT" });
        if (response && response.text) {
          pageContext = response.text;
          console.log(`[Popup] Got page context via content script: ${pageContext.length} chars`);
        }
      } catch (msgErr) {
        console.log("[Popup] Content script failed, trying executeScript fallback:", msgErr.message);
      }

      // Fallback: inject script directly to grab page text
      if (!pageContext && chrome.scripting) {
        try {
          const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => document.body.innerText.replace(/\s+/g, " ").trim().substring(0, 15000),
          });
          if (results && results[0] && results[0].result) {
            pageContext = results[0].result;
            console.log(`[Popup] Got page context via executeScript: ${pageContext.length} chars`);
          }
        } catch (execErr) {
          console.warn("[Popup] executeScript fallback also failed:", execErr.message);
        }
      }
    }
  } catch (err) {
    console.warn("[Popup] Could not query tab for context:", err);
  }

  // Send request to background script
  chrome.runtime.sendMessage({
    type: "CHAT_REQUEST",
    payload: {
      messages: conversationHistory,
      session_id: session_id,
      page_context: pageContext
    }
  });
}

// Global state for bot response
let currentBotResponseEl = null;
let currentBotText = "";
let currentTypingEl = null;

// Listen for background relay
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "CHAT_CHUNK") {
    const chunk = message.data;

    if (chunk.type === "tool_call") {
      // Agent is calling a tool — convert the "thinking" bubble to a subtle status
      // and reset ready for the real response after the tool completes
      if (currentBotResponseEl && currentBotText) {
        currentBotResponseEl.className = "thinking-text";
        currentBotResponseEl.innerHTML = `<em>🔍 ${currentBotText.trim()}</em>`;
      }
      currentBotResponseEl = null;
      currentBotText = "";
      return;
    }

    // Only render text chunks
    if (chunk.type !== "text") return;

    removeTyping(currentTypingEl);
    currentTypingEl = null;
    if (!currentBotResponseEl) {
      currentBotResponseEl = createEmptyBotMessage();
    }
    if (chunk.content) {
      currentBotText += chunk.content;
      updateBotMessage(currentBotResponseEl, currentBotText);
    }
    if (chunk.job_data) {
      pendingJobData = chunk.job_data;
    }
  } else if (message.type === "CHAT_DONE") {
    removeTyping(currentTypingEl);
    currentTypingEl = null;
    if (pendingJobData) {
      addBotMessageWithCard(currentBotText, pendingJobData);
      // Remove the plain text one we were building
      if (currentBotResponseEl) {
        currentBotResponseEl.closest(".message").remove();
      }
    } else if (currentBotResponseEl) {
      currentBotResponseEl.innerHTML = formatText(currentBotText);
    }
    conversationHistory.push({ role: "assistant", content: currentBotText });
    currentBotResponseEl = null;
    currentBotText = "";
    scrollToBottom();
  } else if (message.type === "CHAT_ERROR") {
    removeTyping(currentTypingEl);
    currentTypingEl = null;
    const errMsg = typeof message.error === 'object' ? JSON.stringify(message.error) : message.error;
    addStatusMessage(`Error: ${errMsg}`, "error");
    currentBotResponseEl = null;
    currentBotText = "";
  }
});

function createEmptyBotMessage() {
  const wrapper = document.createElement("div");
  wrapper.className = "message bot-message";

  const avatar = document.createElement("div");
  avatar.className = "message-avatar";
  const avatarImg = document.createElement("img");
  avatarImg.src = "logo.png";
  avatarImg.alt = "T";
  avatarImg.width = 18;
  avatar.appendChild(avatarImg);

  const content = document.createElement("div");
  content.className = "message-content";
  const p = document.createElement("p");
  content.appendChild(p);

  wrapper.appendChild(avatar);
  wrapper.appendChild(content);
  chatArea.appendChild(wrapper);
  return p;
}

function updateBotMessage(el, text) {
  el.innerHTML = formatText(text);
}

// ---- UI Helpers ----

function addMessage(text, sender) {
  const wrapper = document.createElement("div");
  wrapper.className = `message ${sender === "user" ? "user-message" : "bot-message"}`;

  const avatar = document.createElement("div");
  avatar.className = "message-avatar";
  if (sender === "user") {
    avatar.textContent = "👤";
  } else {
    const img = document.createElement("img");
    img.src = "logo.png";
    img.alt = "T";
    img.width = 18;
    avatar.appendChild(img);
  }

  const content = document.createElement("div");
  content.className = "message-content";
  if (sender === "user") {
    const p = document.createElement("p");
    p.style.whiteSpace = "pre-wrap";
    p.textContent = text;
    content.appendChild(p);
  } else {
    content.innerHTML = formatText(text);
  }

  wrapper.appendChild(avatar);
  wrapper.appendChild(content);
  chatArea.appendChild(wrapper);
  scrollToBottom();
}

function addBotMessageWithCard(text, jobData) {
  const wrapper = document.createElement("div");
  wrapper.className = "message bot-message";

  const avatar = document.createElement("div");
  avatar.className = "message-avatar";
  const cardAvImg = document.createElement("img");
  cardAvImg.src = "logo.png";
  cardAvImg.alt = "T";
  cardAvImg.width = 18;
  avatar.appendChild(cardAvImg);

  const content = document.createElement("div");
  content.className = "message-content";

  // Message text
  const msgP = document.createElement("p");
  msgP.textContent = text;
  content.appendChild(msgP);

  // Job card
  const card = document.createElement("div");
  card.className = "job-card";
  card.innerHTML = `
    <div class="job-card-header">📋 Job Preview</div>
    ${renderField("Title", jobData.title)}
    ${renderField("Location", jobData.location)}
    ${renderField("Industry", jobData.industry)}
    ${renderField("Type", jobData.job_type)}
    ${renderField("Salary", jobData.salary_range)}
    ${renderField("Experience", jobData.experience_required)}
    ${renderField("Target Date", jobData.target_date)}
    ${jobData.description ? `<div class="job-description-preview">${escapeHtml(jobData.description)}</div>` : ""}
    <div class="job-actions">
      <button class="btn btn-secondary" id="editBtn">✏️ Edit</button>
      <button class="btn btn-primary" id="confirmBtn">🚀 Post Job</button>
    </div>
  `;

  content.appendChild(card);
  wrapper.appendChild(avatar);
  wrapper.appendChild(content);
  chatArea.appendChild(wrapper);

  // Button handlers
  card.querySelector("#confirmBtn").addEventListener("click", () => {
    postJob(pendingJobData);
  });

  card.querySelector("#editBtn").addEventListener("click", () => {
    addMessage(
      "What would you like to change? Just tell me (e.g. 'change salary to 30-40 LPA')",
      "bot"
    );
    conversationHistory.push({
      role: "assistant",
      content: "What would you like to change?",
    });
    pendingJobData = null;
  });

  scrollToBottom();
}

function renderField(label, value) {
  if (!value) return "";
  return `
    <div class="job-field">
      <span class="job-field-label">${label}</span>
      <span class="job-field-value">${escapeHtml(value)}</span>
    </div>
  `;
}

function showTyping() {
  const wrapper = document.createElement("div");
  wrapper.className = "typing-indicator";

  const avatarDiv = document.createElement("div");
  avatarDiv.className = "message-avatar";
  const typingImg = document.createElement("img");
  typingImg.src = "logo.png";
  typingImg.alt = "T";
  typingImg.width = 18;
  avatarDiv.appendChild(typingImg);

  const dotsDiv = document.createElement("div");
  dotsDiv.className = "typing-dots";
  for (let i = 0; i < 3; i++) {
    dotsDiv.appendChild(document.createElement("span"));
  }

  wrapper.appendChild(avatarDiv);
  wrapper.appendChild(dotsDiv);
  chatArea.appendChild(wrapper);
  scrollToBottom();
  return wrapper;
}

function removeTyping(el) {
  if (el && el.parentNode) {
    el.parentNode.removeChild(el);
  }
}

function addStatusMessage(text, type) {
  const el = document.createElement("div");
  el.className = `status-message status-${type}`;
  el.textContent = text;
  chatArea.appendChild(el);
  scrollToBottom();
}

function scrollToBottom() {
  requestAnimationFrame(() => {
    chatArea.scrollTop = chatArea.scrollHeight;
  });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
