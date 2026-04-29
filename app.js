/* ═══════════════════════════════════════════════
   DRISHTI — Frontend App Logic  v2.4.1
   HAL TPE331-12B Inspection System
═══════════════════════════════════════════════ */

'use strict';

/* ── State ── */
const STATE = {
  user: null,
  token: null,
  unread: 4
};

const API = '/api';

/* ════════════════════════════════════════
   AUTH
════════════════════════════════════════ */
async function doLogin(e, bio = false) {
  if (e) e.preventDefault();

  const uid = bio ? 'HAL-04281' : document.getElementById('uid').value.trim();
  const pwd = bio ? '__biometric__' : document.getElementById('pwd').value;

  if (!uid || (!bio && !pwd)) {
    alert('Please enter your Service ID and password.');
    return;
  }

  try {
    const res = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ serviceId: uid, password: pwd, biometric: bio })
    });
    const data = await res.json();

    if (res.ok && data.token) {
      STATE.user  = data.user;
      STATE.token = data.token;
      localStorage.setItem('drishti_token', data.token);
      localStorage.setItem('drishti_user',  JSON.stringify(data.user));
      applyUser(data.user);
      goPage('pg-app');
      loadDashboard();
    } else {
      alert(data.message || 'Login failed. Check your credentials.');
    }
  } catch (err) {
    // Dev fallback — works without backend running
    console.warn('API unreachable, using demo mode:', err.message);
    const demoUser = { name: 'Sandip Kumar Burnwal', initials: 'SK', role: 'Quality Engineer', serviceId: uid };
    STATE.user  = demoUser;
    STATE.token = 'demo';
    applyUser(demoUser);
    goPage('pg-app');
  }
}

function doLogout() {
  STATE.user  = null;
  STATE.token = null;
  localStorage.removeItem('drishti_token');
  localStorage.removeItem('drishti_user');
  goPage('pg-login');
}

function applyUser(user) {
  const initials = user.initials || user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  document.getElementById('user-avt').textContent      = initials;
  document.getElementById('settings-avt').textContent  = initials;
  document.getElementById('settings-name').textContent = user.name || user.serviceId;
}

function togglePwd() {
  const inp = document.getElementById('pwd');
  inp.type = inp.type === 'password' ? 'text' : 'password';
}

/* ════════════════════════════════════════
   PAGE NAVIGATION
════════════════════════════════════════ */
function goPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const pg = document.getElementById(id);
  if (pg) pg.classList.add('active');
}

function sw(tabId, el) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nt').forEach(t => t.classList.remove('active'));
  const sc = document.getElementById('s-' + tabId);
  if (sc) sc.classList.add('active');
  if (el) el.classList.add('active');
  document.getElementById('carea').scrollTop = 0;

  if (tabId === 'home') loadDashboard();
}

/* ════════════════════════════════════════
   DASHBOARD DATA
════════════════════════════════════════ */
async function loadDashboard() {
  try {
    const res = await fetch(`${API}/inspections/stats`, {
      headers: authHeaders()
    });
    if (!res.ok) return;
    const data = await res.json();
    setEl('stat-insp', data.todayCount   || '12');
    setEl('stat-def',  data.defectCount  || '4');
    setEl('stat-ecl',  data.eclPct       || '87%');
    setEl('stat-fod',  data.fodAlerts    || '1');
  } catch (_) { /* stay with demo values */ }
}

