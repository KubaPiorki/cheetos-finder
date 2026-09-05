// Global variables
let currentUser = null;

// DOM Elements
const loginPage = document.getElementById('loginPage');
const dashboardPage = document.getElementById('dashboardPage');
const loginForm = document.getElementById('loginForm');
const keyInput = document.getElementById('keyInput');
const loginError = document.getElementById('loginError');
const logoutBtn = document.getElementById('logoutBtn');
const settingsBtn = document.getElementById('settingsBtn');
const settingsModal = document.getElementById('settingsModal');
const closeSettings = document.getElementById('closeSettings');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');
const adminOptions = document.getElementById('adminOptions');

// Initialize
window.addEventListener('load', () => {
    // Check if user was logged in (session active but no token in storage)
    if (localStorage.getItem('_session') === 'active') {
        // Token should be in memory from previous session
        // Force re-login for security
        localStorage.removeItem('_session');
        showLoginPage();
    } else {
        showLoginPage();
    }
});

// Login Handler
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.textContent = '';
    
    const key = keyInput.value.trim();
    if (!key) {
        loginError.textContent = 'Klucz jest wymagany';
        return;
    }

    try {
        const result = await API.login(key);
        
        if (result.success) {
            currentUser = result;
            loadDashboard();
            showDashboardPage();
            keyInput.value = ''; // Clear input
        } else {
            loginError.textContent = result.error || 'Błąd logowania';
        }
    } catch (err) {
        console.error('Login error:', err);
        loginError.textContent = 'Błąd połączenia z serwerem';
    }
});

// Logout Handler
logoutBtn.addEventListener('click', () => {
    authToken = null;
    currentUser = null;
    localStorage.removeItem('_session');
    showLoginPage();
});

// Page Navigation
function showLoginPage() {
    loginPage.classList.add('active');
    dashboardPage.classList.remove('active');
    keyInput.focus();
}

function showDashboardPage() {
    loginPage.classList.remove('active');
    dashboardPage.classList.add('active');
}

// Load Dashboard Data
async function loadDashboard() {
    try {
        const licenseInfo = await API.getLicenseInfo();
        
        // Update UI with license info
        updateLicenseCard(licenseInfo);
        updateSettingsModal(licenseInfo);
        
        // Show admin options if admin
        if (currentUser.is_admin) {
            adminOptions.style.display = 'flex';
            setupAdminHandlers();
        } else {
            adminOptions.style.display = 'none';
        }
    } catch (err) {
        console.error('Error loading dashboard:', err);
    }
}

