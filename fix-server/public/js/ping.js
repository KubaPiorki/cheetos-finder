// Frontend for fix-server: simple ping UI

const $ = id => document.getElementById(id);
const ipInput = $('ip-input');
const resultsEl = $('results');
const pingOneBtn = $('ping-one');
const pingAllBtn = $('ping-all');
const startAutoBtn = $('start-auto');
const stopAutoBtn = $('stop-auto');
const intervalInput = $('interval');
const timeoutInput = $('timeout');

let autoHandle = null;

function parseIps(text) {
  if (!text) return [];
  // split by newline or comma
  return text
    .split(/\s*[\n,]+\s*/)
    .map(s => s.trim())
    .filter(Boolean);
}

function showResults(list) {
  resultsEl.innerHTML = '';
  if (!list.length) { resultsEl.textContent = 'Brak wyników.'; return; }
  list.forEach(r => {
    const div = document.createElement('div');
    div.className = 'ip-item';
    if (r.error) {
      div.innerHTML = `<strong>${r.ip}</strong> — <span class="dead">błąd: ${r.error}</span>`;
    } else if (r.alive) {
      div.innerHTML = `<strong>${r.ip}</strong> — <span class="alive">ok ${r.time} ms</span>`;
    } else {
      div.innerHTML = `<strong>${r.ip}</strong> — <span class="dead">timeout / brak odpowiedzi</span>`;
    }
    resultsEl.appendChild(div);
  });
}

async function pingOne() {
  const ips = parseIps(ipInput.value);
  if (!ips.length) return alert('Wprowadź przynajmniej jedno IP');
  const ip = ips[0];
  try {
    const timeout = parseInt(timeoutInput.value || '5', 10);
    const res = await fetch(`/api/ping?ip=${encodeURIComponent(ip)}&timeout=${timeout}`);
    if (!res.ok) throw new Error(await res.text());
    const json = await res.json();
    showResults([json]);
  } catch (err) {
    showResults([{ ip, error: err.message }]);
  }
}

async function pingAll() {
  const ips = parseIps(ipInput.value);
  if (!ips.length) return alert('Wprowadź przynajmniej jedno IP');
  try {
    const timeout = parseInt(timeoutInput.value || '5', 10);
    const res = await fetch('/api/ping-multi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ips, timeout, concurrency: 10 })
    });
    if (!res.ok) throw new Error(await res.text());
    const json = await res.json();
    showResults(json);
  } catch (err) {
    showResults(ips.map(ip => ({ ip, error: err.message })));
  }
}

function startAuto() {
  if (autoHandle) return;
  const intervalSec = Math.max(5, parseInt(intervalInput.value || '30', 10));
  // run immediately then interval
  pingAll();
  autoHandle = setInterval(pingAll, intervalSec * 1000);
  startAutoBtn.disabled = true;
  stopAutoBtn.disabled = false;
}

function stopAuto() {
  if (!autoHandle) return;
  clearInterval(autoHandle);
  autoHandle = null;
  startAutoBtn.disabled = false;
  stopAutoBtn.disabled = true;
}

pingOneBtn.addEventListener('click', pingOne);
pingAllBtn.addEventListener('click', pingAll);
startAutoBtn.addEventListener('click', startAuto);
stopAutoBtn.addEventListener('click', stopAuto);

// Allow Ctrl+Enter in textarea to ping first
ipInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
    pingOne();
  }
});