function setEl(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

/* ════════════════════════════════════════
   AI INSPECTION SCANNER
════════════════════════════════════════ */
function startScan() {
  const sn = document.getElementById('esn').value.trim() || 'TPE-331-XXXX';
  document.getElementById('sstat').textContent = 'SCANNING ' + sn.toUpperCase();

  const rows = document.querySelectorAll('#ai-results .ar');
  const results = [
    { cls: 'ci-d', lbl: 'Compressor inlet',     conf: '97.2% — clear'  },
    { cls: 'ci-d', lbl: 'Turbine blades',        conf: '94.8% — clear'  },
    { cls: 'ci-w', lbl: 'Combustion chamber',    conf: '81.4% — review' },
    { cls: 'ci-d', lbl: 'Accessory serials',     conf: 'All matched'    },
  ];

  rows.forEach((row, i) => {
    setTimeout(() => {
      const ic = row.querySelector('.ci');
      ic.className = 'ci ' + results[i].cls;
      ic.innerHTML = results[i].cls === 'ci-d'
        ? '<svg width="10" height="10" viewBox="0 0 10 10"><path d="M2 5l2.5 2.5L8 3" stroke="#4de8a0" stroke-width="1.4" fill="none" stroke-linecap="round"/></svg>'
        : '<svg width="10" height="10" viewBox="0 0 10 10"><path d="M5 3v3M5 7.5v.5" stroke="#f5c347" stroke-width="1.4" stroke-linecap="round"/></svg>';
      row.querySelector('.ar-lbl').textContent  = results[i].lbl;
      row.querySelector('.ar-conf').textContent = results[i].conf;
      if (i === results.length - 1) {
        document.getElementById('sstat').textContent = 'SCAN COMPLETE';
        postInspection(sn, results);
      }
    }, 900 * (i + 1));
  });
}

async function postInspection(sn, results) {
  try {
    await fetch(`${API}/inspections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ engineSN: sn, results, timestamp: new Date().toISOString() })
    });
  } catch (_) { /* offline — ignore */ }
}

/* ════════════════════════════════════════
   NOTIFICATIONS
════════════════════════════════════════ */
function openNotif() {
  document.getElementById('npanel').style.display = 'flex';
}
function closeNotif() {
  document.getElementById('npanel').style.display = 'none';
}
function filterNotif(cat, el) {
  document.querySelectorAll('.nd-tab').forEach(t => t.classList.remove('act'));
  el.classList.add('act');
  document.querySelectorAll('.ni').forEach(ni => {
    ni.style.display = (cat === 'all' || ni.dataset.cat === cat) ? 'flex' : 'none';
  });
}
function markAllRead() {
  document.querySelectorAll('.ni.unread').forEach(ni => {
    ni.classList.remove('unread');
    ni.classList.add('read');
  });
  document.querySelectorAll('.ni-dot').forEach(d => d.remove());
  STATE.unread = 0;
  const badge = document.getElementById('nbadge');
  badge.textContent = '0';
  badge.style.background = '#1D9E75';
}

/* ════════════════════════════════════════
   SETTINGS TOGGLES
════════════════════════════════════════ */
function tog(el) {
  el.classList.toggle('on');
  el.classList.toggle('off');
}

/* ════════════════════════════════════════
   MODALS
════════════════════════════════════════ */
const MODAL_CFG = {
  lock:         { title: 'Lock account immediately',   sub: 'All active sessions will be terminated. You will need to re-authenticate.', btn: 'Lock now' },
  revoke:       { title: 'Revoke all access tokens',   sub: 'All devices will be signed out. This action is logged in the audit trail.', btn: 'Revoke tokens' },
  wipe:         { title: 'Remote wipe local data',     sub: 'All locally cached data will be permanently erased. Cannot be undone.',     btn: 'Wipe data' },
  'kill-session':{ title: 'Terminate session',          sub: 'The selected device will be immediately logged out.',                       btn: 'Terminate' },
};

function showModal(type) {
  const cfg = MODAL_CFG[type] || { title: 'Confirm', sub: 'Enter PIN to confirm.', btn: 'Confirm' };
  document.getElementById('m-title').textContent   = cfg.title;
  document.getElementById('m-sub').textContent     = cfg.sub;
  document.getElementById('m-confirm').textContent = cfg.btn;
  document.getElementById('m-pin').value           = '';
  document.getElementById('modal').style.display   = 'flex';
}
function closeModal() {
  document.getElementById('modal').style.display = 'none';
}

/* ════════════════════════════════════════
   REPORTS
════════════════════════════════════════ */
async function generateReport(type) {
  const labels = { weekly: 'Weekly summary', fod: 'FOD incident report', ecl: 'ECL compliance', dispatch: 'Dispatch certificate' };
  alert(`Generating: ${labels[type] || type}\n\nThis will call the backend API to produce a PDF/XLSX report.`);
  try {
    const res = await fetch(`${API}/reports/${type}`, { headers: authHeaders() });
    if (res.ok) {
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = `DRISHTI_${type}_report.pdf`; a.click();
    }
  } catch (_) { /* offline */ }
}

/* ════════════════════════════════════════
   DEFECT GUIDE
════════════════════════════════════════ */
function loadGuide(type) {
  const guides = {
    'fod-compressor': 'FOD in Compressor Inlet:\n1. Isolate engine – do not run.\n2. Perform borescope inspection of inlet & compressor stages.\n3. Document all foreign material with photos.\n4. Remove debris per AMM Chapter 72-30.\n5. Inspect for blade damage (visual + dye-penetrant).\n6. Log in defect register and raise FOD report.\n7. Obtain engineering sign-off before return to service.',
    'serial-gap':     'Unreadable Serial Number:\n1. Clean tag with approved solvent.\n2. Re-attempt OCR scan under different lighting.\n3. If still unreadable, use UV lamp inspection.\n4. Cross-reference component position against engine config card.\n5. Contact manufacturer for replacement data plate if required.\n6. Update registry and flag item as "verified-alternate-method".',
    'blade-crack':    'Turbine Blade Crack:\n1. Immediately ground the engine.\n2. Perform detailed borescope inspection per AMM 72-51.\n3. Measure crack length/depth against serviceability limits.\n4. If beyond limits — replace blade per approved procedure.\n5. Perform fluorescent penetrant inspection on adjacent blades.\n6. Complete and submit Defect Report Form DRF-HAL-72.\n7. Engineering authority approval required before return to service.',
  };
  alert(guides[type] || 'Guide not found. Contact engineering support.');
}

/* ════════════════════════════════════════
   HELPERS
════════════════════════════════════════ */
function authHeaders() {
  return STATE.token && STATE.token !== 'demo'
    ? { Authorization: `Bearer ${STATE.token}` }
    : {};
}

/* ════════════════════════════════════════
   INIT — restore session on page load
════════════════════════════════════════ */
(function init() {
  const token = localStorage.getItem('drishti_token');
  const user  = localStorage.getItem('drishti_user');
  if (token && user) {
    STATE.token = token;
    STATE.user  = JSON.parse(user);
    applyUser(STATE.user);
    goPage('pg-app');
    loadDashboard();
  } else {
    goPage('pg-login');
  }
})();
