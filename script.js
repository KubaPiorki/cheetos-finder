// ============================================================
// 🔥 CHEETOS FINDER v2.2 - PEŁNY SKRYPT
// ============================================================

// 🔐 SYSTEM LICENCJI
const VALID_LICENSE = 'FREE';

// Lista plików z danymi
const dataFiles = [
    'data/4LAST.txt',
    'data/acehcf.txt',
    'data/anaffa-moon.txt',
    'data/anarchiagg.txt',
    'data/Anarchiapracsaturnhub.pl.txt',
    'data/anarchiapracticeibanbox.pl.txt',
    'data/AppleMC.txt',
    'data/arivi.pl.txt',
    'data/BANBOX.txt',
    'data/bankmc.txt',
    'data/byczek.6mc.pl.txt',
    'data/castpvp & casthub priv.txt',
    'data/chromemc.txt',
    'data/dermc-leak.txt',
    'data/fajnemc.txt',
    'data/hitmc.pl.txt',
    'data/keyhc.txt',
    'data/lolowcia.txt',
    'data/LuckyHc.txt',
    'data/majkrafci.txt',
    'data/maplecraft (1).txt',
    'data/maplecraft.txt',
    'data/MCStyles-New (1).txt',
    'data/MCStyles-New.txt',
    'data/mcstyles.txt',
    'data/melonmc.txt',
    'data/MhCore.txt',
    'data/minecraftstresser.txt',
    'data/mineman (1).txt',
    'data/mineman.ts.txt',
    'data/mineman.txt',
    'data/mineserwer.txt',
    'data/minestar-skypvp.txt',
    'data/Minestar.txt',
    'data/mydrop.pl.txt',
    'data/NEW_BlueBox.6Mc.PL.txt',
    'data/ninjabox.txt',
    'data/noname.txt',
    'data/nusi.txt',
    'data/onemc (1).txt',
    'data/onemc.txt',
    'data/paladium-pvp.fr.txt',
    'data/private (1).txt',
    'data/private-13 (1).txt',
    'data/private-13.txt',
    'data/private-2.txt',
    'data/private-20.txt',
    'data/private-3 (1).txt',
    'data/private-3.txt',
    'data/private-4 (1).txt',
    'data/private-4.txt',
    'data/private-5 (1).txt',
    'data/private-5.txt',
    'data/private-6 (1).txt',
    'data/private-6.txt',
    'data/private-8 (1).txt',
    'data/private-8.txt',
    'data/private.txt',
    'data/rapy.txt',
    'data/Tabhub.txt',
    'data/TABMC.txt',
    'data/Teamspeak-Minemenclub.txt',
    'data/teamspeak-pacann.txt',
    'data/teamspeak-pionas.txt',
    'data/tickmc.txt',
    'data/tiermc.txt',
    'data/ts_ddosboy.txt',
    'data/ts_dzielnica.txt',
    'data/ts_gods.txt',
    'data/ts_GUNS.txt',
    'data/ts_margiela.txt',
    'data/ts_messi.txt',
    'data/ts_mobil.txt',
    'data/verhc.6mc.pl.txt',
    'data/vermc.pl.txt',
    'data/vortexmc.txt',
    'data/xtraphc.txt',
    'data/ziemiamc.txt'
];

// Zmienne globalne
let currentIP = '';
let pingInterval = null;
let pingCount = 0;

// ============================================================
// 🔐 SYSTEM LICENCJI
// ============================================================

// Sprawdź czy już zalogowany
window.addEventListener('load', function() {
    const savedLicense = localStorage.getItem('cheetos_license');
    
    if (savedLicense === VALID_LICENSE) {
        showMainApp();
    }
    
    // Ustaw liczbę plików
    const fileCountEl = document.getElementById('fileCount');
    if (fileCountEl) {
        fileCountEl.textContent = dataFiles.length;
    }
    
    console.log('🔥 CHEETOS FINDER v2.2 załadowany!');
    console.log('📂 Plików do przeszukania: ' + dataFiles.length);
});

// Enter w polu licencji
document.addEventListener('DOMContentLoaded', function() {
    const licenseInput = document.getElementById('licenseInput');
    if (licenseInput) {
        licenseInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                checkLicense();
            }
        });
    }
});

