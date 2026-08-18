const SERVER_URL = (window.location.protocol.startsWith('http'))
    ? (window.location.port === '8080' || window.location.port === '' ? '/api/sales' : `${window.location.protocol}//${window.location.hostname}:8080/api/sales`)
    : 'http://localhost:8080/api/sales';

const loginBtn = document.getElementById('login-btn');
const loginAlert = document.getElementById('login-alert');

function showAlert(message) {
    if (!loginAlert) return;
    loginAlert.innerText = message;
    loginAlert.className = 'alert alert-error';
    loginAlert.style.display = 'block';
    loginAlert.style.opacity = '1';
    setTimeout(() => { 
        loginAlert.style.opacity = '0'; 
        setTimeout(() => { loginAlert.style.display = 'none'; }, 300);
    }, 3000);
}

function getCompanyName() {
    return localStorage.getItem('companyName') || 'RCFruits';
}

function updateCompanyBranding() {
    const name = getCompanyName();
    document.title = name + " Login";
    const loginTitle = document.getElementById('login-title');
    if (loginTitle) {
        loginTitle.innerHTML = '🔒 ' + name + ' Security';
    }
}

document.addEventListener('DOMContentLoaded', updateCompanyBranding);

// ============ SESSION HELPERS ============

// Get the appropriate storage based on how session was stored
function getSessionStorage() {
    // Check localStorage first (Remember Me was checked)
    if (localStorage.getItem('sessionToken')) return localStorage;
    // Then check sessionStorage
    if (sessionStorage.getItem('sessionToken')) return sessionStorage;
    return null;
}

function getSessionToken() {
    const store = getSessionStorage();
    return store ? store.getItem('sessionToken') : null;
}

function storeSession(token, username, rememberMe) {
    const store = rememberMe ? localStorage : sessionStorage;
    store.setItem('sessionToken', token);
    store.setItem('loggedInUser', username);

    // Clear from the other storage to avoid conflicts
    const otherStore = rememberMe ? sessionStorage : localStorage;
    otherStore.removeItem('sessionToken');
    otherStore.removeItem('loggedInUser');
}

// Check if user already has a valid session on page load — auto-redirect
document.addEventListener('DOMContentLoaded', async () => {
    // Pre-fill saved credentials if Remember Me was checked previously
    const savedUser = localStorage.getItem('remember_username');
    const savedPass = localStorage.getItem('remember_password');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const rememberMeCheckbox = document.getElementById('remember-me');

    if (savedUser && usernameInput) {
        usernameInput.value = savedUser;
    }
    if (savedPass && passwordInput) {
        passwordInput.value = savedPass;
    }
    if (savedUser && rememberMeCheckbox) {
        rememberMeCheckbox.checked = true;
    }

    const token = getSessionToken();
    if (!token) return;

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        const response = await fetch(`${SERVER_URL}/session/validate?token=${encodeURIComponent(token)}`, {
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (response.ok) {
            const data = await response.json();
            if (data.valid === true) {
                // Already logged in — redirect to main app
                window.location.href = 'bala.html';
                return;
            }
        }
    } catch (err) {
        // Backend offline — check if we have a local fallback session
        const store = getSessionStorage();
        if (store && store.getItem('loggedInUser')) {
            window.location.href = 'bala.html';
            return;
        }
    }
});

// ============ PASSWORD TOGGLE ============

const togglePassword = document.getElementById('toggle-password');
if (togglePassword) {
    togglePassword.addEventListener('click', () => {
        const passwordInput = document.getElementById('password');
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        togglePassword.textContent = type === 'password' ? '👁️' : '🙈';
    });
}

// ============ FALLBACK AUTH (OFFLINE) ============

function checkFallbackAuth(user, pass) {
    const storedPass = localStorage.getItem('local_pwd_' + user);
    if (storedPass) {
        return pass === storedPass;
    }
    if (user.toLowerCase() === 'rcfruits' && pass === '123456789') {
        return true;
    }
    return false;
}

// Generate a local pseudo-token for offline sessions
function generateLocalToken() {
    return 'local-' + Date.now() + '-' + Math.random().toString(36).substring(2, 10);
}

function saveOrClearRememberedCredentials(user, pass, rememberMe) {
    if (rememberMe) {
        localStorage.setItem('remember_username', user);
        localStorage.setItem('remember_password', pass);
    } else {
        localStorage.removeItem('remember_username');
        localStorage.removeItem('remember_password');
    }
}

// ============ BACKEND STATUS WATCHDOG ============

const backendStatusBadge = document.getElementById('backend-status');
let isBackendConnected = false;

async function checkBackendConnection() {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2500);

        const response = await fetch(`${SERVER_URL}/ping?_t=${Date.now()}`, {
            method: 'GET',
            signal: controller.signal,
            cache: 'no-store',
            headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
        });
        clearTimeout(timeoutId);

        if (response.ok) {
            isBackendConnected = true;
            if (backendStatusBadge) {
                backendStatusBadge.className = 'server-status ok';
                backendStatusBadge.style.background = 'rgba(34, 197, 94, 0.15)';
                backendStatusBadge.style.color = '#4ade80';
                backendStatusBadge.style.border = '1px solid rgba(74, 222, 128, 0.3)';
                backendStatusBadge.innerHTML = '🟢 Backend Connected';
            }
        } else {
            throw new Error("HTTP " + response.status);
        }
    } catch (err) {
        isBackendConnected = false;
        if (backendStatusBadge) {
            backendStatusBadge.className = 'server-status warning';
            backendStatusBadge.style.background = 'rgba(239, 68, 68, 0.15)';
            backendStatusBadge.style.color = '#f87171';
            backendStatusBadge.style.border = '1px solid rgba(248, 113, 113, 0.3)';
            backendStatusBadge.innerHTML = '🔴 Backend Offline (Auto-connecting...)';
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    checkBackendConnection();
    setInterval(checkBackendConnection, 3000);
});

