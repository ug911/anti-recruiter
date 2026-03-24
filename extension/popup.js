const API_BASE = "http://localhost:8000";

// ---- Setup Message Listener Early ----
// This must be set up before anything else so iframe messages are caught
window.addEventListener("message", (event) => {
  console.log("[Popup] Received message from iframe:", event.data);

  if (event.data.type === "AUTH_TOKEN") {
    console.log("[Popup] Received auth token");
    const token = event.data.token;
    
    setAuthToken(token).then(async () => {
      console.log("[Popup] Token saved, switching to chat screen");
      await updateUserMenu();
      showChatScreen();
    });
  } else if (event.data.type === "AUTH_ERROR") {
    console.error("[Popup] Auth error:", event.data.error);
    alert("Login failed: " + event.data.error);
    showAuthScreen();
  }
});

// ---- Auth Functions ----

/**
 * Check if user is authenticated
 */
async function checkAuth() {
  return new Promise((resolve) => {
    console.log("[Popup] Checking auth status...");
    chrome.runtime.sendMessage({ type: "CHECK_AUTH" }, (response) => {
      console.log("[Popup] Received auth response:", response);
      if (chrome.runtime.lastError) {
        console.error("[Popup] Error checking auth:", chrome.runtime.lastError);
        resolve({ authenticated: false });
      } else {
        resolve(response);
      }
    });
  });
}

/**
 * Get current user info
 */
async function getCurrentUser() {
  return new Promise((resolve) => {
    console.log("[Popup] Getting current user...");
    chrome.runtime.sendMessage({ type: "GET_USER" }, (response) => {
      console.log("[Popup] Received user response:", response);
      if (chrome.runtime.lastError) {
        console.error("[Popup] Error getting user:", chrome.runtime.lastError);
        resolve(null);
      } else {
        resolve(response.user);
      }
    });
  });
}

/**
 * Validate token against server
 */
async function validateToken(token) {
  try {
    console.log("[Popup] Validating token against server...");
    const response = await fetch(`${API_BASE}/auth/validate`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (response.status === 401) {
      console.log("[Popup] Token validation failed: 401 Unauthorized");
      return false;
    }

    if (response.ok) {
      console.log("[Popup] Token validation successful");
      return true;
    }

    console.log("[Popup] Token validation returned status:", response.status);
    return false;
  } catch (error) {
    console.error("[Popup] Error validating token:", error);
    // If fetch fails, assume token might still be valid (network error)
    // Better to show login than stay stuck
    return false;
  }
}

/**
 * Set auth token
 */
async function setAuthToken(token) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: "SET_AUTH_TOKEN", token }, (response) => {
      console.log("[Popup] Token set response:", response);
      resolve(response);
    });
  });
}

/**
 * Start login flow with iframe
 */
function startLogin() {
  console.log("[Popup] Starting login with iframe");
  const loginScreen = document.getElementById("loginScreen");
  const loginIframe = document.getElementById("loginIframe");
  
  if (!loginScreen || !loginIframe) {
    console.error("[Popup] Login screen or iframe not found");
    return;
  }

  // Show login screen
  chatArea.classList.add("hidden");
  const inputArea = document.querySelector(".input-area");
  inputArea.classList.add("hidden");
  const userMenu = document.getElementById("userMenu");
  if (userMenu) userMenu.classList.add("hidden");
  
  loginScreen.classList.remove("hidden");

  // Build callback URL pointing to extension callback page
  const callbackUrl = chrome.runtime.getURL('callback.html');
  const redirectUri = encodeURIComponent(callbackUrl);
  const loginUrl = `http://localhost:3001/api/auth/exchange-token?redirect_uri=${redirectUri}`;

  console.log("[Popup] Loading login iframe");
  console.log("[Popup] Callback URL:", callbackUrl);
  console.log("[Popup] Login URL:", loginUrl);
  
  // Set iframe src to trigger navigation
  loginIframe.src = loginUrl;
  
  // Listen for iframe load
  loginIframe.onload = () => {
    console.log("[Popup] Iframe loaded");
  };
  
  loginIframe.onerror = () => {
    console.error("[Popup] Iframe load error");
  };
}

/**
 * Show auth screen (login iframe)
 */
function showAuthScreen() {
  console.log("[Popup] Showing auth screen");
  chatArea.classList.add("hidden");
  const inputArea = document.querySelector(".input-area");
  inputArea.classList.add("hidden");
  const userMenu = document.getElementById("userMenu");
  if (userMenu) userMenu.classList.add("hidden");
  
  const loginScreen = document.getElementById("loginScreen");
  if (loginScreen) {
    loginScreen.classList.remove("hidden");
    // Start login immediately
    startLogin();
  }
}

/**
 * Show chat interface
 */
function showChatScreen() {
  const loginScreen = document.getElementById("loginScreen");
  if (loginScreen) loginScreen.classList.add("hidden");
  chatArea.classList.remove("hidden");
  document.querySelector(".input-area").classList.remove("hidden");
  document.getElementById("userMenu").classList.remove("hidden");
}

/**
 * Update user menu
 */
