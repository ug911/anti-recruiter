const API_BASE = "http://localhost:8000";
const HUB_URL = "http://localhost:3001";
const CALLBACK_URL = "http://localhost:3000/auth/callback";

// ── Auth Helpers ──────────────────────────────────────────────────────────

/**
 * Decode JWT payload to extract user information
 * @param {string} token - JWT token
 * @returns {Object|null} - Decoded user object or null if invalid/expired
 */
function decodeJwtPayload(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split('')
                .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
        );
        const payload = JSON.parse(jsonPayload);

        // Check expiration
        if (payload.exp && payload.exp * 1000 < Date.now()) {
            return null;
        }

        return {
            userId: payload.userId,
            email: payload.email,
            name: payload.name,
            companyId: payload.companyId,
            companyName: payload.companyName,
        };
    } catch {
        return null;
    }
}

async function setAuthToken(token) {
    await chrome.storage.local.set({ auth_token: token });
}

async function getAuthToken() {
    const { auth_token } = await chrome.storage.local.get("auth_token");
    return auth_token || null;
}

async function clearAuthToken() {
    await chrome.storage.local.remove("auth_token");
}

/**
 * Get the current user information
 * @returns {Object|null} - User object or null if not authenticated
 */
async function getCurrentUser() {
    const token = await getAuthToken();
    if (!token) return null;
    return decodeJwtPayload(token);
}

// Listen for messages from popup or content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "CHAT_REQUEST") {
        handleChatRequest(request.payload, sender.tab ? sender.tab.id : null);
        // sendResponse isn't used for streaming, we use port or multiple messages
        // but for now, we'll use a specific message-based relay.
        return true;
    }

    if (request.type === "SET_AUTH_TOKEN") {
        console.log("[Background] SET_AUTH_TOKEN received");
        setAuthToken(request.token).then(() => {
            console.log("[Background] Token stored");
            sendResponse({ ok: true });
        });
        return true;
    }

    if (request.type === "GET_TOKEN") {
        getAuthToken().then((token) => {
            sendResponse({ token });
        });
        return true;
    }

    if (request.type === "CLEAR_TOKEN") {
        console.log("[Background] CLEAR_TOKEN received");
        clearAuthToken().then(() => {
            console.log("[Background] Token cleared");
            sendResponse({ ok: true });
        });
        return true;
    }

    if (request.type === "CHECK_AUTH") {
        getCurrentUser().then((user) => {
            sendResponse({ authenticated: !!user, user });
        });
        return true; // async response
    }

    if (request.type === "GET_USER") {
        getCurrentUser().then((user) => {
            sendResponse({ user });
        });
        return true;
    }
});

async function handleChatRequest(payload, tabId) {
    // const token = await getAuthToken();

    // if (!token) {
    //     broadcastMessage({ type: "AUTH_REQUIRED" }, tabId);
    //     return;
    // }
    try {
        const response = await fetch(`${API_BASE}/chat/stream`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

        // if (response.status === 401 || response.status === 403) {
        //     await clearAuthToken();
        //     broadcastMessage({ type: "AUTH_REQUIRED" }, tabId);
        //     return;
        // }

        if (!response.ok) {
            const err = await response.json();
            broadcastMessage({ type: "CHAT_ERROR", error: err.detail || "Request failed" }, tabId);
            return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
            const { done, value } = await reader.read();
            if (done) {
                broadcastMessage({ type: "CHAT_DONE" }, tabId);
                break;
            }

            const chunk = decoder.decode(value);
            const lines = chunk.split("\n");

            for (const line of lines) {
                if (!line.startsWith("data: ")) continue;
                try {
                    const data = JSON.parse(line.substring(6));
                    broadcastMessage({ type: "CHAT_CHUNK", data }, tabId);
                } catch (e) {
                    console.error("Error parsing SSE line:", e);
                }
            }
        }
    } catch (error) {
        console.error("Background fetch error:", error);
        broadcastMessage({ type: "CHAT_ERROR", error: error.message }, tabId);
    }
}

function broadcastMessage(message, tabId) {
    // Send to popup (if open)
    chrome.runtime.sendMessage(message).catch(() => {
        // Popup might be closed, ignore
    });

    // Send to content script (if tabId exists)
    if (tabId) {
        chrome.tabs.sendMessage(tabId, message).catch(() => {
            // Tab might be closed or refreshed, ignore
        });
    }
}