// ============ LOGIN HANDLER ============

const loginForm = document.getElementById('login-form');

async function attemptLoginWithAutoRetry(user, pass, rememberMe, originalText) {
    let maxRetries = 5;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            if (loginBtn) {
                loginBtn.innerHTML = `<span class="btn-text">⚡ Connecting to Backend (${attempt}/${maxRetries})...</span>`;
            }
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 4000);

            const response = await fetch(`${SERVER_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: user, password: pass }),
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (response.ok) {
                const data = await response.json();
                if (data.status === "SUCCESS" || data.success === true) {
                    storeSession(data.sessionToken || data.token, data.username || user, rememberMe);
                    saveOrClearRememberedCredentials(user, pass, rememberMe);
                    localStorage.setItem('local_pwd_' + user, pass);
                    window.location.href = 'bala.html';
                    return true;
                } else {
                    showAlert("Invalid username or password ❌");
                    if (loginBtn) loginBtn.innerHTML = originalText;
                    return true;
                }
            }
        } catch (err) {
            if (attempt < maxRetries) {
                await new Promise(r => setTimeout(r, 1200));
            }
        }
    }
    return false;
}

async function handleLogin(e) {
    if (e) e.preventDefault();

    const user = document.getElementById('username').value.trim();
    const pass = document.getElementById('password').value;
    const rememberMe = document.getElementById('remember-me')?.checked || false;

    if (!user || !pass) {
        showAlert("Please enter both username and password ❌");
        return;
    }

    const originalText = loginBtn ? loginBtn.innerHTML : 'Login';
    if (loginBtn) loginBtn.innerHTML = '<span class="btn-text">Connecting...</span>';

    const connected = await attemptLoginWithAutoRetry(user, pass, rememberMe, originalText);
    if (!connected) {
        // Backend offline after retries — check fallback authentication
        if (checkFallbackAuth(user, pass)) {
            const localToken = generateLocalToken();
            storeSession(localToken, user, rememberMe);
            saveOrClearRememberedCredentials(user, pass, rememberMe);
            localStorage.setItem('local_pwd_' + user, pass);
            window.location.href = 'bala.html';
        } else {
            showAlert("Invalid username or password or Backend offline ❌");
            if (loginBtn) loginBtn.innerHTML = originalText;
        }
    }
}

if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
} else if (loginBtn) {
    loginBtn.addEventListener('click', handleLogin);
}
