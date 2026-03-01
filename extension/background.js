const API_BASE = "http://localhost:8000";

// Listen for messages from popup or content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === "CHAT_REQUEST") {
        handleChatRequest(request.payload, sender.tab ? sender.tab.id : null);
        // sendResponse isn't used for streaming, we use port or multiple messages
        // but for now, we'll use a specific message-based relay.
        return true;
    }
});

async function handleChatRequest(payload, tabId) {
    try {
        const response = await fetch(`${API_BASE}/chat/stream`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });

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
