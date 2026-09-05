// Frontend ping client for main UI (public/js/ping.js)
// Adds: ping single, ping multiple, auto-ping support used by public/index.html

const ipInput = document.getElementById('ipInput');
const searchBtn = document.getElementById('searchBtn');
const resultsTableBody = document.getElementById('tableBody');
const clearBtn = document.getElementById('clearBtn');

let autoPingHandle = null;
let autoInterval = 30000; // default 30s

function ipListFromInput() {
  const v = (ipInput && ipInput.value) || '';
  return v.split(/\s*[\n,]+\s*/).map(s => s.trim()).filter(Boolean);
}

function renderRow(row) {
  const tr = document.createElement('tr');
  tr.innerHTML = `<td>${row.ip}</td><td>${row.alive ? '<span style="color:green">OK</span>' : '<span style="color:red">DOWN</span>'}</td><td>${row.ping_ms ?? row.time ?? '-'}</td><td><button class="mini" data-ip="${row.ip}">Ping</button></td>`;
  const btn = tr.querySelector('button');
  btn.addEventListener('click', () => {
    pingSingle(row.ip).then(r => {
      // update row
      tr.children[1].innerHTML = r.alive ? '<span style="color:green">OK</span>' : '<span style="color:red">DOWN</span>';
      tr.children[2].textContent = r.ping_ms ?? r.time ?? '-';
    });
  });
  resultsTableBody.appendChild(tr);
}

async function pingSingle(ip) {
  try {
    const res = await fetch(`/api/ping?ip=${encodeURIComponent(ip)}`);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  } catch (err) {
    return { ip, alive: false, error: err.message };
  }
}

async function pingAll() {
  const ips = ipListFromInput();
  if (!ips.length) return alert('Wprowadź przynajmniej jedno IP');
  try {
    const res = await fetch('/api/ping-multi', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ips, timeout: 3, concurrency: 10 })
    });
    if (!res.ok) throw new Error(await res.text());
    const json = await res.json();
    // clear table
    resultsTableBody.innerHTML = '';
    json.forEach(r => renderRow(r));
  } catch (err) {
    alert('Błąd: ' + err.message);
  }
}

searchBtn && searchBtn.addEventListener('click', async () => {
  const ips = ipListFromInput();
  if (!ips.length) return alert('Wprowadź IP');
  // if single IP, ping single and render
  if (ips.length === 1) {
    const r = await pingSingle(ips[0]);
    resultsTableBody.innerHTML = '';
    renderRow(r);
    return;
  }
  // multiple
  await pingAll();
});

clearBtn && clearBtn.addEventListener('click', () => {
  resultsTableBody.innerHTML = '';
});

// Auto Ping control example: start/stop functions can be called from UI or dev console
function startAutoPing(intervalMs = 30000) {
  if (autoPingHandle) return;
  autoInterval = intervalMs;
  pingAll();
  autoPingHandle = setInterval(pingAll, autoInterval);
}

function stopAutoPing() {
  if (!autoPingHandle) return;
  clearInterval(autoPingHandle);
  autoPingHandle = null;
}

// expose globally
window.startAutoPing = startAutoPing;
window.stopAutoPing = stopAutoPing;
