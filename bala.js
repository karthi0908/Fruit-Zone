const SERVER_URL = (window.location.port === '8080') ? '/api/sales' : 'http://localhost:8080/api/sales';

function getCompanyName() {
    return localStorage.getItem('companyName') || 'RCFruits';
}

function updateCompanyBranding() {
    const name = getCompanyName();
    document.title = '🍉 ' + name;
    const mainTitle = document.getElementById('main-app-title');
    if (mainTitle) mainTitle.innerHTML = '🍉 ' + name;
    const secTitle = document.getElementById('modal-security-title');
    if (secTitle) secTitle.innerHTML = '🔒 ' + name + ' Security';
}

// ============ SESSION HELPERS ============

function getSessionStorage() {
    if (localStorage.getItem('sessionToken')) return localStorage;
    if (sessionStorage.getItem('sessionToken')) return sessionStorage;
    return null;
}

function getSessionToken() {
    const store = getSessionStorage();
    return store ? store.getItem('sessionToken') : null;
}

function getLoggedInUser() {
    const store = getSessionStorage();
    return store ? store.getItem('loggedInUser') : null;
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

function clearSession() {
    sessionStorage.removeItem('sessionToken');
    sessionStorage.removeItem('loggedInUser');
    localStorage.removeItem('sessionToken');
    localStorage.removeItem('loggedInUser');
}

function generateLocalToken() {
    return 'local-' + Date.now() + '-' + Math.random().toString(36).substring(2, 10);
}

function updateSessionBar(username) {
    const userDisplay = document.getElementById('logged-in-user');
    if (userDisplay && username) {
        userDisplay.textContent = 'Logged in as: ' + username;
        userDisplay.style.color = '#60a5fa';
    }
}

// ============ LOGOUT ============

async function handleLogout() {
    const token = getSessionToken();

    // Try to notify backend
    if (token) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000);
            await fetch(`${SERVER_URL}/logout`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionToken: token }),
                signal: controller.signal
            });
            clearTimeout(timeoutId);
        } catch (err) {
            // Backend offline — just clear locally
        }
    }

    clearSession();
    window.location.href = 'login.html';
}

// ============ SESSION VALIDATION & AUTH ============

document.addEventListener('DOMContentLoaded', async () => {
    updateCompanyBranding();
    const loginOverlay = document.getElementById('login-overlay');
    const mainApp = document.getElementById('main-app');

    // Logout button handler
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }

    // ---- Validate existing session ----
    const token = getSessionToken();
    let sessionValid = false;
    let sessionUsername = getLoggedInUser();

    if (token) {
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
                    sessionValid = true;
                    sessionUsername = data.username;
                }
            }
        } catch (err) {
            // Backend offline — trust local session if we have a user
            if (sessionUsername) {
                sessionValid = true;
            }
        }
    }

    if (sessionValid && sessionUsername) {
        if (mainApp) mainApp.classList.remove('hidden');
        updateSessionBar(sessionUsername);
    } else {
        // No valid session — show login overlay
        clearSession();
        if (loginOverlay) loginOverlay.classList.remove('hidden');
    }

    // ---- Login Overlay Logic ----
    const loginBtn = document.getElementById('login-btn');
    const loginAlert = document.getElementById('login-alert');
    const togglePassword = document.getElementById('toggle-password');

    if (togglePassword) {
        togglePassword.addEventListener('click', () => {
            const passwordInput = document.getElementById('password');
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            togglePassword.textContent = type === 'password' ? '👁️' : '🙈';
        });
    }

    function showModalAlert(element, message, isSuccess = false) {
        if (!element) return;
        element.innerText = message;
        element.className = isSuccess ? 'alert alert-success' : 'alert alert-error';
        element.classList.remove('hidden');
        setTimeout(() => { 
            element.classList.add('hidden');
        }, 4000);
    }

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

    if (loginBtn) {
        loginBtn.addEventListener('click', async () => {
            const user = document.getElementById('username').value.trim();
            const pass = document.getElementById('password').value;
            const rememberMe = document.getElementById('remember-me')?.checked || false;
            
            if (!user || !pass) {
                showModalAlert(loginAlert, "Please enter both username and password ❌");
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
                        storeSession(data.sessionToken, data.username, rememberMe);
                        localStorage.setItem('local_pwd_' + user, pass);
                        loginOverlay.classList.add('hidden');
                        mainApp.classList.remove('hidden');
                        updateSessionBar(data.username);
                        checkServer();
                        return;
                    } else {
                        showModalAlert(loginAlert, "Invalid username or password ❌");
                        loginBtn.innerHTML = originalText;
                        return;
                    }
                } else {
                    throw new Error("HTTP " + response.status);
                }
            } catch(err) {
                if (checkFallbackAuth(user, pass)) {
                    const localToken = generateLocalToken();
                    storeSession(localToken, user, rememberMe);
                    localStorage.setItem('local_pwd_' + user, pass);
                    loginOverlay.classList.add('hidden');
                    mainApp.classList.remove('hidden');
                    updateSessionBar(user);
                    checkServer();
                    return;
                } else {
                    showModalAlert(loginAlert, "Invalid username or password ❌");
                    loginBtn.innerHTML = originalText;
                }
            }
        });
    }
});

// Deleted global SHOPS array tracking to make them date-specific

let dynamicFruits = JSON.parse(localStorage.getItem('dynamicFruits') || '[]');