// Sprawdź licencję
function checkLicense() {
    const licenseInput = document.getElementById('licenseInput');
    const licenseBtn = document.getElementById('licenseBtn');
    const licenseError = document.getElementById('licenseError');
    const licenseSuccess = document.getElementById('licenseSuccess');
    
    const input = licenseInput.value.trim().toUpperCase();
    
    // Ukryj poprzednie komunikaty
    licenseError.classList.add('hidden');
    licenseSuccess.classList.add('hidden');
    
    if (input === VALID_LICENSE) {
        // ✅ Poprawna licencja
        licenseSuccess.classList.remove('hidden');
        licenseBtn.disabled = true;
        licenseInput.disabled = true;
        
        // Zapisz w localStorage
        localStorage.setItem('cheetos_license', VALID_LICENSE);
        
        // Przejdź do aplikacji po 1.5s
        setTimeout(function() {
            showMainApp();
        }, 1500);
        
        console.log('✅ Licencja aktywowana!');
    } else {
        // ❌ Błędna licencja
        licenseError.classList.remove('hidden');
        licenseInput.style.animation = 'shake 0.3s ease';
        
        setTimeout(function() {
            licenseInput.style.animation = '';
        }, 300);
        
        console.log('❌ Nieprawidłowa licencja: ' + input);
    }
}

// Pokaż główną aplikację
function showMainApp() {
    const licenseScreen = document.getElementById('licenseScreen');
    const mainApp = document.getElementById('mainApp');
    
    if (licenseScreen) licenseScreen.classList.add('hidden');
    if (mainApp) mainApp.classList.remove('hidden');
    
    // Focus na nick input
    setTimeout(function() {
        const nickInput = document.getElementById('nickInput');
        if (nickInput) nickInput.focus();
    }, 100);
}

// Wyloguj
function logout() {
    localStorage.removeItem('cheetos_license');
    location.reload();
}

// ============================================================
// 🔍 WYSZUKIWANIE NICKÓW
// ============================================================

// Enter w polu wyszukiwania
document.addEventListener('DOMContentLoaded', function() {
    const nickInput = document.getElementById('nickInput');
    if (nickInput) {
        nickInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                searchNick();
            }
        });
    }
});

// ESC zamyka modal
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeModal();
    }
});

// Główna funkcja wyszukiwania
async function searchNick() {
    const nickInput = document.getElementById('nickInput');
    const searchBtn = document.getElementById('searchBtn');
    const loading = document.getElementById('loading');
    const notFound = document.getElementById('notFound');
    const error = document.getElementById('error');
    
    const nick = nickInput.value.trim();
    
    // Walidacja
    if (!nick) {
        showError('Wpisz nick!');
        return;
    }
    
    // Reset i pokaż ładowanie
    hideAllMessages();
    loading.classList.remove('hidden');
    searchBtn.disabled = true;
    
    console.log('🔍 Szukam: ' + nick);
    
    let found = false;
    
    // Przeszukaj każdy plik
    for (let i = 0; i < dataFiles.length; i++) {
        const file = dataFiles[i];
        
        try {
            const response = await fetch(file);
            
            if (!response.ok) continue;
            
            const text = await response.text();
            const lines = text.split('\n');
            
            for (let j = 0; j < lines.length; j++) {
                const line = lines[j].trim();
                
                if (!line) continue;
                
                // Rozdziel nick:ip (obsługuje różne separatory)
                const parts = line.split(/[:;,\t]+/);
                
                if (parts.length >= 2) {
                    const fileNick = parts[0].trim();
                    const fileIP = parts[1].trim();
                    
                    // Porównaj (case insensitive)
                    if (fileNick.toLowerCase() === nick.toLowerCase()) {
                        found = true;
                        currentIP = fileIP;
                        
                        console.log('✅ ZNALEZIONO: ' + fileNick + ' -> ' + fileIP + ' w ' + file);
                        
                        await delay(500);
                        
                        const fileName = file.replace('data/', '');
                        showResults(fileNick, fileIP, fileName);
                        
                        searchBtn.disabled = false;
                        return;
                    }
                }
            }
            
        } catch (err) {
            // Plik nie istnieje lub błąd - pomijamy
            console.warn('⚠️ Błąd przy pliku: ' + file);
        }
    }
    
    // Nie znaleziono
    if (!found) {
        console.log('❌ Nie znaleziono: ' + nick);
        await delay(500);
        showNotFound();
    }
    
    searchBtn.disabled = false;
}

// ============================================================
// 📊 WYŚWIETLANIE WYNIKÓW
// ============================================================

function showResults(nick, ip, file) {
    hideAllMessages();
    
    const resultModal = document.getElementById('resultModal');
    const resultNick = document.getElementById('resultNick');
    const resultIP = document.getElementById('resultIP');
    const resultFile = document.getElementById('resultFile');
    const pingResult = document.getElementById('pingResult');
    const pingBtn = document.getElementById('pingBtn');
    
    // Ustaw wartości
    resultNick.textContent = nick;
    resultIP.textContent = ip;
    resultFile.textContent = file;
    currentIP = ip;
    
    // Reset pingu
    stopPing();
    if (pingResult) pingResult.classList.add('hidden');
    if (pingBtn) {
        pingBtn.innerHTML = '<span class="ping-btn-icon">📡</span><span class="ping-btn-text">START PING</span>';
        pingBtn.classList.remove('stop');
    }
    
    // Pokaż modal
    resultModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    
    // Fajerwerki!
    createFireworks();
}

