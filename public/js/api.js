// API Base URL
const API_BASE = '/api';

// Store token in memory only (not in localStorage for security)
let authToken = null;

// API Methods
const API = {
    async login(key) {
        const res = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ key })
        });
        
        const data = await res.json();
        if (res.ok) {
            authToken = data.token;
            localStorage.setItem('_session', 'active'); // Only mark session as active, no token stored
        }
        return data;
    },

    async getLicenseInfo() {
        const res = await fetch(`${API_BASE}/license/info`, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });
        return res.json();
    },

    async generateKey(days) {
        const res = await fetch(`${API_BASE}/auth/generate-key`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ days })
        });
        return res.json();
    },

    async uploadLeaks(file) {
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch(`${API_BASE}/leaks/upload`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`
            },
            body: formData
        });
        return res.json();
    },

    async searchPlayer(nickname) {
        const res = await fetch(`${API_BASE}/search/player/${encodeURIComponent(nickname)}`, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });
        return res.json();
    },

    async searchByIP(ip) {
        const res = await fetch(`${API_BASE}/search/ip/${encodeURIComponent(ip)}`, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });
        return res.json();
    },

    async resetIP(keyId) {
        const res = await fetch(`${API_BASE}/admin/reset-ip`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ key_id: keyId })
        });
        return res.json();
    },

    async getLicenses() {
        const res = await fetch(`${API_BASE}/admin/licenses`, {
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });
        return res.json();
    },

    async extendLicense(keyId, days) {
        const res = await fetch(`${API_BASE}/license/extend`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ key_id: keyId, days })
        });
        return res.json();
    }
};
