const SERVER_URL = (window.location.port === '8080') ? '/api/sales' : 'http://localhost:8080/api/sales';

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

// ============ LOGIN HANDLER ============

if (loginBtn) {
    loginBtn.addEventListener('click', async () => {
        const user = document.getElementById('username').value.trim();
        const pass = document.getElementById('password').value;
        const rememberMe = document.getElementById('remember-me')?.checked || false;

        if (!user || !pass) {
            showAlert("Please enter both username and password ❌");
            return;
        }

        const originalText = loginBtn.innerHTML;
        loginBtn.innerHTML = '<span class="btn-text">Checking...</span>';

        try {
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
                if (data.status === "SUCCESS") {
                    // Store session token and username
                    storeSession(data.sessionToken, data.username, rememberMe);
                    localStorage.setItem('local_pwd_' + user, pass);
                    window.location.href = 'bala.html';
                    return;
                } else {
                    showAlert("Invalid username or password ❌");
                    loginBtn.innerHTML = originalText;
                    return;
                }
            } else {
                throw new Error("HTTP " + response.status);
            }
        } catch (err) {
            // Backend server is offline or unreachable - check local fallback credentials
            if (checkFallbackAuth(user, pass)) {
                const localToken = generateLocalToken();
                storeSession(localToken, user, rememberMe);
                localStorage.setItem('local_pwd_' + user, pass);
                window.location.href = 'bala.html';
                return;
            } else {
                showAlert("Invalid username or password ❌");
                loginBtn.innerHTML = originalText;
            }
        }
    });
}
