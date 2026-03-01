(() => {
  const API_BASE = "http://localhost:8000";

  // State
  let conversationHistory = [];
  let pendingJobData = null;
  let isOpen = false;

  // ---- Inject Widget HTML ----
  function createWidget() {
    if (document.getElementById("ar-widget-chat")) return;

    // Launcher Tab (FAB)
    const fab = document.createElement("button");
    fab.id = "ar-widget-fab";
    fab.innerHTML = "🚀"; // Standard emoji launcher
    fab.title = "Talendly Assistant";
    fab.addEventListener("click", toggleChat);
    document.body.appendChild(fab);

    // Chat Sidebar Container
    const chat = document.createElement("div");
    chat.id = "ar-widget-chat";
    chat.innerHTML = `
      <!-- HOME SCREEN -->
      <div class="ar-screen ar-screen-home" id="ar-screen-home">
        <div class="ar-header">
          <div class="ar-header-left">
            <div class="ar-logo">
              <img src="${chrome.runtime.getURL('logo.png')}" alt="T" width="20">
            </div>
            <div>
              <div class="ar-title">Talendly</div>
              <div class="ar-subtitle">AI Assistant</div>
            </div>
          </div>
          <div class="ar-header-right">
            <div class="ar-status-dot" id="ar-status-dot" title="Connected"></div>
          </div>
        </div>
        <div class="ar-home-body">
          <div class="ar-home-greeting">
            <span class="ar-home-wave">👋</span>
            <h2 class="ar-home-title">Wassup!</h2>
            <p class="ar-home-desc">Ready to post a job or manage your candidates?</p>
          </div>
          <div class="ar-home-options">
            <button class="ar-option-card" id="ar-opt-post">
              <span class="ar-option-icon">📝</span>
              <div>
                <span class="ar-option-label">Post a Job</span>
                <span class="ar-option-hint">Automate your job postings</span>
              </div>
            </button>
            <button class="ar-option-card" id="ar-opt-other">
              <span class="ar-option-icon">💬</span>
              <div>
                <span class="ar-option-label">Chat</span>
                <span class="ar-option-hint">Get help with recruitment</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      <!-- CHAT SCREEN -->
      <div class="ar-screen ar-screen-chat" id="ar-screen-chat" style="display:none;">
        <div class="ar-header">
          <div class="ar-header-left">
            <button class="ar-back-btn" id="ar-back-btn">←</button>
            <div>
              <div class="ar-title">Talendly</div>
              <div class="ar-subtitle" id="ar-chat-subtitle">AI Assistant</div>
            </div>
          </div>
          <div class="ar-header-right">
            <div class="ar-status-dot" id="ar-status-dot-chat" title="Connected"></div>
          </div>
        </div>
        <div class="ar-messages" id="ar-messages">
          <div class="ar-msg ar-msg-bot">
            <div class="ar-bubble">
              <p>Hey! How can I help you today?</p>
            </div>
          </div>
        </div>
        <div class="ar-input-area">
          <div class="ar-input-wrapper">
            <textarea
              class="ar-input"
              id="ar-input"
              placeholder="Type your message..."
              rows="1"
            ></textarea>
            <button class="ar-send-btn" id="ar-send-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13M22 2L15 22L11 13L2 9L22 2Z"/></svg>
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
      document.body.classList.add("ar-sidebar-open");
      setTimeout(() => document.getElementById("ar-input").focus(), 300);
    } else {
      chat.classList.remove("ar-visible");
      fab.classList.remove("ar-open");
      fab.innerHTML = "🚀";
      document.body.classList.remove("ar-sidebar-open");
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

    // Get or create session ID
    let { session_id } = await chrome.storage.local.get("session_id");
    if (!session_id) {
      session_id = Math.random().toString(36).substring(7);
      await chrome.storage.local.set({ session_id });
    }

    addMessage(text, "user");
    input.value = "";
    input.style.height = "auto";

    conversationHistory.push({ role: "user", content: text });

    const typingEl = showTyping();
    let botMessageEl = null;
    let botText = "";

    // Get Page Context
    const pageContext = getPageText();

    // Listen for response from background
    const messageListener = (msg) => {
      if (msg.type === "CHAT_CHUNK") {
        removeTyping(typingEl);
        const data = msg.data;

        if (data.content) {
          botText += data.content;
          if (!botMessageEl) {
            botMessageEl = createEmptyBotMessage();
          }
          updateBotMessage(botMessageEl, botText);
        }

        if (data.job_data) {
          pendingJobData = data.job_data;
        }
        scrollToBottom();
      } else if (msg.type === "CHAT_DONE") {
        chrome.runtime.onMessage.removeListener(messageListener);
        if (pendingJobData) {
          addBotMessageWithCard(botText, pendingJobData);
          if (botMessageEl) botMessageEl.closest(".ar-msg").remove();
        } else if (botMessageEl) {
          botMessageEl.innerHTML = marked.parse(botText);
        }
        conversationHistory.push({ role: "assistant", content: botText });
        scrollToBottom();
      } else if (msg.type === "CHAT_ERROR") {
        chrome.runtime.onMessage.removeListener(messageListener);
        removeTyping(typingEl);
        const errMsg = typeof msg.error === 'object' ? JSON.stringify(msg.error) : msg.error;
        addStatusMessage(`Error: ${errMsg}`, "error");
        scrollToBottom();
      }
    };

    chrome.runtime.onMessage.addListener(messageListener);

    // Send request to background
    chrome.runtime.sendMessage({
      type: "CHAT_REQUEST",
      payload: {
        messages: conversationHistory,
        session_id: session_id,
        page_context: pageContext
      }
    });

    scrollToBottom();
  }

  function createEmptyBotMessage() {
    const msg = document.createElement("div");
    msg.className = "ar-msg ar-msg-bot";
    msg.innerHTML = `
      <div class="ar-avatar">🤖</div>
      <div class="ar-bubble"><p></p></div>
    `;
    getMessages().appendChild(msg);
    return msg.querySelector("p");
  }

  function updateBotMessage(el, text) {
    if (typeof marked !== 'undefined') {
      el.innerHTML = marked.parse(text);
    } else {
      el.textContent = text;
      el.style.whiteSpace = "pre-wrap";
    }
  }

  // ---- UI Helpers ----
  function getMessages() {
    return document.getElementById("ar-messages");
  }

  function addMessage(text, sender) {
    const msg = document.createElement("div");
    msg.className = `ar-msg ${sender === "user" ? "ar-msg-user" : "ar-msg-bot"}`;

    msg.innerHTML = `
      <div class="ar-avatar">${sender === "user" ? "👤" : `<img src="${chrome.runtime.getURL('logo.png')}" alt="T" width="18">`}</div>
      <div class="ar-bubble">${sender === "user" ? `<p>${escapeHtml(text)}</p>` : (typeof marked !== 'undefined' ? marked.parse(text) : `<p>${escapeHtml(text)}</p>`)}</div>
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

  function getPageText() {
    // Direct innerText on the body is more reliable for scraping actual visible text.
    try {
      const text = document.body.innerText || "";
      const cleaned = text.replace(/\s+/g, " ").trim().substring(0, 15000);
      console.log(`[Anti-Recruiter] Scraping body. Result length: ${cleaned.length}`);
      return cleaned;
    } catch (e) {
      console.error("[Anti-Recruiter] Scraping failed:", e);
      return "";
    }
  }

  // Listen for messages from popup or agent triggers
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "GET_PAGE_CONTEXT") {
      sendResponse({ text: getPageText() });
    }
    return true;
  });

  // ---- Initialize ----
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", createWidget);
  } else {
    createWidget();
  }
})();
