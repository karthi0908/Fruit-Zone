const SERVER_URL = (window.location.port === '8080') ? '/api/sales' : 'http://localhost:8080/api/sales';

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
        const company = document.getElementById('signup-company-name').value.trim();

        if (!user || !pass || !confirmPass || !company) {
            showAlert("Please fill in all fields including company name ❌");
            return;
        }

        if (pass !== confirmPass) {
            showAlert("Password and confirm password do not match! ❌");
            return;
        }

        if (pass.length < 4) {
            showAlert("Password must be at least 4 characters long ❌");
            return;
        }

        const originalText = signupBtn.innerHTML;
        signupBtn.innerHTML = '<span class="btn-text">Saving...</span>';

        // Save company name locally
        setCompanyName(company);

        // Save credentials locally as fallback
        localStorage.setItem('local_pwd_' + user, pass);

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 4000);

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

            if (response.ok) {
                showAlert("Account created & company name saved! ✅ Redirecting to login...", true);
            } else {
                showAlert("Registered locally! ✅ Redirecting to login...", true);
            }
        } catch (err) {
            showAlert("Account & company name saved locally! ✅ Redirecting to login...", true);
        } finally {
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 1500);
        }
    });
}
