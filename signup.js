const SERVER_URL = (window.location.protocol.startsWith('http'))
    ? (window.location.port === '8080' || window.location.port === '' ? '/api/sales' : `${window.location.protocol}//${window.location.hostname}:8080/api/sales`)
    : 'http://localhost:8080/api/sales';

const signupAlert = document.getElementById('signup-alert');
const signupBtn = document.getElementById('signup-btn');
const companyInput = document.getElementById('signup-company-name');

function getCompanyName() {
    return localStorage.getItem('companyName') || 'RCFruits';
}

function setCompanyName(name) {
    if (name && name.trim() !== '') {
        localStorage.setItem('companyName', name.trim());
    }
}

// Prefill company name if set
if (companyInput) {
    companyInput.value = getCompanyName();
}

function showAlert(message, isSuccess = false) {
    if (!signupAlert) return;
    signupAlert.innerText = message;
    signupAlert.className = isSuccess ? 'alert alert-success' : 'alert alert-error';
    signupAlert.classList.remove('hidden');
    signupAlert.style.display = 'block';
    signupAlert.style.opacity = '1';
    setTimeout(() => {
        signupAlert.style.opacity = '0';
        setTimeout(() => {
            signupAlert.style.display = 'none';
            signupAlert.classList.add('hidden');
        }, 300);
    }, 4000);
}

// ============ BACKEND STATUS WATCHDOG ============

const backendStatusBadge = document.getElementById('backend-status');

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

// Frontend email format validation
function isValidEmail(email) {
    return /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(email);
}

// Eye Toggles
function setupPasswordToggle(toggleId, inputId) {
    const toggle = document.getElementById(toggleId);
    const input = document.getElementById(inputId);
    if (toggle && input) {
        toggle.addEventListener('click', () => {
            const isPass = input.getAttribute('type') === 'password';
            input.setAttribute('type', isPass ? 'text' : 'password');
            toggle.textContent = isPass ? '🙈' : '👁️';
        });
    }
}

setupPasswordToggle('toggle-signup-password', 'signup-password');
setupPasswordToggle('toggle-signup-confirm', 'signup-confirm-password');

if (signupBtn) {
    signupBtn.addEventListener('click', async (e) => {
        e.preventDefault();

        const user = document.getElementById('signup-username').value.trim();
        const pass = document.getElementById('signup-password').value;
        const confirmPass = document.getElementById('signup-confirm-password').value;
        const company = companyInput ? companyInput.value.trim() : '';

        // ---- Frontend Validations ----

        if (!user) {
            showAlert("Please enter a username ❌");
            return;
        }

        if (!pass || !confirmPass) {
            showAlert("Please fill in both password fields ❌");
            return;
        }

        if (pass !== confirmPass) {
            showAlert("Password and confirm password do not match! ❌");
            return;
        }

        if (pass.length < 8) {
            showAlert("Password must be at least 8 characters long ❌");
            return;
        }

        if (!company) {
            showAlert("Please enter your company name ❌");
            return;
        }

        const originalText = signupBtn.innerHTML;
        signupBtn.innerHTML = '<span class="btn-text">Saving...</span>';
        signupBtn.disabled = true;

        // Save company name locally
        setCompanyName(company);

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000);

            const response = await fetch(`${SERVER_URL}/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: user,
                    password: pass,
                    companyName: company
                }),
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            const data = await response.json();

            if (response.ok && data.success) {
                showAlert("Account created successfully! ✅ Redirecting to login...", true);
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 1500);
            } else {
                showAlert(`❌ ${data.message || 'Failed to create account. Please try again.'}`);
                signupBtn.innerHTML = originalText;
                signupBtn.disabled = false;
            }
        } catch (err) {
            if (err.name === 'AbortError') {
                showAlert("❌ Server timeout. Please check your connection and try again.");
            } else {
                showAlert("❌ Unable to connect to server. Please try again.");
            }
            signupBtn.innerHTML = originalText;
            signupBtn.disabled = false;
        }
    });
}
