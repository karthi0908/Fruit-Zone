const SERVER_URL = (window.location.protocol.startsWith('http'))
    ? (window.location.port === '8080' || window.location.port === '' ? '/api/sales' : `${window.location.protocol}//${window.location.hostname}:8080/api/sales`)
    : 'http://localhost:8080/api/sales';

const forgotAlert = document.getElementById('forgot-alert');
const saveBtn = document.getElementById('save-btn') || document.getElementById('send-reset-link-btn');
const usernameInput = document.getElementById('forgot-username');
const newPasswordInput = document.getElementById('forgot-new-password');
const confirmPasswordInput = document.getElementById('forgot-confirm-password');

function showAlert(message, isSuccess = false) {
    if (!forgotAlert) return;
    forgotAlert.innerText = message;
    forgotAlert.className = isSuccess ? 'alert alert-success' : 'alert alert-error';
    forgotAlert.classList.remove('hidden');
    forgotAlert.style.display = 'block';
    forgotAlert.style.opacity = '1';
    setTimeout(() => {
        if (!isSuccess) {
            forgotAlert.style.opacity = '0';
            setTimeout(() => {
                forgotAlert.style.display = 'none';
                forgotAlert.classList.add('hidden');
            }, 300);
        }
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

setupPasswordToggle('toggle-forgot-new', 'forgot-new-password');
setupPasswordToggle('toggle-forgot-confirm', 'forgot-confirm-password');

if (saveBtn) {
    saveBtn.addEventListener('click', async (e) => {
        e.preventDefault();

        const user = usernameInput ? usernameInput.value.trim() : '';
        const newPass = newPasswordInput ? newPasswordInput.value : '';
        const confirmPass = confirmPasswordInput ? confirmPasswordInput.value : '';

        if (!user) {
            showAlert("Please enter your username ❌");
            return;
        }

        if (!newPass || !confirmPass) {
            showAlert("Please fill in both new password fields ❌");
            return;
        }

        if (newPass !== confirmPass) {
            showAlert("New password and confirm password do not match! ❌");
            return;
        }

        if (newPass.length < 8) {
            showAlert("Password must be at least 8 characters long ❌");
            return;
        }

        const originalText = saveBtn.innerHTML;
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<span class="btn-text">Saving...</span>';

        try {
            const response = await fetch(`${SERVER_URL}/resetPasswordDirect`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: user,
                    newPassword: newPass
                })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                showAlert(`✓ Password saved successfully! ✅ Redirecting to login...`, true);
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 1500);
            } else {
                showAlert(`❌ ${data.message || 'Unable to update password. Please try again.'}`);
                saveBtn.disabled = false;
                saveBtn.innerHTML = originalText;
            }
        } catch (err) {
            showAlert("❌ Error connecting to server. Please check your connection and try again.");
            saveBtn.disabled = false;
            saveBtn.innerHTML = originalText;
        }
    });
}
