const API_BASE = "http://localhost:8000";

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

  // Add user message to UI
  addMessage(text, "user");
  messageInput.value = "";
  messageInput.style.height = "auto";

  // Add to conversation history
  conversationHistory.push({ role: "user", text });

  // Show typing indicator
  const typingEl = showTyping();

  try {
    const response = await fetch(`${API_BASE}/chat/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: conversationHistory }),
    });

    removeTyping(typingEl);

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.detail || "Request failed");
    }

    const result = await response.json();

    if (result.type === "job_data") {
      // Gemini extracted job fields — show confirmation card
      pendingJobData = result.data;
      const cardText = "Here's what I extracted. Want me to post this?";
      conversationHistory.push({ role: "model", text: cardText });
      addBotMessageWithCard(cardText, result.data);
    } else {
      // Gemini needs more info — show follow-up question
      conversationHistory.push({ role: "model", text: result.text });
      addMessage(result.text, "bot");
    }
  } catch (error) {
    removeTyping(typingEl);
    addStatusMessage(`Error: ${error.message}`, "error");
  }

  scrollToBottom();
}

async function postJob(jobData) {
  // Disable confirm buttons
  document.querySelectorAll(".job-actions .btn").forEach((b) => (b.disabled = true));

  const typingEl = showTyping();

  try {
    const response = await fetch(`${API_BASE}/jobs/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(jobData),
    });

    removeTyping(typingEl);

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.detail || "Failed to post job");
    }

    const result = await response.json();
    addStatusMessage(
      `✅ Job posted successfully! Zoho ID: ${result.id}`,
      "success"
    );

    // Reset for next job
    conversationHistory = [];
    pendingJobData = null;

    // Add fresh prompt
    setTimeout(() => {
      addMessage("Want to post another job? Just describe it!", "bot");
      conversationHistory.push({
        role: "model",
        text: "Want to post another job? Just describe it!",
      });
    }, 1000);
  } catch (error) {
    removeTyping(typingEl);
    addStatusMessage(`❌ ${error.message}`, "error");
    // Re-enable buttons
    document.querySelectorAll(".job-actions .btn").forEach((b) => (b.disabled = false));
  }

  scrollToBottom();
}

// ---- UI Helpers ----

function addMessage(text, sender) {
  const wrapper = document.createElement("div");
  wrapper.className = `message ${sender === "user" ? "user-message" : "bot-message"}`;

  const avatar = document.createElement("div");
  avatar.className = "message-avatar";
  avatar.textContent = sender === "user" ? "👤" : "🤖";

  const content = document.createElement("div");
  content.className = "message-content";
  content.innerHTML = `<p>${escapeHtml(text)}</p>`;

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
  avatar.textContent = "🤖";

  const content = document.createElement("div");
  content.className = "message-content";

  // Message text
  content.innerHTML = `<p>${escapeHtml(text)}</p>`;

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
      role: "model",
      text: "What would you like to change?",
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
  wrapper.innerHTML = `
    <div class="message-avatar">🤖</div>
    <div class="typing-dots">
      <span></span><span></span><span></span>
    </div>
  `;
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
