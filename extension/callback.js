console.log('[Callback] Callback page loaded');

// Helper to find token or error in various places
let token = null;
let error = null;

// Try URL search params
const params = new URLSearchParams(window.location.search);
token = params.get('token');
error = params.get('error');

// Try URL hash (in case hub uses hash redirect)
if (!token && !error && window.location.hash) {
  console.log('[Callback] Trying hash:', window.location.hash);
  const hashParams = new URLSearchParams(window.location.hash.substring(1));
  token = hashParams.get('token');
  error = hashParams.get('error');
}

const statusEl = document.getElementById('status');
const debugEl = document.getElementById('debug');

const debugInfo = {
  url: window.location.href,
  search: window.location.search,
  hash: window.location.hash,
  hasToken: !!token,
  tokenLength: token ? token.length : 0,
  hasError: !!error,
  hasParent: window.parent !== window,
  isInFrame: window.self !== window.top
};

console.log('[Callback] Debug:', debugInfo);

if (debugEl) {
  debugEl.innerHTML = `Token: ${token ? 'Found (' + token.substring(0, 20) + '...)' : 'Not found'}<br>Error: ${error || 'None'}<br>InFrame: ${debugInfo.isInFrame}`;
}

if (token) {
  if (statusEl) statusEl.textContent = 'Saving credentials...';
  console.log('[Callback] Token found, sending to parent');
  
  try {
    // Send via postMessage to parent
    window.parent.postMessage({ 
      type: 'AUTH_TOKEN', 
      token: token,
      timestamp: Date.now()
    }, '*');
    
    console.log('[Callback] postMessage sent to parent');
    
    if (statusEl) {
      setTimeout(() => {
        statusEl.textContent = 'Success! Redirecting...';
      }, 200);
    }
  } catch (err) {
    console.error('[Callback] Error sending message:', err);
    if (statusEl) statusEl.innerHTML = `<span class="error">Error: ${err.message}</span>`;
  }
} else if (error) {
  if (statusEl) statusEl.innerHTML = `<span class="error">Login failed: ${error}</span>`;
  console.log('[Callback] Error received:', error);
  
  try {
    window.parent.postMessage({ 
      type: 'AUTH_ERROR', 
      error: error,
      timestamp: Date.now()
    }, '*');
  } catch (err) {
    console.error('[Callback] Error sending error message:', err);
  }
} else {
  const noTokenMsg = 'Authentication callback received but no token in URL. Check console for details.';
  if (statusEl) statusEl.innerHTML = `<span class="error">${noTokenMsg}</span>`;
  console.warn('[Callback] WARNING: No token or error found');
  console.log('[Callback] Full URL:', window.location.href);
  console.log('[Callback] Search:', window.location.search);
  console.log('[Callback] Hash:', window.location.hash);
}