function getFruitIcon(fruitName) {
    if (!fruitName) return '🍎';
    const lower = fruitName.toLowerCase().trim();

    if (lower.includes('mango') || lower.includes('aam')) return '🥭';
    if (lower.includes('apple') || lower.includes('seb')) return '🍎';
    if (lower.includes('banana') || lower.includes('kela')) return '🍌';
    if (lower.includes('grape') || lower.includes('angoor')) return '🍇';
    if (lower.includes('govya') || lower.includes('guava') || lower.includes('amrood')) return '🍏';
    if (lower.includes('sapota') || lower.includes('chiku') || lower.includes('chikoo')) return '🥔';
    if (lower.includes('watermel') || lower.includes('tarbooz') || lower.includes('matthan')) return '🍉';
    if (lower.includes('krini') || lower.includes('kirni') || lower.includes('kharbuja') || lower.includes('muskmelon') || lower.includes('melon')) return '🍈';
    if (lower.includes('seetha') || lower.includes('sitaphal') || lower.includes('custard') || lower.includes('sharifa')) return '🍐';
    if (lower.includes('orange') || lower.includes('santra') || lower.includes('mosambi') || lower.includes('citrus')) return '🍊';
    if (lower.includes('papaya') || lower.includes('papita')) return '🍈';
    if (lower.includes('pine') || lower.includes('ananas')) return '🍍';
    if (lower.includes('strawb')) return '🍓';
    if (lower.includes('cherry')) return '🍒';
    if (lower.includes('peach') || lower.includes('aadoo')) return '🍑';
    if (lower.includes('kiwi')) return '🥝';
    if (lower.includes('pomegranate') || lower.includes('anar')) return '🍎';
    if (lower.includes('fig') || lower.includes('anjeer')) return '🫐';
    if (lower.includes('berry') || lower.includes('jamun')) return '🫐';
    if (lower.includes('lemon') || lower.includes('nimbu')) return '🍋';
    if (lower.includes('coconut') || lower.includes('nariyal')) return '🥥';
    if (lower.includes('dragon') || lower.includes('pitaya')) return '🐉';
    if (lower.includes('avocado')) return '🥑';

    return '📦';
}

let dateInput = null;
let tableBody = null;
let saveAllBtn = null;
let serverStatus = null;
let alertBox = null;
let addFruitBtn = null;
let addShopBtn = null;
let thTotalAmount = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    dateInput = document.getElementById('record-date');
    tableBody = document.getElementById('sales-table-body');
    saveAllBtn = document.getElementById('save-all-btn');
    serverStatus = document.getElementById('server-status');
    alertBox = document.getElementById('alert-box');
    addFruitBtn = document.getElementById('add-fruit-btn');
    addShopBtn = document.getElementById('add-shop-btn');
    thTotalAmount = document.getElementById('th-total-amount');

    // Set today's date
    const today = new Date().toISOString().split('T')[0];
    if (dateInput) dateInput.value = today;

    // Check Backend Server Status
    checkServer();
    setInterval(checkServer, 5000);

    // Render Table
    renderTable();

    // Event Listeners
    dateInput.addEventListener('change', fetchRecordsForDate);
    saveAllBtn.addEventListener('click', saveAllRecords);

    // View Toggle Button Handler
    const viewToggleBtn = document.getElementById('view-toggle-btn');
    const tableWrapper = document.querySelector('.table-wrapper');

    function updateViewToggleUI() {
        if (!viewToggleBtn || !tableWrapper) return;
        const isCardView = tableWrapper.classList.contains('card-view-active');
        const iconSpan = document.getElementById('view-toggle-icon');
        const textSpan = document.getElementById('view-toggle-text');
        if (isCardView) {
            if (iconSpan) iconSpan.textContent = '📊';
            if (textSpan) textSpan.textContent = 'Table View';
        } else {
            if (iconSpan) iconSpan.textContent = '🗂️';
            if (textSpan) textSpan.textContent = 'Card View';
        }
    }

    if (viewToggleBtn && tableWrapper) {
        viewToggleBtn.addEventListener('click', () => {
            tableWrapper.classList.toggle('card-view-active');
            const isCard = tableWrapper.classList.contains('card-view-active');
            localStorage.setItem('preferredView', isCard ? 'card' : 'table');
            updateViewToggleUI();
        });

        const savedView = localStorage.getItem('preferredView');
        if (savedView === 'card' || (!savedView && window.innerWidth <= 768)) {
            tableWrapper.classList.add('card-view-active');
        }
        updateViewToggleUI();
    }




    const handleAddFruit = () => {
        const fruitName = prompt("Enter new fruit name (e.g., Apple):");
        if (fruitName && fruitName.trim() !== '') {
            const cleanName = fruitName.trim();
            // Validate alphanumeric
            if (!dynamicFruits.includes(cleanName)) {
                dynamicFruits.push(cleanName);
                localStorage.setItem('dynamicFruits', JSON.stringify(dynamicFruits));
                fetchRecordsForDate(); // Refetch or render to show new column
            } else {
                alert("Category already exists.");
            }
        }
    };

    if (addFruitBtn) addFruitBtn.addEventListener('click', handleAddFruit);
    const addFruitBtnMain = document.getElementById('add-fruit-btn-main');
    if (addFruitBtnMain) addFruitBtnMain.addEventListener('click', handleAddFruit);

    const handleAddShop = async () => {
        const shopName = prompt("Enter new shop name:");
        if (shopName && shopName.trim() !== '') {
            const cleanName = shopName.trim();
            const existingBtn = Array.from(document.querySelectorAll('.btn-shop-bill')).find(btn => btn.innerText === cleanName);
            if (!existingBtn) {
                let previousBalance = 0;
                let previousEmpty = 0;

                try {
                    const balRes = await fetch(`${SERVER_URL}/previousBalance?date=${dateInput.value}&shopName=${encodeURIComponent(cleanName)}`);
                    if (balRes.ok) {
                        previousBalance = parseInt(await balRes.text(), 10) || 0;
                    }
                } catch (e) {
                    console.error('Could not fetch previous balance');
                }

                try {
                    const empRes = await fetch(`${SERVER_URL}/previousEmptyBalance?date=${dateInput.value}&shopName=${encodeURIComponent(cleanName)}`);
                    if (empRes.ok) {
                        previousEmpty = parseInt(await empRes.text(), 10) || 0;
                    }
                } catch (e) {
                    console.error('Could not fetch previous empty balance');
                }

                const emptyData = {
                    recordDate: dateInput.value,
                    shopName: cleanName,
                    oldBalance: previousBalance,
                    totalAmount: 0,
                    balance: previousBalance,
                    oldEmpty: previousEmpty,
                    balanceEmpty: previousEmpty,
                    dynamicData: "{}"
                };

                try {
                    const response = await fetch(`${SERVER_URL}/save`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(emptyData)
                    });
                    if (response.ok) fetchRecordsForDate();
                    else alert("Failed to add shop to database.");
                } catch (err) {
                    alert("Error adding shop. Please check your backend connection.");
                }
            } else {
                alert("Shop already exists for this date.");
            }
        }
    };

    if (addShopBtn) addShopBtn.addEventListener('click', handleAddShop);
    window.handleAddShopGlobal = handleAddShop;
    window.handleAddFruitGlobal = handleAddFruit;
    window.removeFruitCategory = function(fruitName) {
        if (confirm('Are you sure you want to remove the "' + fruitName + '" category?')) {
            dynamicFruits = dynamicFruits.filter(f => f !== fruitName);
            localStorage.setItem('dynamicFruits', JSON.stringify(dynamicFruits));
            fetchRecordsForDate();
        }
    };

    // Auto-calculate amount and total amount on inputs change
    tableBody.addEventListener('input', (e) => {
        if (e.target.classList.contains('qty-input') || e.target.classList.contains('dyn-input')) {
            const tr = e.target.closest('tr');
            handleRowCalculation(tr);
        }
    });
});

