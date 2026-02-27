(() => {
  const API_BASE = "http://localhost:8000";

  // State
  let conversationHistory = [];
  let pendingJobData = null;
  let isOpen = false;

  // ---- Inject Widget HTML ----
  function createWidget() {
    // Floating Action Button
    const fab = document.createElement("button");
    fab.id = "ar-widget-fab";
    fab.innerHTML = "🚀";
    fab.addEventListener("click", toggleChat);
    document.body.appendChild(fab);

    // Chat Container
    const chat = document.createElement("div");
    chat.id = "ar-widget-chat";
    chat.innerHTML = `
      <!-- HOME SCREEN -->
      <div class="ar-screen ar-screen-home" id="ar-screen-home">
        <div class="ar-header">
          <div class="ar-header-left">
            <div class="ar-logo">🚀</div>
            <div>
              <div class="ar-title">Anti-Recruiter</div>
              <div class="ar-subtitle">AI Job Poster</div>
            </div>
          </div>
          <div class="ar-header-right">
            <a href="http://localhost:3000" target="_blank" class="ar-dashboard-btn" title="Open Dashboard">📊 Dashboard</a>
            <div class="ar-status-dot" id="ar-status-dot" title="Backend connected"></div>
          </div>
        </div>
        <div class="ar-home-body">
          <div class="ar-home-greeting">
            <span class="ar-home-wave">👋</span>
            <h2 class="ar-home-title">Welcome!</h2>
            <p class="ar-home-desc">What would you like to do today?</p>
          </div>
          <div class="ar-home-options">
            <button class="ar-option-card" id="ar-opt-post">
              <span class="ar-option-icon">📝</span>
              <span class="ar-option-label">Post a Job</span>
              <span class="ar-option-hint">Describe a role and let AI handle the rest</span>
            </button>
            <button class="ar-option-card" id="ar-opt-other">
              <span class="ar-option-icon">💬</span>
              <span class="ar-option-label">Others</span>
              <span class="ar-option-hint">Ask questions or get help</span>
            </button>
          </div>
        </div>
      </div>

      <!-- CHAT SCREEN -->
      <div class="ar-screen ar-screen-chat" id="ar-screen-chat" style="display:none;">
        <div class="ar-header">
          <div class="ar-header-left">
            <button class="ar-back-btn" id="ar-back-btn" title="Back to home">←</button>
            <div class="ar-logo">🚀</div>
            <div>
              <div class="ar-title">Anti-Recruiter</div>
              <div class="ar-subtitle" id="ar-chat-subtitle">AI Job Poster</div>
            </div>
          </div>
          <div class="ar-header-right">
            <a href="http://localhost:3000" target="_blank" class="ar-dashboard-btn" title="Open Dashboard">📊 Dashboard</a>
            <div class="ar-status-dot" id="ar-status-dot-chat" title="Backend connected"></div>
          </div>
        </div>
        <div class="ar-messages" id="ar-messages">
          <div class="ar-msg ar-msg-bot">
            <div class="ar-avatar">🤖</div>
            <div class="ar-bubble">
              <p>Hey! I can help you post a job. Just describe the role you want to post.</p>
              <p class="ar-hint">Try: <em>"Post a Senior React Dev in Bangalore, 5-8 yrs, 25-35 LPA"</em></p>
            </div>
          </div>
        </div>
        <div class="ar-input-area">
          <div class="ar-input-wrapper">
            <textarea
              class="ar-input"
              id="ar-input"
              placeholder="Describe the job you want to post..."
              rows="1"
            ></textarea>
            <button class="ar-send-btn" id="ar-send-btn" title="Send">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(chat);

    // Wire up chat events
    const input = document.getElementById("ar-input");
    const sendBtn = document.getElementById("ar-send-btn");

    sendBtn.addEventListener("click", handleSend);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    });
    input.addEventListener("input", () => {
      input.style.height = "auto";
      input.style.height = Math.min(input.scrollHeight, 72) + "px";
    });

    // Wire up home screen events
    document.getElementById("ar-opt-post").addEventListener("click", () => navigateToChat("Post a Job"));
    document.getElementById("ar-opt-other").addEventListener("click", () => navigateToChat("Others"));
    document.getElementById("ar-back-btn").addEventListener("click", navigateToHome);

    checkBackendStatus();
  }

  // ---- Screen Navigation ----
  function navigateToChat(label) {
    document.getElementById("ar-screen-home").style.display = "none";
    document.getElementById("ar-screen-chat").style.display = "flex";
    document.getElementById("ar-chat-subtitle").textContent = label;
    setTimeout(() => document.getElementById("ar-input").focus(), 100);
  }

  function navigateToHome() {
    document.getElementById("ar-screen-chat").style.display = "none";
    document.getElementById("ar-screen-home").style.display = "flex";
    // Reset chat state
    conversationHistory = [];
    pendingJobData = null;
  }

  // ---- Toggle Chat ----
  function toggleChat() {
    isOpen = !isOpen;
    const chat = document.getElementById("ar-widget-chat");
    const fab = document.getElementById("ar-widget-fab");

    if (isOpen) {
      chat.classList.add("ar-visible");
      fab.classList.add("ar-open");
      fab.innerHTML = "✕";
      setTimeout(() => document.getElementById("ar-input").focus(), 100);
    } else {
      chat.classList.remove("ar-visible");
      fab.classList.remove("ar-open");
      fab.innerHTML = "🚀";
    }
  }

  // ---- Backend Status ----
  async function checkBackendStatus() {
    try {
      const res = await fetch(`${API_BASE}/`);
      if (res.ok) {
        document.getElementById("ar-status-dot").classList.remove("ar-disconnected");
      } else { throw new Error(); }
    } catch {
      document.getElementById("ar-status-dot").classList.add("ar-disconnected");
    }
  }

  // ---- Send Message ----
  async function handleSend() {
    const input = document.getElementById("ar-input");
    const text = input.value.trim();
    if (!text) return;

    addMessage(text, "user");
    input.value = "";
    input.style.height = "auto";

    conversationHistory.push({ role: "user", text });

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
        pendingJobData = result.data;
        const cardText = "Here's what I extracted. Want me to post this?";
        conversationHistory.push({ role: "model", text: cardText });
        addBotMessageWithCard(cardText, result.data);
      } else {
        conversationHistory.push({ role: "model", text: result.text });
        addMessage(result.text, "bot");
      }
    } catch (error) {
      removeTyping(typingEl);
      addStatusMessage(`Error: ${error.message}`, "error");
    }

    scrollToBottom();
  }

  // ---- Post Job ----
  async function postJob(jobData) {
    const btns = document.querySelectorAll("#ar-widget-chat .ar-job-actions .ar-btn");
    btns.forEach((b) => (b.disabled = true));

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
      addStatusMessage(`✅ Job posted! Zoho ID: ${result.id}`, "success");

      conversationHistory = [];
      pendingJobData = null;

      setTimeout(() => {
        addMessage("Want to post another job? Just describe it!", "bot");
        conversationHistory.push({ role: "model", text: "Want to post another job? Just describe it!" });
      }, 1000);
    } catch (error) {
      removeTyping(typingEl);
      addStatusMessage(`❌ ${error.message}`, "error");
      btns.forEach((b) => (b.disabled = false));
    }

    scrollToBottom();
  }

  // ---- UI Helpers ----
  function getMessages() {
    return document.getElementById("ar-messages");
  }

  function addMessage(text, sender) {
    const msg = document.createElement("div");
    msg.className = `ar-msg ${sender === "user" ? "ar-msg-user" : "ar-msg-bot"}`;

    msg.innerHTML = `
      <div class="ar-avatar">${sender === "user" ? "👤" : "🤖"}</div>
      <div class="ar-bubble"><p>${escapeHtml(text)}</p></div>
    `;

    getMessages().appendChild(msg);
    scrollToBottom();
  }

  function addBotMessageWithCard(text, jobData) {
    const msg = document.createElement("div");
    msg.className = "ar-msg ar-msg-bot";

    const fields = [
      ["Title", jobData.title],
      ["Location", jobData.location],
      ["Industry", jobData.industry],
      ["Type", jobData.job_type],
      ["Salary", jobData.salary_range],
      ["Experience", jobData.experience_required],
      ["Target Date", jobData.target_date],
    ]
      .filter(([, v]) => v)
      .map(([l, v]) => `<div class="ar-job-field"><span class="ar-field-label">${l}</span><span class="ar-field-value">${escapeHtml(v)}</span></div>`)
      .join("");

    msg.innerHTML = `
      <div class="ar-avatar">🤖</div>
      <div class="ar-bubble">
        <p>${escapeHtml(text)}</p>
        <div class="ar-job-card">
          <div class="ar-job-card-header">📋 Job Preview</div>
          ${fields}
          ${jobData.description ? `<div class="ar-desc-preview">${escapeHtml(jobData.description)}</div>` : ""}
          <div class="ar-job-actions">
            <button class="ar-btn ar-btn-secondary" id="ar-edit-btn">✏️ Edit</button>
            <button class="ar-btn ar-btn-primary" id="ar-confirm-btn">🚀 Post Job</button>
          </div>
        </div>
      </div>
    `;

    getMessages().appendChild(msg);

    msg.querySelector("#ar-confirm-btn").addEventListener("click", () => postJob(pendingJobData));
    msg.querySelector("#ar-edit-btn").addEventListener("click", () => {
      addMessage("What would you like to change?", "bot");
      conversationHistory.push({ role: "model", text: "What would you like to change?" });
      pendingJobData = null;
    });

    scrollToBottom();
  }

  function showTyping() {
    const el = document.createElement("div");
    el.className = "ar-typing";
    el.innerHTML = `
      <div class="ar-avatar">🤖</div>
      <div class="ar-typing-dots"><span></span><span></span><span></span></div>
    `;
    getMessages().appendChild(el);
    scrollToBottom();
    return el;
  }

  function removeTyping(el) {
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }

  function addStatusMessage(text, type) {
    const el = document.createElement("div");
    el.className = `ar-status-msg ar-status-${type}`;
    el.textContent = text;
    getMessages().appendChild(el);
    scrollToBottom();
  }

  function scrollToBottom() {
    requestAnimationFrame(() => {
      const m = getMessages();
      if (m) m.scrollTop = m.scrollHeight;
    });
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  // ---- Initialize ----
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", createWidget);
  } else {
    createWidget();
  }
})();