function closeModal() {
    const resultModal = document.getElementById('resultModal');
    
    stopPing();
    
    if (resultModal) {
        resultModal.classList.add('hidden');
    }
    document.body.style.overflow = '';
}

function showNotFound() {
    hideAllMessages();
    const notFound = document.getElementById('notFound');
    if (notFound) notFound.classList.remove('hidden');
}

function showError(message) {
    hideAllMessages();
    const error = document.getElementById('error');
    const errorMessage = document.getElementById('errorMessage');
    
    if (errorMessage) errorMessage.textContent = message;
    if (error) error.classList.remove('hidden');
}

function hideAllMessages() {
    const elements = ['loading', 'notFound', 'error', 'resultModal'];
    
    elements.forEach(function(id) {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });
}

// ============================================================
// 📡 SYSTEM PING
// ============================================================

function togglePing() {
    if (pingInterval) {
        stopPing();
    } else {
        startPing();
    }
}

function startPing() {
    if (!currentIP) return;
    
    const pingResult = document.getElementById('pingResult');
    const pingConsole = document.getElementById('pingConsole');
    const pingBtn = document.getElementById('pingBtn');
    
    pingCount = 0;
    
    // Pokaż konsolę
    if (pingResult) pingResult.classList.remove('hidden');
    if (pingConsole) pingConsole.innerHTML = '';
    
    // Zmień przycisk na STOP
    if (pingBtn) {
        pingBtn.innerHTML = '<span class="ping-btn-icon">⏹️</span><span class="ping-btn-text">STOP PING</span>';
        pingBtn.classList.add('stop');
    }
    
    // Pierwsza linia
    addPingLine('🚀 Rozpoczynam ping do ' + currentIP + '...', '');
    addPingLine('─'.repeat(45), '');
    
    // Pierwszy ping od razu
    doPing();
    
    // Potem co 2 sekundy
    pingInterval = setInterval(doPing, 2000);
}

function stopPing() {
    const pingBtn = document.getElementById('pingBtn');
    
    if (pingInterval) {
        clearInterval(pingInterval);
        pingInterval = null;
        
        addPingLine('─'.repeat(45), '');
        addPingLine('⏹️ Ping zatrzymany. Wysłano: ' + pingCount + ' pakietów', '');
    }
    
    if (pingBtn) {
        pingBtn.innerHTML = '<span class="ping-btn-icon">📡</span><span class="ping-btn-text">START PING</span>';
        pingBtn.classList.remove('stop');
    }
}

async function doPing() {
    pingCount++;
    const startTime = Date.now();
    
    addPingLine('📤 Ping #' + pingCount + ' do ' + currentIP + '...', '');
    
    try {
        const isReachable = await checkIP(currentIP);
        const endTime = Date.now();
        const pingTime = endTime - startTime;
        
        if (isReachable) {
            addPingLine('✅ Odpowiedź z ' + currentIP + ': czas=' + pingTime + 'ms TTL=64', 'online');
        } else {
            addPingLine('❌ Brak odpowiedzi z ' + currentIP + ' (timeout)', 'offline');
        }
    } catch (err) {
        addPingLine('❌ Błąd: ' + currentIP + ' nieosiągalny', 'offline');
    }
    
    // Auto-scroll
    const pingConsole = document.getElementById('pingConsole');
    if (pingConsole) {
        pingConsole.scrollTop = pingConsole.scrollHeight;
    }
}

async function checkIP(ip) {
    // Walidacja formatu IP
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(ip)) {
        return false;
    }
    
    // Sprawdź czy każdy oktet jest 0-255
    const octets = ip.split('.');
    for (let i = 0; i < octets.length; i++) {
        const num = parseInt(octets[i]);
        if (num < 0 || num > 255) {
            return false;
        }
    }
    
    // Sprawdź czy to prywatne IP
    if (isPrivateIP(ip)) {
        return false;
    }
    
    // Sprawdź przez API
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(function() {
            controller.abort();
        }, 3000);
        
        const response = await fetch('http://ip-api.com/json/' + ip + '?fields=status,country,city,isp', {
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
            const data = await response.json();
            if (data.status === 'success') {
                return true;
            }
        }
    } catch (e) {
        // API nie odpowiedziało
    }
    
    return false;
}