let isCheckingStatus = false;
async function checkServer() {
    if (isCheckingStatus) return;
    isCheckingStatus = true;
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        const response = await fetch(`${SERVER_URL}/ping`, { 
            method: 'GET',
            signal: controller.signal 
        });
        clearTimeout(timeoutId);

        if (response.ok) {
            const wasOffline = serverStatus.classList.contains('error') || serverStatus.classList.contains('warning') || serverStatus.innerHTML.includes('Checking') || serverStatus.innerHTML.includes('Connecting');
            serverStatus.className = 'server-status ok';
            serverStatus.innerHTML = '🟢 Connected to Java Backend';
            if (wasOffline) {
                fetchRecordsForDate();
            }
        } else {
            throw new Error('Server returned error');
        }
    } catch (err) {
        serverStatus.className = 'server-status warning';
        serverStatus.innerHTML = '🟡 Backend Connecting... (Auto-retrying)';
    } finally {
        isCheckingStatus = false;
    }
}

function renderTable(data = []) {
    // Collect any new dynamic columns from the database
    data.forEach(d => {
        if (d.dynamicData) {
            try {
                const parsed = JSON.parse(d.dynamicData);
                Object.keys(parsed).forEach(k => {
                    if (!dynamicFruits.includes(k)) {
                        dynamicFruits.push(k);
                    }
                });
            } catch (e) { }
        }
    });
    localStorage.setItem('dynamicFruits', JSON.stringify(dynamicFruits));

    // Update Headers dynamically
    if (thTotalAmount) {
        document.querySelectorAll('.dynamic-th').forEach(el => el.remove());
        dynamicFruits.forEach(fruit => {
            const th1 = document.createElement('th'); 
            th1.className = 'dynamic-th'; 
            th1.innerText = fruit;
            th1.style.cursor = 'pointer';
            th1.title = `Click to remove ${fruit} category`;
            th1.onclick = () => window.removeFruitCategory(fruit);

            const th2 = document.createElement('th'); th2.className = 'dynamic-th'; th2.innerText = 'Rate';
            const th3 = document.createElement('th'); th3.className = 'dynamic-th'; th3.innerText = 'Amount';
            thTotalAmount.parentNode.insertBefore(th1, thTotalAmount);
            thTotalAmount.parentNode.insertBefore(th2, thTotalAmount);
            thTotalAmount.parentNode.insertBefore(th3, thTotalAmount);
        });
    }

    tableBody.innerHTML = '';

    data.forEach((record, index) => {
        const shopName = record.shopName || 'Unknown Shop';

        let dynData = {};
        try { dynData = JSON.parse(record.dynamicData || '{}'); } catch (e) { }

        const f = (val) => (val === 0 || val === '0') ? '' : val;

        const tr = document.createElement('tr');

        let htmlStr = `
            <td class="sticky-col" data-label="Shop Name">
                <div class="card-header-top" style="align-items: center; gap: 6px; margin-bottom: 4px;">
                    <button class="btn-header-add card-add-btn" onclick="window.handleAddShopGlobal()" title="Add Shop Row">+</button>
                    <span style="font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-secondary); font-weight: 600;">SHOP NAME</span>
                </div>
                <button class="btn-shop-bill" onclick="showBill(this, '${shopName}')">${shopName}</button>
            </td>
            <td data-label="Guava Qty"><input type="number" step="1" class="qty-input" data-col="govya" value="${f(record.govya)}"></td>
            <td data-label="Guava Rate"><input type="number" step="1" class="qty-input" data-col="govyaRate" value="${f(record.govyaRate)}"></td>
            <td data-label="Guava Amount"><input type="number" step="1" class="qty-input amt-input" data-col="govyaAmount" value="${f(record.govyaAmount)}" tabindex="-1" readonly></td>
            <td data-label="Grapes Qty"><input type="number" step="1" class="qty-input" data-col="grapes" value="${f(record.grapes)}"></td>
            <td data-label="Grapes Rate"><input type="number" step="1" class="qty-input" data-col="grapesRate" value="${f(record.grapesRate)}"></td>
            <td data-label="Grapes Amount"><input type="number" step="1" class="qty-input amt-input" data-col="grapesAmount" value="${f(record.grapesAmount)}" tabindex="-1" readonly></td>
            <td data-label="Sapota Qty"><input type="number" step="1" class="qty-input" data-col="sapota" value="${f(record.sapota)}"></td>
            <td data-label="Sapota Rate"><input type="number" step="1" class="qty-input" data-col="sapotaRate" value="${f(record.sapotaRate)}"></td>
            <td data-label="Sapota Amount"><input type="number" step="1" class="qty-input amt-input" data-col="sapotaAmount" value="${f(record.sapotaAmount)}" tabindex="-1" readonly></td>
        `;

        dynamicFruits.forEach(fruit => {
            const fd = dynData[fruit] || { qty: '', rate: '', amt: '' };
            htmlStr += `
                <td data-label="${fruit} Qty" onclick="if(event.target.tagName !== 'INPUT') window.removeFruitCategory('${fruit}')">
                    <input type="number" step="1" class="qty-input dyn-input dyn-qty" data-fruit="${fruit}" value="${f(fd.qty)}">
                </td>
                <td data-label="${fruit} Rate" onclick="if(event.target.tagName !== 'INPUT') window.removeFruitCategory('${fruit}')">
                    <input type="number" step="1" class="qty-input dyn-input dyn-rate" data-fruit="${fruit}" value="${f(fd.rate)}">
                </td>
                <td data-label="${fruit} Amount" onclick="if(event.target.tagName !== 'INPUT') window.removeFruitCategory('${fruit}')">
                    <input type="number" step="1" class="qty-input dyn-input dyn-amt amt-input" data-fruit="${fruit}" value="${f(fd.amt)}" tabindex="-1" readonly>
                </td>
            `;
        });

        htmlStr += `
            <td data-label="Total Amount">
                <div class="card-total-header" style="align-items: center; gap: 6px; margin-bottom: 4px;">
                    <button class="btn-header-add card-add-btn" onclick="window.handleAddFruitGlobal()" title="Add Fruit Column">+</button>
                    <span style="font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.5px; color: #60a5fa; font-weight: 600;">TOTAL AMOUNT</span>
                </div>
                <input type="number" step="0.01" class="qty-input fixed-total-amt" data-col="totalAmount" value="${f(record.totalAmount)}" tabindex="-1" readonly>
            </td>
            <td data-label="Given Amount"><input type="number" step="1" class="qty-input" data-col="givenAmount" value="${f(record.givenAmount)}"></td>
            <td data-label="Old Balance"><input type="number" step="1" class="qty-input" data-col="oldBalance" value="${f(record.oldBalance)}"></td>
            <td data-label="Balance"><input type="number" step="0.01" class="qty-input" data-col="balance" value="${f(record.balance)}" tabindex="-1" readonly></td>
            <td data-label="Total Empty"><input type="number" step="1" class="qty-input" data-col="empty" value="${f(record.empty)}" tabindex="-1" readonly></td>
            <td data-label="Empty Return"><input type="number" step="1" class="qty-input" data-col="emptyReturn" value="${f(record.emptyReturn)}"></td>
            <td data-label="Old Empty"><input type="number" step="1" class="qty-input" data-col="oldEmpty" value="${f(record.oldEmpty)}"></td>
            <td data-label="Balance Empty"><input type="number" step="1" class="qty-input" data-col="balanceEmpty" value="${f(record.balanceEmpty)}" tabindex="-1" readonly></td>
            <td data-label="Actions">
                <button class="btn-save-row" onclick="saveRow(${index}, '${shopName}')">Save</button>
                <button class="btn-delete-row" style="background-color: #f87171; border:none; border-radius: 6px; padding: 6px 10px; cursor: pointer; color: white; margin-left: 5px;" onclick="deleteShopRow('${shopName}')" title="Delete Shop">🗑️</button>
            </td>
        `;

        tr.innerHTML = htmlStr;
        tableBody.appendChild(tr);
    });
}

