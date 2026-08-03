const SERVER_URL = (window.location.port === '8080') ? '/api/sales' : 'http://localhost:8080/api/sales';

const forgotAlert = document.getElementById('forgot-alert');
const savePassBtn = document.getElementById('save-password-btn');

function showAlert(message, isSuccess = false) {
    if (!forgotAlert) return;
    forgotAlert.innerText = message;
    forgotAlert.className = isSuccess ? 'alert alert-success' : 'alert alert-error';
    forgotAlert.classList.remove('hidden');
    forgotAlert.style.display = 'block';
    forgotAlert.style.opacity = '1';
    setTimeout(() => { 
        forgotAlert.style.opacity = '0'; 
        setTimeout(() => { 
            forgotAlert.style.display = 'none'; 
            forgotAlert.classList.add('hidden'); 
        }, 300);
    }, 4000);
}

function getCompanyName() {
    return localStorage.getItem('companyName') || 'RCFruits';
}

function updateCompanyBranding() {
    const name = getCompanyName();
    document.title = name + " - Change Password";
}

document.addEventListener('DOMContentLoaded', updateCompanyBranding);

// Password Eye Toggles
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

setupPasswordToggle('toggle-old-password', 'old-password');
setupPasswordToggle('toggle-new-password', 'new-password');
setupPasswordToggle('toggle-confirm-password', 'confirm-password');

// Reset / Save Password Handler
if (savePassBtn) {
    savePassBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        const user = document.getElementById('forgot-username').value.trim();
        const oldPass = document.getElementById('old-password').value;
        const newPass = document.getElementById('new-password').value;
        const confirmPass = document.getElementById('confirm-password').value;

        if (!user || !oldPass || !newPass || !confirmPass) {
            showAlert("Please fill in all fields ❌");
            return;
        }

        if (newPass !== confirmPass) {
            showAlert("New password and confirm password do not match! ❌");
            return;
        }

        if (newPass.length < 4) {
            showAlert("New password must be at least 4 characters long ❌");
            return;
        }

        const originalText = savePassBtn.innerHTML;
        savePassBtn.innerHTML = '<span class="btn-text">Saving...</span>';

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 4000);

            const response = await fetch(`${SERVER_URL}/changePassword`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: user,
                    oldPassword: oldPass,
                    newPassword: newPass
                }),
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (response.ok) {
                const result = await response.text();
                if (result === "SUCCESS") {
                    localStorage.setItem('local_pwd_' + user, newPass);
                    showAlert("Password updated successfully! ✅ Redirecting to login...", true);
                    document.getElementById('old-password').value = '';
                    document.getElementById('new-password').value = '';
                    document.getElementById('confirm-password').value = '';

                    setTimeout(() => {
                        window.location.href = 'login.html';
                    }, 2000);

                } else if (result === "INVALID_OLD_PASSWORD") {
                    showAlert("Invalid old password or username ❌");
                } else {
                    showAlert("Failed to save new password ❌");
                }
            } else {
                showAlert("Server error saving password ❌");
            }
        } catch (err) {
            // Check if local old password matches
            const storedPass = localStorage.getItem('local_pwd_' + user) || ((user.toLowerCase() === 'rcfruits' && oldPass === '123456789') ? '123456789' : null);
            if (storedPass && storedPass === oldPass) {
                localStorage.setItem('local_pwd_' + user, newPass);
                showAlert("Password updated locally! ✅ Redirecting to login...", true);
                setTimeout(() => { window.location.href = 'login.html'; }, 2000);
            } else {
                showAlert("Invalid old password or username ❌");
            }
        } finally {
            savePassBtn.innerHTML = originalText;
        }
    });
}