async function updateUserMenu() {
  const user = await getCurrentUser();
  const userMenu = document.getElementById("userMenu");
  const loginBtn = document.getElementById("loginBtn");
  const userNameEl = document.getElementById("userName");
  const userEmailEl = document.getElementById("userEmail");

  if (user) {
    userMenu.classList.remove("hidden");
    loginBtn.classList.add("hidden");
    
    // Truncate name for display if it's very long
    const displayName = user.name || user.email || "User";
    userNameEl.textContent = displayName;
    userNameEl.title = displayName; // Show full name on hover
    
    userEmailEl.textContent = user.email;
    userEmailEl.title = user.email;
  } else {
    userMenu.classList.add("hidden");
    loginBtn.classList.remove("hidden");
  }
}

function setupChatListeners() {
  // Chat listeners are already defined at the top level
  console.log("[Popup] Chat listeners initialized");
}

function setupUserMenuListeners() {
  const userBtn = document.getElementById("userBtn");
  const userDropdown = document.getElementById("userDropdown");

  if (userBtn && userDropdown) {
    userBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      userDropdown.classList.toggle("hidden");
    });

    // Close dropdown on click outside
    document.addEventListener("click", (e) => {
      if (!userDropdown.contains(e.target) && !userBtn.contains(e.target)) {
        userDropdown.classList.add("hidden");
      }
    });
  }
}

// Configure marked.js for safe and robust rendering
if (typeof marked !== 'undefined') {
  marked.setOptions({
    breaks: true,
    gfm: true,
    headerIds: false,
    mangle: false
  });
}

function formatText(text) {
  if (typeof marked !== 'undefined') {
    return marked.parse(text);
  }
  // Fallback to basic escaping if marked is somehow missing
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>");
}

// State
let conversationHistory = []; // {role, text} for API
let currentUser = null;
let pendingJobData = null;

// DOM Elements
const chatArea = document.getElementById("chatArea");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const statusDot = document.getElementById("statusDot");

// ---- Initialization ----
document.addEventListener("DOMContentLoaded", async () => {
  console.log("[Popup] DOMContentLoaded - initializing");
  
  // Check auth first
  const authStatus = await checkAuth();
  console.log("[Popup] Auth status:", authStatus);
  
  if (!authStatus.authenticated) {
    console.log("[Popup] Not authenticated, showing auth screen");
    showAuthScreen();
    return;
  }

  // Validate token against server
  const token = await new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: "GET_TOKEN" }, (response) => {
      resolve(response.token);
    });
  });

  if (token) {
    const isValid = await validateToken(token);
    if (!isValid) {
      console.log("[Popup] Token validation failed, clearing token and showing login");
      await new Promise((resolve) => {
        chrome.runtime.sendMessage({ type: "CLEAR_TOKEN" }, (response) => {
          resolve(response);
        });
      });
      showAuthScreen();
      return;
    }
  }

  console.log("[Popup] Authenticated, showing chat screen");
  showChatScreen();
  currentUser = await getCurrentUser();
  await updateUserMenu();
  
  // Get session ID and load history
  const stored = await chrome.storage.local.get("session_id");
  let session_id = stored.session_id;
  console.log("[Popup] Using session_id:", session_id);
  if (!session_id) {
    session_id = Math.random().toString(36).substring(7);
    await chrome.storage.local.set({ session_id });
  }
  
  await loadChatHistory(session_id, currentUser ? currentUser.email : null);
  
  checkBackendStatus();
  messageInput.focus();

  // Setup chat event listeners
  setupChatListeners();
  // Setup user menu event listeners
  setupUserMenuListeners();
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

  const userEmail = currentUser ? currentUser.email : null;

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
      user_email: userEmail,
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
  if (message.type === "AUTH_SUCCESS") {
    // User successfully logged in, reload popup
    location.reload();
    return;
  }

  if (message.type === "AUTH_LOGOUT") {
    // User logged out, reload popup
    location.reload();
    return;
  }

  if (message.type === "AUTH_REQUIRED") {
    // Token became invalid, show login screen
    console.log("[Popup] Auth required - token is invalid");
    clearCurrentMessage();
    addStatusMessage("Session expired. Please login again.", "error");
    setTimeout(() => {
      showAuthScreen();
    }, 1500);
    return;
  }
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
      currentBotResponseEl.closest(".message").classList.remove("is-typing");
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
  wrapper.className = "message bot-message is-typing";

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

async function loadChatHistory(session_id, user_email) {
  try {
    console.log("[Popup] Loading chat history...");
    let url = `${API_BASE}/chat/history?session_id=${session_id}`;
    if (user_email && user_email !== 'null' && user_email !== 'undefined') {
      url += `&user_email=${encodeURIComponent(user_email)}`;
    }
    
    const response = await fetch(url);
    if (!response.ok) throw new Error("Failed to fetch history");
    
    const history = await response.json();
    console.log("[Popup] Received history:", history.length, "messages");
    
    // Clear initial greeting if history exists
    if (history.length > 0) {
      chatArea.innerHTML = "";
      conversationHistory = history;
      
      // Render historical messages
      history.forEach(msg => {
        addMessage(msg.content, msg.role);
      });
      
      scrollToBottom();
    }
  } catch (error) {
    console.error("[Popup] Error loading chat history:", error);
  }
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