// Update License Card
function updateLicenseCard(licenseInfo) {
    const statusEl = document.getElementById('licenseStatus');
    const expiresEl = document.getElementById('expiresAt');
    const daysEl = document.getElementById('daysRemaining');
    const createdEl = document.getElementById('createdAt');
    const progressEl = document.getElementById('licenseProgress');

    // Format date
    const expiresDate = new Date(licenseInfo.expires_at);
    const createdDate = new Date(licenseInfo.created_at);
    const now = new Date();

    // Status
    const status = licenseInfo.status === 'active' ? 'Aktywna' : 'Nieaktywna';
    statusEl.textContent = status;
    statusEl.classList.remove('expired', 'warning');
    
    if (licenseInfo.status !== 'active') {
        statusEl.classList.add('expired');
    } else if (licenseInfo.days_remaining < 7) {
        statusEl.classList.add('warning');
    }

    // Expires
    expiresEl.textContent = expiresDate.toLocaleDateString('pl-PL', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    // Days remaining
    daysEl.textContent = `${licenseInfo.days_remaining} dni`;

    // Created
    createdEl.textContent = createdDate.toLocaleDateString('pl-PL', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    // Progress
    const percentage = Math.max(0, (licenseInfo.days_remaining / licenseInfo.days_valid) * 100);
    progressEl.style.width = percentage + '%';
}

// Update Settings Modal
function updateSettingsModal(licenseInfo) {
    // Generate UUID from key ID if needed (using timestamp-based)
    const accountUUID = `fm-${licenseInfo.created_at.substring(0, 10)}-${Math.random().toString(36).substr(2, 9)}`;
    document.getElementById('uuidText').textContent = accountUUID;

    const createdDate = new Date(licenseInfo.created_at);
    document.getElementById('accountCreated').textContent = createdDate.toLocaleDateString('pl-PL', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    document.getElementById('lastLogin').textContent = new Date().toLocaleDateString('pl-PL', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    document.getElementById('licenseValidity').textContent = `${licenseInfo.days_valid} dni`;

    const expiresDate = new Date(licenseInfo.expires_at);
    document.getElementById('licenseExpires').textContent = expiresDate.toLocaleDateString('pl-PL', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    document.getElementById('licenseDaysLeft').textContent = `${licenseInfo.days_remaining} dni`;
    document.getElementById('boundIP').textContent = 'Ukryte dla bezpieczeństwa' || 'Nie przypisane';
    document.getElementById('ipStatus').textContent = licenseInfo.status === 'active' ? 'Aktywne' : 'Nieaktywne';
}

// Settings Modal Handlers
settingsBtn.addEventListener('click', () => {
    settingsModal.classList.add('active');
});

closeSettings.addEventListener('click', () => {
    settingsModal.classList.remove('active');
});

closeSettingsBtn.addEventListener('click', () => {
    settingsModal.classList.remove('active');
});

// Copy to clipboard
document.getElementById('copyUUID').addEventListener('click', function() {
    const text = document.getElementById('uuidText').textContent;
    copyToClipboard(text, this);
});

function copyToClipboard(text, btn) {
    navigator.clipboard.writeText(text).then(() => {
        btn.classList.add('copied');
        setTimeout(() => btn.classList.remove('copied'), 300);
    });
}

// Search Handlers
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const searchResults = document.getElementById('searchResults');

searchBtn.addEventListener('click', async () => {
    const query = searchInput.value.trim();
    if (!query) return;

    searchResults.innerHTML = '<p>Szukanie...</p>';

    try {
        // Check if it's an IP or nickname
        const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        
        let result;
        if (ipRegex.test(query)) {
            result = await API.searchByIP(query);
        } else {
            result = await API.searchPlayer(query);
        }

        if (result.error) {
            searchResults.innerHTML = `<p class="error-message">${result.error}</p>`;
            return;
        }

        if (result.results) {
            // Multiple results (IP search)
            searchResults.innerHTML = result.results.map(r => `
                <div class="result-card">
                    <div class="result-title">👤 ${r.nickname}</div>
                    <div class="result-info">
                        <span>IP: ${r.ip}</span>
                        <span>Status: ${r.status === 'ping' ? '✅ Ping' : '❌ Timeout'}</span>
                    </div>
                </div>
            `).join('');
        } else {
            // Single result (nickname search)
            const r = result;
            searchResults.innerHTML = `
                <div class="result-card">
                    <div class="result-title">👤 ${r.nickname}</div>
                    <div class="result-info">
                        <span>IP: ${r.ip}</span>
                        <span>Status: ${r.status === 'ping' ? '✅ Ping' : '❌ Timeout'}</span>
                    </div>
                </div>
            `;
        }
    } catch (err) {
        console.error('Search error:', err);
        searchResults.innerHTML = '<p class="error-message">Błąd podczas wyszukiwania</p>';
    }
});

SearchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchBtn.click();
});

// Admin Handlers
function setupAdminHandlers() {
    const licenseGenBtn = document.getElementById('licenseGenBtn');
    const leaksBtn = document.getElementById('leaksBtn');
    const resetIpBtn = document.getElementById('resetIpBtn');

    // License Generator
    licenseGenBtn.addEventListener('click', () => {
        document.getElementById('licenseGenModal').classList.add('active');
    });

    document.getElementById('closeLicenseGen').addEventListener('click', () => {
        document.getElementById('licenseGenModal').classList.remove('active');
    });

    document.getElementById('generateBtn').addEventListener('click', async () => {
        const days = parseInt(document.getElementById('daysInput').value);
        if (isNaN(days) || days < 1 || days > 365) {
            alert('Liczba dni musi być między 1 a 365');
            return;
        }

        try {
            const result = await API.generateKey(days);
            if (result.success) {
                document.getElementById('generatedKeyText').textContent = result.key;
                document.getElementById('keyValidUntil').textContent = 
                    `Ważna do: ${new Date(result.expires_at).toLocaleDateString('pl-PL')}`;
                document.getElementById('generatedKeyContainer').style.display = 'block';

                document.getElementById('copyGeneratedKey').addEventListener('click', function() {
                    copyToClipboard(result.key, this);
                });
            }
        } catch (err) {
            alert('Błąd podczas generowania klucza');
        }
    });

    // Add Leaks
    leaksBtn.addEventListener('click', () => {
        document.getElementById('leaksModal').classList.add('active');
    });

    document.getElementById('closeLeaks').addEventListener('click', () => {
        document.getElementById('leaksModal').classList.remove('active');
    });

    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');

    uploadArea.addEventListener('click', () => fileInput.click());
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.style.background = '#f0f7ff';
    });
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.style.background = '#f9f9f9';
    });
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.style.background = '#f9f9f9';
        if (e.dataTransfer.files.length) {
            handleFileUpload(e.dataTransfer.files[0]);
        }
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length) {
            handleFileUpload(e.target.files[0]);
        }
    });

    async function handleFileUpload(file) {
        if (!file.name.endsWith('.txt')) {
            alert('Tylko pliki .txt są akceptowane');
            return;
        }

        document.getElementById('uploadProgress').style.display = 'block';

        try {
            const result = await API.uploadLeaks(file);
            
            document.getElementById('uploadProgress').style.display = 'none';
            document.getElementById('uploadResults').style.display = 'block';
            document.getElementById('successCount').textContent = result.uploaded;
            document.getElementById('failCount').textContent = result.failed;

            if (result.errors.length) {
                document.getElementById('errorsList').innerHTML = result.errors
                    .map(e => `<div class="error-item">${e}</div>`)
                    .join('');
            }
        } catch (err) {
            alert('Błąd podczas uploadu pliku');
        }
    }

    // Reset IP
    resetIpBtn.addEventListener('click', () => {
        document.getElementById('resetIpModal').classList.add('active');
    });

    document.getElementById('closeResetIp').addEventListener('click', () => {
        document.getElementById('resetIpModal').classList.remove('active');
    });

    document.getElementById('resetBtn').addEventListener('click', async () => {
        const keyId = parseInt(document.getElementById('keyIdInput').value);
        if (isNaN(keyId)) {
            alert('Wpisz prawidłowe ID klucza');
            return;
        }

        try {
            const result = await API.resetIP(keyId);
            const messageEl = document.getElementById('resetMessage');
            
            if (result.success) {
                messageEl.className = 'message success';
                messageEl.textContent = result.message;
            } else {
                messageEl.className = 'message error';
                messageEl.textContent = result.error;
            }
            messageEl.style.display = 'block';
        } catch (err) {
            alert('Błąd podczas resetowania IP');
        }
    });
}

// Close modals on outside click
window.addEventListener('click', (e) => {
    const modals = document.querySelectorAll('.modal.active');
    modals.forEach(modal => {
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    });
});