function showAlert(message, type = 'success') {
    alertBox.innerHTML = message;
    alertBox.className = `alert alert-${type}`;
    setTimeout(() => { alertBox.className = 'alert hidden'; }, 4000);
}

// Fetch records
async function fetchRecordsForDate() {
    const date = dateInput.value;
    try {
        const response = await fetch(`${SERVER_URL}?date=${date}&_t=${new Date().getTime()}`, { cache: 'no-store' });
        if (response.ok) {
            const data = await response.json();
            localStorage.setItem(`cached_records_${date}`, JSON.stringify(data));
            renderTable(data);
        } else {
            throw new Error('Failed to fetch records from server');
        }
    } catch (err) {
        console.error("Error fetching data:", err);
        const cached = localStorage.getItem(`cached_records_${date}`);
        if (cached) {
            renderTable(JSON.parse(cached));
            showAlert("Backend error: loaded data from local cache (Read-Only Mode)", "warning");
        } else {
            renderTable([]);
            showAlert("Backend error: could not fetch records", "error");
        }
    }
}

// Gather row data
function getRowData(index, shopName) {
    const row = tableBody.children[index];
    const inputs = row.querySelectorAll('.qty-input[data-col]');

    let baseData = {
        recordDate: dateInput.value,
        shopName: shopName
    };

    inputs.forEach(inp => {
        const col = inp.getAttribute('data-col');
        const val = parseFloat(inp.value) || 0;
        baseData[col] = (col === 'totalAmount' || col === 'balance') ? val : parseInt(val, 10);
    });

    const dynDataObj = {};
    const dynQtys = row.querySelectorAll('.dyn-qty');
    const dynRates = row.querySelectorAll('.dyn-rate');
    const dynAmts = row.querySelectorAll('.dyn-amt');

    dynamicFruits.forEach((fruit, i) => {
        const qtyV = parseInt(dynQtys[i].value, 10) || 0;
        const rateV = parseInt(dynRates[i].value, 10) || 0;
        const amtV = parseInt(dynAmts[i].value, 10) || 0;
        if (qtyV > 0 || rateV > 0 || amtV > 0) {
            dynDataObj[fruit] = { qty: qtyV, rate: rateV, amt: amtV };
        }
    });

    baseData.dynamicData = JSON.stringify(dynDataObj);
    return baseData;
}