function isPrivateIP(ip) {
    const parts = ip.split('.').map(Number);
    
    // 10.0.0.0 - 10.255.255.255
    if (parts[0] === 10) return true;
    
    // 172.16.0.0 - 172.31.255.255
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    
    // 192.168.0.0 - 192.168.255.255
    if (parts[0] === 192 && parts[1] === 168) return true;
    
    // 127.0.0.0 - 127.255.255.255 (localhost)
    if (parts[0] === 127) return true;
    
    // 0.0.0.0
    if (parts[0] === 0) return true;
    
    return false;
}

function addPingLine(text, status) {
    const pingConsole = document.getElementById('pingConsole');
    if (!pingConsole) return;
    
    const line = document.createElement('div');
    line.className = 'ping-line';
    
    if (status) {
        line.classList.add(status);
    }
    
    // Timestamp
    const now = new Date();
    const time = now.toLocaleTimeString('pl-PL');
    
    line.innerHTML = '<span class="ping-time">[' + time + ']</span> ' + text;
    
    pingConsole.appendChild(line);
    
    // Limit 100 linii
    while (pingConsole.children.length > 100) {
        pingConsole.removeChild(pingConsole.firstChild);
    }
    
    // Scroll na dół
    pingConsole.scrollTop = pingConsole.scrollHeight;
}

// ============================================================
// 📋 KOPIOWANIE IP
// ============================================================

function copyIP() {
    if (!currentIP) return;
    
    navigator.clipboard.writeText(currentIP).then(function() {
        // Znajdź przycisk kopiowania
        const copyBtns = document.querySelectorAll('.copy-btn, .copy-mini');
        
        copyBtns.forEach(function(btn) {
            const originalHTML = btn.innerHTML;
            
            if (btn.classList.contains('copy-mini')) {
                btn.innerHTML = '✅';
            } else {
                btn.innerHTML = '<span class="btn-icon">✅</span><span>Skopiowano!</span>';
            }
            
            btn.style.background = 'linear-gradient(135deg, #00aa66 0%, #008855 100%)';
            
            setTimeout(function() {
                btn.innerHTML = originalHTML;
                btn.style.background = '';
            }, 2000);
        });
        
        console.log('📋 Skopiowano IP: ' + currentIP);
    }).catch(function(err) {
        console.error('❌ Błąd kopiowania:', err);
    });
}

// ============================================================
// 🎆 EFEKTY WIZUALNE
// ============================================================

function createFireworks() {
    const colors = ['#ff6600', '#ffcc00', '#ff3300', '#ff9900', '#ffff00'];
    
    for (let i = 0; i < 30; i++) {
        setTimeout(function() {
            const particle = document.createElement('div');
            
            particle.style.position = 'fixed';
            particle.style.width = (Math.random() * 10 + 5) + 'px';
            particle.style.height = particle.style.width;
            particle.style.background = colors[Math.floor(Math.random() * colors.length)];
            particle.style.borderRadius = '50%';
            particle.style.pointerEvents = 'none';
            particle.style.zIndex = '9999';
            particle.style.left = (Math.random() * 100) + 'vw';
            particle.style.top = (Math.random() * 100) + 'vh';
            particle.style.animation = 'firework 1.2s ease-out forwards';
            particle.style.boxShadow = '0 0 10px ' + colors[Math.floor(Math.random() * colors.length)];
            
            document.body.appendChild(particle);
            
            setTimeout(function() {
                particle.remove();
            }, 1200);
        }, i * 30);
    }
}

// ============================================================
// 🛠️ FUNKCJE POMOCNICZE
// ============================================================

function delay(ms) {
    return new Promise(function(resolve) {
        setTimeout(resolve, ms);
    });
}

// ============================================================
// 🎨 DYNAMICZNE STYLE
// ============================================================

const dynamicStyles = document.createElement('style');
dynamicStyles.textContent = `
    @keyframes firework {
        0% {
            transform: scale(0);
            opacity: 1;
        }
        100% {
            transform: scale(3);
            opacity: 0;
        }
    }
    
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-10px); }
        75% { transform: translateX(10px); }
    }
`;
document.head.appendChild(dynamicStyles);

// ============================================================
// 📝 LOGI KONSOLI
// ============================================================

console.log('');
console.log('%c 🔥 CHEETOS FINDER v2.2 🔥 ', 'background: #ff6600; color: white; font-size: 20px; font-weight: bold; padding: 10px;');
console.log('%c Powered by Lava 🌋 ', 'background: #cc3300; color: white; font-size: 12px; padding: 5px;');
console.log('');
console.log('📂 Pliki do przeszukania: ' + dataFiles.length);
console.log('🔑 Klucz licencji: FREE');
console.log('💬 Discord: https://discord.gg/kfay5sE34U');
console.log('');