// Save specific row
async function saveRow(index, shopName) {
    const rowBtn = tableBody.children[index].querySelector('.btn-save-row');
    const originalText = rowBtn.innerText;
    rowBtn.innerText = '⏳...';

    const data = getRowData(index, shopName);

    try {
        const response = await fetch(`${SERVER_URL}/save`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (response.ok) {
            rowBtn.innerText = '✅ Saved';
            updateLocalCachedRecord(dateInput.value, shopName, data);
            showAlert(`Saved ${shopName} successfully!`);
        } else {
            throw new Error('Server returned failure status');
        }
    } catch (err) {
        rowBtn.innerText = '❌ Error';
        showAlert(`Failed to save ${shopName}: ${err.message}`, 'error');
    }
    setTimeout(() => rowBtn.innerText = originalText, 3000);
}

async function deleteShopRow(shopName) {
    if (!confirm(`Are you sure you want to completely delete '${shopName}' from this date?`)) return;

    try {
        const response = await fetch(`${SERVER_URL}/delete?date=${dateInput.value}&shopName=${encodeURIComponent(shopName)}`, {
            method: 'DELETE'
        });
        if (response.ok) {
            updateLocalCachedRecord(dateInput.value, shopName, null, true);
            fetchRecordsForDate();
            showAlert(`Deleted ${shopName} successfully!`);
        } else {
            throw new Error('Server returned failure status');
        }
    } catch (err) {
        showAlert(`Failed to delete ${shopName}: ${err.message}`, 'error');
    }
}

// Save all rows
async function saveAllRecords() {
    const originalText = saveAllBtn.innerHTML;
    saveAllBtn.innerHTML = '<span class="btn-text">Saving All...</span><span class="btn-icon">⏳</span>';

    const payload = [];
    for (let i = 0; i < tableBody.children.length; i++) {
        const rowShopName = tableBody.children[i].querySelector('.btn-shop-bill').innerText;
        payload.push(getRowData(i, rowShopName));
    }

    try {
        const response = await fetch(`${SERVER_URL}/saveAll`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (response.ok) {
            payload.forEach(record => {
                updateLocalCachedRecord(dateInput.value, record.shopName, record);
            });
            saveAllBtn.innerHTML = '<span class="btn-text">Saved Successfully!</span><span class="btn-icon">✅</span>';
            showAlert('All records saved successfully!');
        } else {
            throw new Error('Server returned failure status');
        }
    } catch (err) {
        saveAllBtn.innerHTML = '<span class="btn-text">Error Saving</span><span class="btn-icon">❌</span>';
        showAlert(`Failed to save records: ${err.message}`, 'error');
    }

    setTimeout(() => saveAllBtn.innerHTML = originalText, 3000);
}

// Automatically multiplies rate with qty and updates total amounts
function handleRowCalculation(tr) {
    let totalAmount = 0;
    let totalQty = 0;

    // Fixed inputs calculation
    const allInputs = tr.querySelectorAll('td');

    // Triplets logic: Qty is at td[1], Rate is at td[2], Amt is at td[3]
    // We can just iterate all pairs of (qty, rate) since they are sequential
    // For fixed fruits:
    for (let i = 0; i < 3; i++) { // govya, grapes, sapota
        const qtyInp = tr.querySelector(`input[data-col="${['govya', 'grapes', 'sapota'][i]}"]`);
        const rateInp = tr.querySelector(`input[data-col="${['govyaRate', 'grapesRate', 'sapotaRate'][i]}"]`);
        const amtInp = tr.querySelector(`input[data-col="${['govyaAmount', 'grapesAmount', 'sapotaAmount'][i]}"]`);

        const q = parseInt(qtyInp.value, 10) || 0;
        const r = parseInt(rateInp.value, 10) || 0;
        if (q > 0 || r > 0) {
            amtInp.value = q * r;
        } else {
            amtInp.value = '';
        }
        totalAmount += parseFloat(amtInp.value) || 0;
        totalQty += q;
    }

    // For dynamic fruits:
    const dynQtys = tr.querySelectorAll('.dyn-qty');
    const dynRates = tr.querySelectorAll('.dyn-rate');
    const dynAmts = tr.querySelectorAll('.dyn-amt');

    for (let j = 0; j < dynQtys.length; j++) {
        const q = parseInt(dynQtys[j].value, 10) || 0;
        const r = parseInt(dynRates[j].value, 10) || 0;
        if (q > 0 || r > 0) {
            dynAmts[j].value = q * r;
        } else {
            dynAmts[j].value = '';
        }
        totalAmount += parseFloat(dynAmts[j].value) || 0;
        totalQty += q;
    }

    const totalInp = tr.querySelector('[data-col="totalAmount"]');
    if (totalInp) {
        totalInp.value = totalAmount > 0 ? totalAmount : '';
    }

    const givenInp = tr.querySelector('[data-col="givenAmount"]');
    const oldBalInp = tr.querySelector('[data-col="oldBalance"]');
    const balanceInp = tr.querySelector('[data-col="balance"]');
    if (totalInp && givenInp && oldBalInp && balanceInp) {
        const givenAmount = parseFloat(givenInp.value) || 0;
        const oldBalance = parseFloat(oldBalInp.value) || 0;
        const currentTotal = parseFloat(totalInp.value) || 0;
        
        const newBalance = currentTotal + oldBalance - givenAmount;
        balanceInp.value = newBalance !== 0 ? newBalance : '';
    }

    const emptyInp = tr.querySelector('[data-col="empty"]');
    const emptyReturnInp = tr.querySelector('[data-col="emptyReturn"]');
    const oldEmptyInp = tr.querySelector('[data-col="oldEmpty"]');
    const balanceEmptyInp = tr.querySelector('[data-col="balanceEmpty"]');
    if (emptyInp && emptyReturnInp && oldEmptyInp && balanceEmptyInp) {
        
        // Auto-calculate Total Empty based on fruit quantities taken
        emptyInp.value = totalQty > 0 ? totalQty : '';

        // Strip any accidental decimals from the inputs so they visually force integers
        if (emptyReturnInp.value.includes('.')) emptyReturnInp.value = parseInt(emptyReturnInp.value, 10) || 0;
        if (oldEmptyInp.value.includes('.')) oldEmptyInp.value = parseInt(oldEmptyInp.value, 10) || 0;

        const emp = parseInt(emptyInp.value, 10) || 0;
        const empRet = parseInt(emptyReturnInp.value, 10) || 0;
        const oldEmp = parseInt(oldEmptyInp.value, 10) || 0;
        const balEmp = emp + oldEmp - empRet;
        balanceEmptyInp.value = balEmp !== 0 ? balEmp : '';
    }

}

// --- Bill / Receipt Logic ---
const billModal = document.getElementById('bill-modal');
const receiptContent = document.getElementById('receipt-content');

function closeBill() {
    billModal.classList.add('hidden');
}

function printBill() {
    window.print();
}

function showBill(btn, shopName) {
    const tr = btn.closest('tr');

    let displayDate = dateInput.value;
    if (displayDate) {
        const parts = displayDate.split('-');
        if (parts.length === 3) displayDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
    }

    let html = `
        <div class="bill-header">
            <h2 class="bill-title">🍉 ${getCompanyName()}</h2>
            <div class="bill-meta">
                <div class="bill-shop">To: ${shopName}</div>
                <div class="bill-date">Date: ${displayDate}</div>
            </div>
        </div>
        <table class="bill-table">
            <thead>
                <tr>
                    <th>Item / Fruit</th>
                    <th class="th-center">Rate</th>
                    <th class="th-right">Amount</th>
                </tr>
            </thead>
            <tbody>
    `;

    let totalCalculated = 0;

    const getVal = (col) => {
        const inp = tr.querySelector(`input[data-col="${col}"]`);
        return inp ? (parseInt(inp.value, 10) || 0) : 0;
    };

    const getFloatVal = (col) => {
        const inp = tr.querySelector(`input[data-col="${col}"]`);
        return inp ? (parseFloat(inp.value) || 0) : 0;
    };

    // Fixed fruits
    const fixed = [
        { name: 'Govya 🍏', qty: getVal('govya'), rate: getVal('govyaRate'), amt: getVal('govyaAmount') },
        { name: 'Grapes 🍇', qty: getVal('grapes'), rate: getVal('grapesRate'), amt: getVal('grapesAmount') },
        { name: 'Sapota 🥔', qty: getVal('sapota'), rate: getVal('sapotaRate'), amt: getVal('sapotaAmount') },
    ];

    fixed.forEach(f => {
        if (f.qty > 0 || f.amt > 0) {
            totalCalculated += f.amt;
            html += `<tr>
                <td class="bill-item">${f.name}</td>
                <td class="bill-rate">₹${f.rate}</td>
                <td class="bill-amt">₹${f.amt}</td>
            </tr>`;
        }
    });

    // Dynamic fruits
    const dynQtys = tr.querySelectorAll('.dyn-qty');
    const dynRates = tr.querySelectorAll('.dyn-rate');
    const dynAmts = tr.querySelectorAll('.dyn-amt');

    for (let j = 0; j < dynQtys.length; j++) {
        const fruitName = dynQtys[j].getAttribute('data-fruit') || 'Dynamic';
        const q = parseInt(dynQtys[j].value, 10) || 0;
        const r = parseInt(dynRates[j].value, 10) || 0;
        const amt = parseInt(dynAmts[j].value, 10) || 0;

        if (q > 0 || amt > 0) {
            totalCalculated += amt;
            const icon = getFruitIcon(fruitName);
            const cleanName = fruitName.length > 12 ? fruitName.substring(0, 12) + '..' : fruitName;
            html += `<tr>
                <td class="bill-item">${cleanName} ${icon}</td>
                <td class="bill-rate">₹${r}</td>
                <td class="bill-amt">₹${amt}</td>
            </tr>`;
        }
    }

    html += `</tbody></table>`;
    
    html += `<div class="bill-summary">`;
    html += `<div class="bill-row"><span class="bill-row-label">Total Amount:</span><span class="bill-total-val">₹${totalCalculated.toFixed(2)}</span></div>`;

    const oldBal = getVal('oldBalance');
    if (oldBal > 0) {
        html += `<div class="bill-row"><span class="bill-row-label">Old Balance:</span><span class="bill-row-val">₹${oldBal.toFixed(2)}</span></div>`;
        totalCalculated += oldBal;
        html += `<div class="bill-row" style="border-top: 1px dotted rgba(255,255,255,0.2); padding-top: 8px;"><span class="bill-row-label">Sub Total:</span><span class="bill-row-val">₹${totalCalculated.toFixed(2)}</span></div>`;
    }

    const givenAmt = getVal('givenAmount');
    if (givenAmt > 0) {
        html += `<div class="bill-row"><span class="bill-row-label">Given Amount:</span><span class="bill-row-val">₹${givenAmt.toFixed(2)}</span></div>`;
        const bal = totalCalculated - givenAmt;
        html += `<div class="bill-row" style="margin-top: 1rem; border-top: 2px solid rgba(255,255,255,0.2); padding-top: 1rem;"><span class="bill-row-label" style="color: white; font-weight: 600;">Final Balance:</span><span class="bill-bal-val">₹${bal.toFixed(2)}</span></div>`;
    } else {
        html += `<div class="bill-row" style="margin-top: 1rem; border-top: 2px solid rgba(255,255,255,0.2); padding-top: 1rem;"><span class="bill-row-label" style="color: white; font-weight: 600;">Final Balance:</span><span class="bill-bal-val">₹${totalCalculated.toFixed(2)}</span></div>`;
    }

    // Add Empty Boxes Summary natively matched to Cash style
    const emp = getVal('empty');
    const oldEmp = getVal('oldEmpty');
    const empRet = getVal('emptyReturn');
    const balEmp = getVal('balanceEmpty');

    if (emp > 0 || oldEmp > 0 || empRet > 0 || balEmp > 0) {
        html += `<div style="margin-top: 1.5rem; border-top: 2px dashed rgba(255,255,255,0.3); padding-top: 1rem;">`;
        html += `<div style="font-weight: bold; margin-bottom: 0.5rem; color: #fbbf24;">📦 Empty Boxes</div>`;
        
        if (emp > 0) html += `<div class="bill-row"><span class="bill-row-label">Total Empty Today:</span><span class="bill-row-val">${emp}</span></div>`;
        if (oldEmp > 0) html += `<div class="bill-row"><span class="bill-row-label">Old Empty Balance:</span><span class="bill-row-val">${oldEmp}</span></div>`;
        if (empRet > 0) html += `<div class="bill-row"><span class="bill-row-label">Empty Returned:</span><span class="bill-row-val">${empRet}</span></div>`;
        
        html += `<div class="bill-row" style="margin-top: 0.5rem; border-top: 1px dotted rgba(255,255,255,0.2); padding-top: 0.5rem;"><span class="bill-row-label" style="color: white; font-weight: 600;">Final Empty Balance:</span><span class="bill-bal-val" style="color: #fbbf24;">${balEmp}</span></div>`;
        html += `</div>`;
    }

    html += `</div>`;
    html += `<div class="bill-footer">Thank you for your business! 🎉</div>`;

    if (receiptContent && billModal) {
        receiptContent.innerHTML = html;
        billModal.classList.remove('hidden');
    }
}

// Generate and trigger download of the receipt as PDF using html2pdf
function downloadPDF() {
    const element = document.getElementById('receipt-content');
    if (!element) return;

    // Apply printer-friendly styling overrides
    element.classList.add('pdf-mode');

    // Get date and shop name for filename
    const dateVal = dateInput.value || 'bill';
    let displayDate = dateVal;
    if (dateVal) {
        const parts = dateVal.split('-');
        if (parts.length === 3) displayDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
    }

    const shopNameEl = element.querySelector('.bill-shop');
    const shopName = shopNameEl ? shopNameEl.innerText.replace(/^To:\s*/i, '').trim() : 'shop';
    const filename = `${shopName.replace(/\s+/g, '_')}_Bill_${displayDate}.pdf`;

    // Options configuration matching white paper receipt theme
    const opt = {
        margin:       [0.4, 0.4, 0.4, 0.4],
        filename:     filename,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { 
            scale: 2, 
            useCORS: true, 
            backgroundColor: '#ffffff' // Crisp white background for print
        },
        jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    // Trigger download and revert style changes after processing
    html2pdf().set(opt).from(element).save().then(() => {
        element.classList.remove('pdf-mode');
    }).catch(err => {
        console.error(err);
        element.classList.remove('pdf-mode');
    });
}

// Helpers for Offline local cache storage
function updateLocalCachedRecord(date, shopName, newRecord, isDelete = false) {
    const cached = localStorage.getItem(`cached_records_${date}`);
    let data = cached ? JSON.parse(cached) : [];

    if (isDelete) {
        data = data.filter(r => r.shopName !== shopName);
    } else {
        const idx = data.findIndex(r => r.shopName === shopName);
        if (idx >= 0) {
            data[idx] = newRecord;
        } else {
            data.push(newRecord);
        }
    }
    localStorage.setItem(`cached_records_${date}`, JSON.stringify(data));
}

// Unused offline caching helpers removed.

// Extract bill details and share as PDF via WhatsApp, fallback to wa.me link with text summary
function shareWhatsApp() {
    const element = document.getElementById('receipt-content');
    if (!element) return;

    // Apply printer-friendly styling overrides
    element.classList.add('pdf-mode');

    // Get date and shop name for filename
    const dateVal = dateInput.value || 'bill';
    let displayDate = dateVal;
    if (dateVal) {
        const parts = dateVal.split('-');
        if (parts.length === 3) displayDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
    }

    const shopNameEl = element.querySelector('.bill-shop');
    const shopName = shopNameEl ? shopNameEl.innerText.replace(/^To:\s*/i, '').trim() : 'shop';
    const filename = `${shopName.replace(/\s+/g, '_')}_Bill_${displayDate}.pdf`;

    // Options configuration matching white paper receipt theme
    const opt = {
        margin:       [0.4, 0.4, 0.4, 0.4],
        filename:     filename,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { 
            scale: 2, 
            useCORS: true, 
            backgroundColor: '#ffffff' // Crisp white background for print
        },
        jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    // Helper to generate the text fallback message
    const getTextMessage = () => {
        let textMsg = `🍉 *${getCompanyName().toUpperCase()} INVOICE* 🍉\n`;
        textMsg += `-------------------------\n`;
        textMsg += `*Shop Name:* ${shopName}\n`;
        textMsg += `*Date:* ${displayDate}\n`;
        textMsg += `-------------------------\n\n`;

        const rows = element.querySelectorAll('.bill-table tbody tr');
        if (rows.length > 0) {
            textMsg += `*Fruit Items Purchased:*\n`;
            rows.forEach(row => {
                const item = row.querySelector('.bill-item')?.innerText.trim() || '';
                const rate = row.querySelector('.bill-rate')?.innerText.trim() || '';
                const amt = row.querySelector('.bill-amt')?.innerText.trim() || '';
                textMsg += `• ${item}: ${rate} ➔ ${amt}\n`;
            });
            textMsg += `\n`;
        }

        const summaryRows = element.querySelectorAll('.bill-summary > .bill-row');
        summaryRows.forEach(row => {
            const label = row.querySelector('.bill-row-label')?.innerText.trim() || '';
            const valEl = row.querySelector('.bill-total-val, .bill-row-val, .bill-bal-val');
            const val = valEl ? valEl.innerText.trim() : '';
            textMsg += `• *${label}* ${val}\n`;
        });
        textMsg += `\n`;

        const emptyBoxSection = element.querySelector('div[style*="dashed"]');
        if (emptyBoxSection) {
            textMsg += `📦 *Empty Boxes Summary:*\n`;
            const emptyRows = emptyBoxSection.querySelectorAll('.bill-row');
            emptyRows.forEach(row => {
                const label = row.querySelector('.bill-row-label')?.innerText.trim() || '';
                const valEl = row.querySelector('.bill-row-val, .bill-bal-val');
                const val = valEl ? valEl.innerText.trim() : '';
                textMsg += `• *${label}* ${val}\n`;
            });
            textMsg += `\n`;
        }

        textMsg += `-------------------------\n`;
        textMsg += `Thank you for your business! 🎉`;
        return textMsg;
    };

    // Check if Web Share API with files is supported (e.g. mobile devices)
    const isMobileShareSupported = navigator.canShare && navigator.share;

    if (isMobileShareSupported) {
        // Generate PDF as blob and trigger native Web Share
        html2pdf().set(opt).from(element).outputPdf('blob').then((pdfBlob) => {
            element.classList.remove('pdf-mode');
            const pdfFile = new File([pdfBlob], filename, { type: 'application/pdf' });

            if (navigator.canShare({ files: [pdfFile] })) {
                navigator.share({
                    files: [pdfFile],
                    title: `${shopName} Bill - ${displayDate}`,
                    text: `Here is the bill for ${shopName}.`
                }).catch(err => {
                    console.error("Web Share failed, fallback to direct text link:", err);
                    triggerTextLink();
                });
            } else {
                triggerTextLink();
            }
        }).catch(err => {
            console.error("PDF generation failed, fallback to text link:", err);
            element.classList.remove('pdf-mode');
            triggerTextLink();
        });
    } else {
        // Desktop fallback: Download the PDF AND open WhatsApp text chat
        element.classList.remove('pdf-mode');
        
        // Trigger automated PDF download first
        downloadPDF();

        // Inform user they can attach the downloaded PDF in the opened chat
        showAlert("Receipt PDF downloaded! Opening WhatsApp...", "info");
        
        setTimeout(triggerTextLink, 1000);
    }

    function triggerTextLink() {
        const savedPhone = localStorage.getItem(`shop_phone_${shopName}`) || '';
        const phone = prompt(`Enter WhatsApp number for '${shopName}' (e.g. 10-digit number like 9876543210):`, savedPhone);
        
        if (phone === null) return; // User cancelled
        
        let cleanPhone = phone.replace(/[^0-9]/g, '');
        if (cleanPhone.length === 10) {
            cleanPhone = '91' + cleanPhone;
        }
        
        if (cleanPhone.trim() !== '') {
            localStorage.setItem(`shop_phone_${shopName}`, cleanPhone);
        }

        const message = getTextMessage();
        const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
    }
}