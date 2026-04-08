// ===== AUTH GUARD =====
if (!requireAuth()) throw new Error('Auth required');

// ===== PALETTE =====
const CLR = ['#2d6a4f', '#e07a5f', '#3d5a80', '#f2cc8f', '#81b29a', '#264653', '#e76f51', '#a8dadc', '#457b9d', '#f4a261'];
const USERS = ['U01', 'U02', 'U03', 'U04', 'U05', 'U06', 'U07', 'U08', 'U09', 'U10'];
const FEATS = ['Discount Used', 'Express Shipping', 'Gift Wrap'];
let nxId = 1;
function rnd(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a }
function rndI(a) { return a[rnd(0, a.length - 1)] }
function rndF() { const n = rnd(0, 2), r = []; const s = new Set(); while (r.length < n) { const x = rndI(FEATS); if (!s.has(x)) { s.add(x); r.push(x) } } return r }

let orders = [];
let loadedDatasets = [];
let currentDatasetId = -1;
let sysCols = { amt: 'Revenue', cat: 'Category', dt: 'Date', cust: 'Customer', all: ['ID', 'Date', 'Customer', 'Category', 'Amount', 'Features'] };

// ===== FILTERS =====
function getF() {
  const s = document.getElementById('fS').value, e = document.getElementById('fE').value, c = document.getElementById('fC').value;
  if (!s || !e) return []; // Guard: Don't filter if dates are missing
  const ids = loadedDatasets.filter(d => d.active).map(d => d.id);
  return orders.filter(o => {
    if (!ids.includes(o.datasetId)) return false;
    if (s && o.date < s) return false;
    if (e && o.date > e) return false;
    if (c !== 'All' && o.category !== c) return false;
    return true;
  });
}
function getP() {
  const sV = document.getElementById('fS').value, eV = document.getElementById('fE').value;
  if (!sV || !eV) return [];
  const s = new Date(sV), e = new Date(eV);
  if (isNaN(s) || isNaN(e)) return [];
  const l = e - s, ps = new Date(s - l), pe = new Date(s - 864e5);
  const pss = ps.toISOString().split('T')[0], pes = pe.toISOString().split('T')[0];
  const c = document.getElementById('fC').value;
  const ids = loadedDatasets.filter(d => d.active).map(d => d.id);
  return orders.filter(o => {
    if (!ids.includes(o.datasetId)) return false;
    if (o.date < pss || o.date > pes) return false;
    if (c !== 'All' && o.category !== c) return false;
    return true;
  });
}
function resetF() {
  const dates = orders.map(o => o.date).sort();
  document.getElementById('fS').value = dates[0] || '';
  document.getElementById('fE').value = dates[dates.length - 1] || '';
  document.getElementById('fC').value = 'All';
  refresh();
}
function popCats() { const cs = [...new Set(orders.map(o => o.category))].sort(); const sel = document.getElementById('fC'), cur = sel.value; sel.innerHTML = '<option value="All">All</option>' + cs.map(c => '<option>' + c + '</option>').join(''); if (cs.includes(cur) || cur === 'All') sel.value = cur }

Chart.defaults.font.family="'Graphik',sans-serif";Chart.defaults.color='#888';
Chart.defaults.animation = { duration: 800, easing: 'easeOutQuart' };
Chart.defaults.transitions = { active: { animation: { duration: 250 } } };

let rotMode = 'daily', rotCI2 = null;

// ===== KPIs =====
function renderKPIs(f, p) {
  const rev = f.reduce((s, o) => s + o.amount, 0), cnt = f.length, aov = cnt ? rev / cnt : 0;
  const pRev = p.reduce((s, o) => s + o.amount, 0);
  const rG = pRev ? ((rev - pRev) / pRev * 100) : 0;
  const days = new Set(f.map(o => o.date)).size || 1;
  const cats = new Set(f.map(o => o.category)).size;
  const custs = new Set(f.map(o => o.userId)).size;
  const fmt = v => '$' + v.toLocaleString('en', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  const ch = v => `<span class="kpi-ch ${v >= 0 ? 'up' : 'down'}">${v >= 0 ? '↑' : '↓'}${Math.abs(v).toFixed(1)}%</span>`;

  const amtName = sysCols.amt;
  const catName = sysCols.cat;

  document.getElementById('kR').innerHTML = `
    <div class="kpi"><div class="kpi-p">Total ${amtName}</div><div><span class="kpi-val">${fmt(rev)}</span>${ch(rG)}</div><div class="kpi-sub">${cnt} rows · ${days} periods</div></div>
    <div class="kpi"><div class="kpi-p">Avg ${amtName} / Row</div><div><span class="kpi-val">${fmt(aov)}</span></div><div class="kpi-sub">${cats} ${catName}s</div></div>
    <div class="kpi"><div class="kpi-p">Daily Average</div><div><span class="kpi-val">${fmt(rev / days)}</span></div><div class="kpi-sub">~${(cnt / days).toFixed(1)} rows/time</div></div>
    <div class="kpi"><div class="kpi-p">${sysCols.cust}s</div><div><span class="kpi-val">${custs}</span></div><div class="kpi-sub">$${(rev / custs).toFixed(0)} per ${sysCols.cust.toLowerCase()}</div></div>`;

  // Also push dynamic names to HTML DOM IDs 
  if (document.getElementById('lblRot')) document.getElementById('lblRot').innerText = `${amtName} Over Time`;
  if (document.getElementById('lblDaily')) document.getElementById('lblDaily').innerText = `Aggregated ${amtName}`;
  if (document.getElementById('lblCat')) document.getElementById('lblCat').innerText = `${amtName} by ${catName}`;
  if (document.getElementById('lblSec1')) document.getElementById('lblSec1').innerText = `${amtName} & Trends`;
  if (document.getElementById('lblHmTip')) document.getElementById('lblHmTip').innerText = `${amtName} Heatmap`;
}

// ===== REVENUE OVER TIME (line area) =====
function renderROT(f) {
  const activeDS = loadedDatasets.filter(ds => ds.active);
  const byDS = {};
  activeDS.forEach(ds => { byDS[ds.id] = { d: {}, data: [] } });

  f.forEach(o => { if(byDS[o.datasetId]) byDS[o.datasetId].d[o.date] = (byDS[o.datasetId].d[o.date] || 0) + Number(o.amount) });

  let allDates = new Set();
  f.forEach(o => allDates.add(o.date));
  let rawAll = Array.from(allDates).sort();

  let fmtL = [];
  let xLabels = [];
  if (rotMode === 'monthly') {
    let mSet = new Set(); rawAll.forEach(k => mSet.add(k.substring(0, 7)));
    xLabels = Array.from(mSet).sort();
    fmtL = xLabels;
    activeDS.forEach(ds => {
      let b = byDS[ds.id];
      const m = {}; Object.keys(b.d).forEach(k => { const mo = k.substring(0, 7); m[mo] = (m[mo] || 0) + b.d[k] });
      b.data = xLabels.map(xl => m[xl] || 0);
    });
  } else if (rotMode === 'weekly') {
    let wSet = new Set(); rawAll.forEach(k => { const dt = new Date(k + 'T12:00:00'); dt.setDate(dt.getDate() - dt.getDay()); wSet.add(dt.toISOString().split('T')[0]) });
    xLabels = Array.from(wSet).sort();
    fmtL = xLabels.map(l => new Date(l + 'T12:00:00').toLocaleDateString('en', { month: 'short', day: 'numeric' }));
    activeDS.forEach(ds => {
      let b = byDS[ds.id];
      const w = {}; Object.keys(b.d).forEach(k => { const dt = new Date(k + 'T12:00:00'); dt.setDate(dt.getDate() - dt.getDay()); const wk = dt.toISOString().split('T')[0]; w[wk] = (w[wk] || 0) + b.d[k] });
      b.data = xLabels.map(xl => w[xl] || 0);
    });
  } else {
    xLabels = rawAll;
    fmtL = xLabels.map(l => new Date(l + 'T12:00:00').toLocaleDateString('en', { month: 'short', day: 'numeric' }));
    activeDS.forEach(ds => {
      let b = byDS[ds.id];
      b.data = xLabels.map(xl => b.d[xl] || 0);
    });
  }

  const ctx = document.getElementById('rotC').getContext('2d');
  if (rotCI2) { rotCI2.stop(); rotCI2.destroy(); }
  
  const datasets = activeDS.map((ds, i) => {
    let b = byDS[ds.id];
    let isPrimary = i === 0;
    let bg = ctx.createLinearGradient(0, 0, 0, 240);
    bg.addColorStop(0, ds.color + '40'); bg.addColorStop(1, ds.color + '02');
    return {
      label: ds.name, data: b.data.map(v => Number(v) || 0), borderColor: ds.color, backgroundColor: bg,
      fill: isPrimary, tension: .4, pointRadius: rotMode === 'daily' ? 1.5 : 3,
      pointBackgroundColor: ds.color, pointHoverRadius: 5, borderWidth: 2.5
    };
  });

  rotCI2 = new Chart(ctx, {
    type: 'line', data: { labels: fmtL, datasets },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: { legend: { display: activeDS.length > 1, position:'top', labels:{boxWidth:12, font:{size:10}, padding: 8} }, tooltip: { backgroundColor: '#1a1a1a', titleFont: { size: 11 }, bodyFont: { size: 11 }, padding: 10, cornerRadius: 6, callbacks: { label: c => c.dataset.label + ': $' + Number(c.raw).toLocaleString() } } },
      scales: { x: { ticks: { font: { size: 8 }, maxRotation: 45 }, grid: { display: false } }, y: { beginAtZero: true, ticks: { callback: v => '$' + (v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v) }, grid: { color: 'rgba(0,0,0,.04)' } } }
    }
  });
}
function setROT(mode) {
  rotMode = mode;
  document.querySelectorAll('.tgl').forEach(b => b.classList.remove('active'));
  document.getElementById(mode === 'daily' ? 'tD' : mode === 'weekly' ? 'tW' : 'tM').classList.add('active');
  renderROT(getF());
}

// ===== CHARTS =====
let revCI = null, fcCI = null, catCI = null;
function renderRev(f) {
  const activeDS = loadedDatasets.filter(ds => ds.active);
  let allDates = new Set();
  f.forEach(o => allDates.add(o.date));
  const lb = Array.from(allDates).sort();

  const datasets = activeDS.map(ds => {
    const d = {}; 
    f.filter(o => o.datasetId === ds.id).forEach(o => d[o.date] = (d[o.date] || 0) + Number(o.amount));
    return {
      label: ds.name,
      data: lb.map(l => d[l] || 0),
      backgroundColor: ds.color,
      borderRadius: 3
    }
  });

  const ctx = document.getElementById('rC').getContext('2d');
  if (revCI) { revCI.stop(); revCI.destroy(); }
  revCI = new Chart(ctx, { 
    type: 'bar', 
    data: { 
      labels: lb.map(l => { const x = new Date(l + 'T12:00:00'); return x.toLocaleDateString('en', { month: 'short', day: 'numeric' }) }), 
      datasets 
    }, 
    options: { 
      responsive: true, 
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false }, 
      plugins: { legend: { display: activeDS.length > 1, position:'top', labels:{boxWidth:10, font:{size:9}, padding: 5} } }, 
      scales: { x: { ticks: { font: { size: 8 } }, grid: { display: false } }, y: { beginAtZero: true, ticks: { callback: v => '$' + v }, grid: { color: 'rgba(0,0,0,.05)' } } } 
    } 
  });
}
function renderFC(f) {
  if (!f || f.length === 0) return { slope: 0, nwa: 0 };
  const activeDS = loadedDatasets.filter(ds => ds.active);
  let allDates = new Set(); f.forEach(o => allDates.add(o.date));
  const dates = Array.from(allDates).sort();
  const aL = dates.map(l => new Date(l + 'T12:00:00').toLocaleDateString('en', { month: 'short', day: 'numeric' }));
  
  const ctx = document.getElementById('fC2').getContext('2d'); if (fcCI) { fcCI.stop(); fcCI.destroy(); }
  
  const datasets = [];
  let bestSlope = 0, bestNwa = 0;

  activeDS.forEach((ds, idx) => {
    const d = {}; f.filter(o => o.datasetId === ds.id).forEach(o => d[o.date] = (d[o.date] || 0) + Number(o.amount));
    const vals = dates.map(x => d[x] || 0);

    const ma = []; for (let i = 0; i < vals.length; i++) { const st = Math.max(0, i - 6); const sl = vals.slice(st, i + 1); ma.push(sl.reduce((a, b) => a + b, 0) / sl.length) }
    const n = ma.length, xM = (n - 1) / 2, yM = ma.reduce((a, b) => a + (Number(b)||0), 0) / n; let nm = 0, dn = 0;
    for (let i = 0; i < n; i++) { nm += (i - xM) * (ma[i] - yM); dn += (i - xM) ** 2 }
    const slope = dn ? nm / dn : 0, int = yM - slope * xM;
    
    const pD = []; 
    for (let i = 1; i <= 7; i++) { pD.push(Math.max(0, int + slope * (n - 1 + i))) }

    const fillLen = Math.max(0, ma.length - 1);
    
    datasets.push({ label: `${ds.name} (MA)`, data: [...ma, ...Array(7).fill(null)].map(v => v === null ? null : (Number(v)||0)), borderColor: ds.color, backgroundColor: 'transparent', fill: false, tension: .3, pointRadius: 1.5, borderWidth: 2 });
    datasets.push({ label: `${ds.name} (Proj)`, data: [...Array(fillLen).fill(null), ma[ma.length - 1] || 0, ...pD].map(v => v === null ? null : (Number(v)||0)), borderColor: ds.color + '80', backgroundColor: 'transparent', fill: false, tension: .3, pointRadius: 2.5, borderWidth: 2, borderDash: [5, 3] });

    if (idx === 0) {
      bestSlope = slope; bestNwa = pD.reduce((a,b)=>a+(Number(b)||0), 0) / 7;
    }
  });

  const last = new Date(dates[dates.length - 1] + 'T12:00:00');
  for (let i = 1; i <= 7; i++) { const nd = new Date(last); nd.setDate(nd.getDate() + i); aL.push(nd.toLocaleDateString('en', { month: 'short', day: 'numeric' })); }

  fcCI = new Chart(ctx, {
    type: 'line', data: { labels: aL, datasets }, options: { responsive: true, maintainAspectRatio: false, interaction:{mode:'index'}, plugins: { legend: { position:'top', labels: { boxWidth:10, font: { size: 9 }, usePointStyle: true, pointStyleWidth: 7 } } }, scales: { x: { ticks: { font: { size: 7 }, maxRotation: 45 }, grid: { display: false } }, y: { ticks: { callback: v => '$' + (Number(v)).toFixed(0) }, grid: { color: 'rgba(0,0,0,.05)' } } } }
  });
  return { slope: bestSlope, nwa: bestNwa };
}
function renderCat(f) {
  const activeDS = loadedDatasets.filter(ds => ds.active);
  const ksSet = new Set(); f.forEach(o => ksSet.add(o.category));
  const ks = Array.from(ksSet).sort();
  
  const ctx = document.getElementById('catC').getContext('2d'); if (catCI) { catCI.stop(); catCI.destroy(); }
  if (activeDS.length > 1) {
    const datasets = activeDS.map(ds => {
      const bC = {}; f.filter(o => o.datasetId === ds.id).forEach(o => bC[o.category] = (bC[o.category] || 0) + Number(o.amount));
      return { label: ds.name, data: ks.map(k => Number(bC[k]) || 0), backgroundColor: ds.color, borderRadius:3 };
    });
    catCI = new Chart(ctx, { type: 'bar', data: { labels: ks, datasets }, options: { responsive: true, maintainAspectRatio: false, interaction:{mode:'index'}, plugins: { legend: { position: 'top', labels:{boxWidth:10, font:{size:9}} } }, scales: { x: { ticks:{font:{size:9}}, grid:{display:false} }, y: { display: false } } } });
  } else {
    const bC = {}; f.forEach(o => { bC[o.category] = (bC[o.category] || 0) + Number(o.amount) });
    catCI = new Chart(ctx, { type: 'polarArea', data: { labels: ks, datasets: [{ data: ks.map(k => Number(bC[k]) || 0), backgroundColor: CLR.slice(0, ks.length).map(c => c + 'CC'), borderWidth: 1 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { font: { size: 9 }, padding: 8, usePointStyle: true, pointStyleWidth: 7 } } } } });
  }
}

// ===== HEATMAPS =====
function renderHeatmaps(f) {
  if (!f || f.length === 0) return;
  // Day of Week × Month
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const months = [...new Set(f.map(o => o.date.substring(0, 7)))].sort();
  const dm = {}; days.forEach(d => { dm[d] = {}; months.forEach(m => dm[d][m] = 0) });
  f.forEach(o => { const dt = new Date(o.date + 'T12:00:00'); const dn = days[(dt.getDay() + 6) % 7]; const m = o.date.substring(0, 7); if (dm[dn] && dm[dn][m] !== undefined) dm[dn][m] += o.amount });
  let allV = []; days.forEach(d => months.forEach(m => allV.push(dm[d][m])));
  const mx = Math.max(...allV, 1);
  let h1 = `<div class="tw" style="overflow-x:auto; padding-bottom:8px;"><div class="hm-grid" style="grid-template-columns:50px repeat(${months.length},minmax(38px, 1fr)); min-width: max-content;">`;
  h1 += `<div class="hm-label"></div>`;
  months.forEach(m => h1 += `<div class="hm-label">${m.split('-')[1]}/${m.split('-')[0].slice(2)}</div>`);
  days.forEach(d => { h1 += `<div class="hm-label">${d}</div>`; months.forEach(m => { const v = dm[d][m]; const t = mx ? v / mx : 0; const bg = t > .6 ? CLR[0] : t > .3 ? CLR[4] : t > 0 ? CLR[3] + '80' : 'var(--bg3)'; h1 += `<div class="hm-cell" style="background:${bg};color:${t > .5 ? '#fff' : 'var(--text)'}" title="${d} ${m}: $${v.toFixed(0)}">$${v > 0 ? v.toFixed(0) : '-'}</div>` }) });
  h1 += '</div></div>'; document.getElementById('hm1').innerHTML = h1;

  // Category × Month
  const cats = [...new Set(f.map(o => o.category))].sort();
  const cm = {}; cats.forEach(c => { cm[c] = {}; months.forEach(m => cm[c][m] = 0) });
  f.forEach(o => { const m = o.date.substring(0, 7); if (cm[o.category]) cm[o.category][m] += o.amount });
  let allV2 = []; cats.forEach(c => months.forEach(m => allV2.push(cm[c][m])));
  const mx2 = Math.max(...allV2, 1);
  let h2 = `<div class="tw" style="overflow-x:auto; padding-bottom:8px;"><div class="hm-grid" style="grid-template-columns:100px repeat(${months.length},minmax(45px, 1fr)); min-width: max-content;">`;
  h2 += `<div class="hm-label"></div>`;
  months.forEach(m => h2 += `<div class="hm-label">${m.split('-')[1]}/${m.split('-')[0].slice(2)}</div>`);
  cats.forEach((c, ci) => { h2 += `<div class="hm-label" style="text-align:right; padding-right:8px; line-height:1.2;">${c}</div>`; months.forEach(m => { const v = cm[c][m]; const t = mx2 ? v / mx2 : 0; const clr = CLR[ci % CLR.length]; const bg = t > 0 ? clr + Math.round(Math.max(t * .9, .08) * 255).toString(16).padStart(2, '0') : 'var(--bg3)'; h2 += `<div class="hm-cell" style="background:${bg};color:${t > .5 ? '#fff' : 'var(--text)'}" title="${c} ${m}: $${v.toFixed(0)}">$${v > 0 ? v.toFixed(0) : '-'}</div>` }) });
  h2 += '</div></div>'; document.getElementById('hm2').innerHTML = h2;
}

// ===== PREDICTIONS + INVENTORY =====
function renderPred(f, fd) {
  if (!f || f.length === 0) return {};
  const rev = f.reduce((s, o) => s + o.amount, 0);
  const bM = {}; f.forEach(o => { const m = o.date.substring(0, 7); bM[m] = (bM[m] || 0) + o.amount });
  const ms = Object.keys(bM).sort(), mV = ms.map(m => bM[m]);
  let sm = mV[0] || 0; for (let i = 1; i < mV.length; i++)sm = .3 * mV[i] + .7 * sm;
  const lM = mV[mV.length - 1] || 0; const gP = lM ? ((sm - lM) / lM * 100) : 0;
  const today = new Date(document.getElementById('fE').value || '2024-04-01'); today.setDate(today.getDate() + 1);
  const bU = {}; f.forEach(o => { if (!bU[o.userId]) bU[o.userId] = { last: o.date, freq: 0, mon: 0 }; if (o.date > bU[o.userId].last) bU[o.userId].last = o.date; bU[o.userId].freq++; bU[o.userId].mon += o.amount });
  const cs = Object.values(bU);
  const mxR = Math.max(...cs.map(c => Math.floor((today - new Date(c.last)) / 864e5)), 1);
  const mxF = Math.max(...cs.map(c => c.freq), 1), mxM = Math.max(...cs.map(c => c.mon), 1);
  let tR = 0; cs.forEach(c => { const r = Math.floor((today - new Date(c.last)) / 864e5); c.churnRisk = Math.round((r / mxR) * 40 + (1 - c.freq / mxF) * 35 + (1 - c.mon / mxM) * 25); tR += c.churnRisk });
  const aR = cs.length ? Math.round(tR / cs.length) : 0;
  const rC = aR < 30 ? '#2d6a4f' : aR < 60 ? '#b8860b' : '#c0392b';
  const nw = fd ? fd.nwa : 0; const td = fd && fd.slope > 0 ? '↑ Up' : '↓ Down';
  // Inventory predictions
  const days = new Set(f.map(o => o.date)).size || 1;
  const avgDaily = f.length / days;
  const leadTime = 7;// assumed 7 days
  const safetyStock = Math.ceil(avgDaily * 2);
  const reorderPt = Math.ceil(avgDaily * leadTime + safetyStock);
  const simStock = Math.ceil(avgDaily * 30);// simulate 30 days stock
  const daysOfStock = avgDaily > 0 ? Math.round(simStock / avgDaily) : 0;
  const turnover = avgDaily > 0 ? (f.length / (simStock / 2)).toFixed(1) : '—';

  document.getElementById('pG').innerHTML = `
    <div class="pred"><div class="pred-lbl">Next Week Rev</div><div class="pred-val" style="color:${CLR[0]}">$${(nw * 7).toFixed(0)}</div><div class="pred-d">~$${nw.toFixed(0)}/day · ${td}<br><small>MA-7 + regression</small></div></div>
    <div class="pred"><div class="pred-lbl">Growth Forecast</div><div class="pred-val" style="color:${gP >= 0 ? CLR[0] : CLR[1]}">${gP >= 0 ? '+' : ''}${gP.toFixed(1)}%</div><div class="pred-d">Smoothed: $${sm.toFixed(0)}<br><small>Exp. smoothing α=0.3</small></div></div>
    <div class="pred"><div class="pred-lbl">Churn Risk</div><div class="pred-val">${aR}/100</div><div class="churn-bar"><div class="churn-fill" style="width:${aR}%;background:${rC}"></div></div><div class="pred-d">${aR < 30 ? 'Low' : aR < 60 ? 'Medium' : 'High'}<br><small>R40%+F35%+M25%</small></div></div>
    <div class="pred"><div class="pred-lbl">Reorder Point</div><div class="pred-val" style="color:${CLR[2]}">${reorderPt} units</div><div class="pred-d">Lead: ${leadTime}d · Safety: ${safetyStock}<br><small>avg×lead + safety</small></div></div>`;
  return bU;
}

// ===== TABLE =====
function renderTbl(f) {
  if (!f || f.length === 0) { document.getElementById('oT').innerHTML = ''; return; }
  // Generate Table Header dynamically
  const cols = sysCols.all.filter(c => c !== 'id' && c !== 'features' && c !== 'date' && c !== 'amount' && c !== 'category' && c !== 'userId'); // Keep arbitrary columns
  // We'll just render sysCols.all instead of standard ones, or maybe a mix.
  // Actually, to display arbitrary CSV properly, headers should match sysCols.all.
  const tHead = document.getElementById('tHead');
  if (tHead) tHead.innerHTML = sysCols.all.map(c => `<th>${c}</th>`).join('');

  document.getElementById('oT').innerHTML = f.map(o => {
    return `<tr>` + sysCols.all.map(c => {
      let val = o[c];
      if (val === undefined || val === null) val = '—';
      // Format detected columns specificially?
      if (c.toLowerCase().replace(/['"]/g, '') === sysCols.amt.toLowerCase().replace(/['"]/g, '') && !isNaN(val)) val = `$${parseFloat(val).toFixed(2)}`;
      return `<td>${val}</td>`;
    }).join('') + `</tr>`;
  }).join('');
}

// ===== FUNNEL =====
function renderFun(f) {
  if (!f || f.length === 0) return;
  const steps = ['view_product', 'add_to_cart', 'initiate_checkout', 'purchase'];
  const nms = ['View Product', 'Add to Cart', 'Checkout', 'Purchase'];
  const clrs = [CLR[2], CLR[8], CLR[9], CLR[0]];
  // Generate events from orders
  const cnt = steps.map(() => f.length);// simulated 1:1 funnel
  // Make realistic: some drop off
  cnt[1] = Math.ceil(f.length * .85); cnt[2] = Math.ceil(f.length * .7); cnt[3] = f.length;
  const mx = cnt[0] || 1;
  document.getElementById('fB').innerHTML = steps.map((st, i) => {
    const pct = (cnt[i] / mx * 100).toFixed(0);
    const drop = i > 0 ? '-' + ((1 - cnt[i] / (cnt[i - 1] || 1)) * 100).toFixed(0) + '%' : '';
    return `<div class="fn-s"><div class="fn-n" style="background:${clrs[i]}">${i + 1}</div><div class="fn-i"><div class="nm">${nms[i]}</div></div><div class="fn-bg"><div class="fn-fl" style="width:${pct}%;background:${clrs[i]}"><span>${cnt[i]}</span></div></div><div class="fn-p">${pct}%</div></div>`
  }).join('');
}

// ===== COHORT =====
function renderCoh() {
  const c = document.getElementById('fC').value;
  let fo = orders.filter(o => c === 'All' || o.category === c);
  if (!fo || fo.length === 0) { document.getElementById('cT').innerHTML = '<tr><td colspan="5">No data</td></tr>'; return; }
  const fp = {}; fo.forEach(o => { if (!fp[o.userId] || o.date < fp[o.userId]) fp[o.userId] = o.date });
  const coh = {}; Object.entries(fp).forEach(([u, d]) => { const m = d.substring(0, 7); if (!coh[m]) coh[m] = new Set(); coh[m].add(u) });
  const cm = Object.keys(coh).sort();
  let h = '<thead><tr><th>Cohort</th><th>Users</th>';
  for (let i = 0; i <= 3; i++)h += `<th>M${i}</th>`;
  h += '</tr></thead><tbody>';
  cm.forEach(c => {
    const us = coh[c], sz = us.size;
    h += `<tr><td style="font-weight:700">${c}</td><td>${sz}</td>`;
    for (let i = 0; i <= 3; i++) {
      const [y, m] = c.split('-').map(Number);
      const nm = m - 1 + i, ay = y + Math.floor(nm / 12), am = (nm % 12) + 1;
      const tm = ay + '-' + String(am).padStart(2, '0');
      const ac = new Set(fo.filter(o => o.date.substring(0, 7) === tm && us.has(o.userId)).map(o => o.userId));
      const pct = sz ? Math.round(ac.size / sz * 100) : 0;
      const t = pct / 100; const bg = t > .6 ? CLR[0] : t > .3 ? CLR[4] + '90' : t > 0 ? CLR[3] + '60' : 'var(--bg3)';
      h += `<td style="background:${bg};font-weight:700;color:${t > .5 ? '#fff' : 'var(--text)'}">${pct}%</td>`;
    } h += '</tr>';
  }); h += '</tbody>'; document.getElementById('cT').innerHTML = h;
}

// ===== RFM =====
let rfmCI = null;
function renderRFM(f, uS) {
  if (!f || f.length === 0) return;
  const today = new Date(document.getElementById('fE').value || '2024-04-01'); today.setDate(today.getDate() + 1);
  const bU = uS || {};
  if (!uS) { f.forEach(o => { if (!bU[o.userId]) bU[o.userId] = { last: o.date, freq: 0, mon: 0 }; if (o.date > bU[o.userId].last) bU[o.userId].last = o.date; bU[o.userId].freq++; bU[o.userId].mon += o.amount }) }
  const cs = Object.entries(bU).map(([u, d]) => ({ userId: u, recency: Math.floor((today - new Date(d.last)) / 864e5), frequency: d.freq, monetary: d.mon, churnRisk: d.churnRisk || 0 }));
  const mR = Math.max(...cs.map(c => c.recency), 1), mF = Math.max(...cs.map(c => c.frequency), 1), mM = Math.max(...cs.map(c => c.monetary), 1);
  cs.forEach(c => { const rS = 5 - Math.ceil(c.recency / mR * 5) + 1, fS = Math.ceil(c.frequency / mF * 5), mS = Math.ceil(c.monetary / mM * 5), avg = (rS + fS + mS) / 3; if (avg >= 4) c.segment = 'Champions'; else if (avg >= 3.2) c.segment = 'Loyal'; else if (fS >= 2 && rS <= 2) c.segment = 'At Risk'; else if (rS <= 2) c.segment = 'Hibernating'; else c.segment = 'New' });
  const segC = { Champions: CLR[0], Loyal: CLR[2], 'At Risk': CLR[9], Hibernating: CLR[1], New: CLR[4] };
  const sC = {};['Champions', 'Loyal', 'At Risk', 'Hibernating', 'New'].forEach(s => { sC[s] = cs.filter(c => c.segment === s).length });
  document.getElementById('rG').innerHTML = Object.entries(sC).map(([s, n]) => `<div class="rfm-c" style="background:${segC[s]}18"><div class="n" style="color:${segC[s]}">${n}</div><div class="l">${s}</div></div>`).join('');
  const ctx = document.getElementById('rCh').getContext('2d'); if (rfmCI) rfmCI.destroy();
  const sk = Object.keys(sC);
  rfmCI = new Chart(ctx, { type: 'doughnut', data: { labels: sk, datasets: [{ data: sk.map(k => sC[k]), backgroundColor: sk.map(k => segC[k]), borderWidth: 0, hoverOffset: 4 }] }, options: { responsive: true, maintainAspectRatio: false, cutout: '62%', plugins: { legend: { position: 'bottom', labels: { font: { size: 9 }, padding: 8, usePointStyle: true, pointStyleWidth: 7 } } } } });
  const t5 = cs.sort((a, b) => b.monetary - a.monetary).slice(0, 5);
  const rc = v => v < 30 ? CLR[0] : v < 60 ? '#b8860b' : '#c0392b';
  document.getElementById('rT').innerHTML = t5.map(c => `<tr><td>${c.userId}</td><td>${c.segment}</td><td>${c.recency}d</td><td>${c.frequency}</td><td>$${c.monetary.toFixed(0)}</td><td style="color:${rc(c.churnRisk)};font-weight:700">${c.churnRisk}</td></tr>`).join('');
}

// ===== ADOPTION =====
let adCI = null;
function renderAd(f) {
  if (!f || f.length === 0) return;
  const cnt = {}; FEATS.forEach(x => cnt[x] = 0); f.forEach(o => o.features.forEach(x => { cnt[x] = (cnt[x] || 0) + 1 }));
  const tot = f.length || 1; const ctx = document.getElementById('aC').getContext('2d'); if (adCI) adCI.destroy();
  adCI = new Chart(ctx, { type: 'bar', data: { labels: FEATS, datasets: [{ data: FEATS.map(x => (cnt[x] / tot * 100).toFixed(1)), backgroundColor: [CLR[2], CLR[9], CLR[1]], borderRadius: 4, borderSkipped: false }] }, options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { max: 100, ticks: { callback: v => v + '%' }, grid: { color: 'rgba(0,0,0,.05)' } }, y: { grid: { display: false } } } } });
}

// ===== CRUD =====
function openM(ed = null) { document.getElementById('eI').value = ed ? ed.id : ''; document.getElementById('fD').value = ed ? ed.date : '2024-02-15'; document.getElementById('fA').value = ed ? ed.amount : ''; document.getElementById('fCM').value = ed ? ed.category : 'Electronics'; document.getElementById('fU').innerHTML = USERS.map(u => `<option ${ed && ed.userId === u ? 'selected' : ''}>${u}</option>`).join(''); document.getElementById('mB').classList.add('active') }
function closeM() { document.getElementById('mB').classList.remove('active') }
function saveO() { const id = document.getElementById('eI').value, dt = document.getElementById('fD').value, u = document.getElementById('fU').value, c = document.getElementById('fCM').value, a = parseFloat(document.getElementById('fA').value); if (!dt || !a || isNaN(a)) return alert('Fill all fields'); if (id) { const o = orders.find(x => x.id == id); if (o) { o.date = dt; o.userId = u; o.category = c; o.amount = a } } else orders.push({ id: nxId++, date: dt, userId: u, category: c, amount: a, features: rndF() }); closeM(); popCats(); refresh() }
function editO(id) { const o = orders.find(x => x.id === id); if (o) openM(o) }
function delO(id) { if (confirm('Delete #' + id + '?')) { orders = orders.filter(o => o.id !== id); refresh() } }

// ===== CSV UPLOAD → REPLACES ORDERS & REFRESHES ALL =====
function setupUpload() {
  const zone = document.getElementById('uZ'), inp = document.getElementById('uF');
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('dragover') });
  zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
  zone.addEventListener('drop', e => { e.preventDefault(); zone.classList.remove('dragover'); if (e.dataTransfer.files[0]) parseCSV(e.dataTransfer.files[0]) });
  inp.addEventListener('change', e => { if (e.target.files[0]) parseCSV(e.target.files[0]) });
}
function parseCSV(file) {
  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const lines = e.target.result.split('\n').map(l => l.trim()).filter(l => l);
      if (lines.length < 2) return alert('File too small or empty. Please upload valid sales data.');
      const sep = lines[0].includes('\t') ? '\t' : lines[0].includes(';') ? ';' : ',';
      function parseCSVLine(line, sep) {
        let result = [], cur = '', inQ = false;
        for (let i = 0; i < line.length; i++) {
          let c = line[i];
          if (c === '"') inQ = !inQ;
          else if (c === sep && !inQ) { result.push(cur.trim()); cur = ''; }
          else cur += c;
        }
        result.push(cur.trim());
        return result.map(v => v.replace(/^"|"$/g, '').replace(/""/g, '"'));
      }
      const originalHeaders = parseCSVLine(lines[0], sep);
      const headers = originalHeaders.map(h => h.toLowerCase());
      const rows = lines.slice(1).map(l => { const vals = parseCSVLine(l, sep); const obj = {}; originalHeaders.forEach((h, i) => obj[h] = vals[i] || ''); return obj });

      const dateCol = originalHeaders.find((h, i) => /date|time|day|period/i.test(headers[i])) || originalHeaders[0];
      const amtCol = originalHeaders.find((h, i) => /amount|revenue|total|price|sale|value/i.test(headers[i])) || originalHeaders.find(h => { const v = parseFloat(rows[0]?.[h]); return !isNaN(v) && v > 0 });
      const catCol = originalHeaders.find((h, i) => /cat|type|product|group|segment/i.test(headers[i]));
      const custCol = originalHeaders.find((h, i) => /cust|user|client|name|buyer/i.test(headers[i]));

      if (!dateCol || !amtCol) return alert('Invalid CSV: Could not detect Date and Amount columns. Please check your data inside the CSV file.');

// ===== DATASET PILLS UI =====
window.toggleDataset = function(id) {
  const ds = loadedDatasets.find(d => d.id === id);
  if (ds) ds.active = !ds.active;
  renderDatasetPills();
  refresh();
};

function renderDatasetPills() {
  const uR = document.getElementById('uR');
  if (loadedDatasets.length === 0) {
    uR.className = '';
    uR.innerHTML = '';
    return refresh();
  }
  uR.className = 'active';
  let html = `<div style="padding:16px 0; display:flex; flex-wrap:wrap; gap:8px; align-items:center;">`;
  html += `<b style="font-size:.8rem;text-transform:uppercase;letter-spacing:1px;margin-right:8px">Datasets:</b>`;
  loadedDatasets.forEach(ds => {
    html += `<span style="padding:4px 10px; border-radius:12px; font-size:.75rem; font-weight:700; color:${ds.active ? '#fff' : 'var(--text)'}; background:${ds.active ? ds.color : 'var(--bg3)'}; cursor:pointer; border:1px solid ${ds.color}" onclick="toggleDataset(${ds.id})">${ds.name}</span>`;
  });
  html += `<button class="btn btn-sm" style="margin-left:auto" onclick="document.getElementById('uZ').style.display='';document.getElementById('uF').value=''">+ Add CSV</button>`;
  if (loadedDatasets.length > 0) {
    html += `<button class="btn btn-sm btn-del" style="margin-left:8px" onclick="clearDatasets()">Clear All</button>`;
  }
  html += `</div>`;
  uR.innerHTML = html;
  refresh();
}

window.clearDatasets = function() {
  if (confirm('Clear all uploaded datasets? This will reset the dashboard to an empty state.')) {
    loadedDatasets = [];
    orders = [];
    currentDatasetId = -1;
    nxId = 1;
    document.getElementById('fS').value = '';
    document.getElementById('fE').value = '';
    document.getElementById('fC').value = 'All';
    document.getElementById('uZ').style.display = 'block';
    renderDatasetPills();
    popCats();
    refresh();
  }
};

      // Safely append orders
      const newOrders = [];
      let localNxId = nxId;
      currentDatasetId++;
      const newDsId = currentDatasetId;
      const color = CLR[(newDsId) % CLR.length];

      rows.forEach(r => {
        const dt = r[dateCol];
        let amtStr = (r[amtCol] || '').toString().replace(/[^0-9.-]+/g, "");
        const amt = parseFloat(amtStr);
        if (!dt || isNaN(amt) || amt <= 0) return;

        // Ultra-robust date parser
        let dateObj = new Date(dt);
        if (isNaN(dateObj)) {
          const m = dt.match(/^(\d{1,4})[\/\-](\d{1,2})[\/\-](\d{1,4})$/);
          if (m) {
            let p1 = parseInt(m[1]), p2 = parseInt(m[2]), p3 = parseInt(m[3]);
            let y, mo, d;
            if (p1 > 1000) { y = p1; mo = p2; d = p3; } // YYYY-MM-DD
            else if (p3 > 1000) { // DD-MM-YYYY or MM-DD-YYYY
              y = p3;
              if (p1 > 12) { d = p1; mo = p2; }
              else if (p2 > 12) { mo = p1; d = p2; }
              else { mo = p1; d = p2; }
            }
            if (y && mo && d) {
              dateObj = new Date(`${y}-${mo.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`);
            }
          }
        }
        if (isNaN(dateObj)) return;
        const date = dateObj.toISOString().split('T')[0];

        newOrders.push({ ...r, id: localNxId++, date, userId: r[custCol] || 'C' + rnd(1, 20), category: r[catCol] || 'General', amount: amt, features: rndF(), datasetId: newDsId });
      });

      if (newOrders.length === 0) {
        currentDatasetId--; // rollback
        return alert('No valid data rows found. Ensure the date and amount formats are correct.');
      }

      sysCols.dt = dateCol || 'Date';
      sysCols.amt = amtCol || 'Amount';
      sysCols.cat = catCol || 'Category';
      sysCols.cust = custCol || 'Customer';
      sysCols.all = originalHeaders;

      orders = [...orders, ...newOrders];
      nxId = localNxId;
      loadedDatasets.push({ id: newDsId, name: file.name, color, active: true });

      // Update date range
      const dates = orders.map(o => o.date).sort();
      document.getElementById('fS').value = dates[0];
      document.getElementById('fE').value = dates[dates.length - 1];

      popCats();
      document.getElementById('uZ').style.display = 'none';
      renderDatasetPills();
    } catch (err) {
      console.error(err);
      alert('Error parsing CSV. Please ensure the file is a properly formatted tabular CSV file.');
    }
  };
  reader.readAsText(file);
}

// ===== PDF REPORT =====
function genPDF() {
  const btn = document.getElementById('pdfBtn');
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...'; btn.disabled = true;
  // Hide interactive elements
  const dash = document.querySelector('.dash');
  const hide = dash.querySelectorAll('.btn,.upload-zone,.controls,.mbg');
  hide.forEach(el => el.style.visibility = 'hidden');
  // Add report header
  const rh = document.createElement('div');
  rh.id = 'pdf-header';
  rh.innerHTML = `<div style="padding:20px 0 16px;border-bottom:2px solid #1a1a1a;margin-bottom:20px;display:flex;justify-content:space-between;align-items:flex-end">
    <div><h1 style="font-size:1.5rem;font-weight:700;font-family:'Courier New',monospace">Vikri<span style="color:#2d6a4f">Drishti</span> Report</h1>
    <div style="font-size:.7rem;color:#888;font-family:'Courier New',monospace;margin-top:4px">Generated: ${new Date().toLocaleDateString('en', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} at ${new Date().toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })}</div></div>
    <div style="text-align:right;font-size:.7rem;color:#888;font-family:'Courier New',monospace">Period: ${document.getElementById('fS').value} to ${document.getElementById('fE').value}<br>Category: ${document.getElementById('fC').value}<br>Orders: ${orders.length}</div>
  </div>`;
  dash.prepend(rh);
  // Temporarily show header for existing logo
  const header = dash.querySelector('.header');
  if (header) header.style.display = 'none';

  setTimeout(() => {
    const opt = {
      margin: [10, 10, 10, 10],
      filename: `VikriDrishti_Report_${new Date().toISOString().split('T')[0]}.pdf`,
      image: { type: 'jpeg', quality: .95 },
      html2canvas: { scale: 2, useCORS: true, scrollY: 0, windowHeight: dash.scrollHeight },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };
    html2pdf().set(opt).from(dash).save().then(() => {
      // Restore UI
      hide.forEach(el => el.style.visibility = '');
      if (header) header.style.display = '';
      const ph = document.getElementById('pdf-header'); if (ph) ph.remove();
      btn.innerHTML = '<i class="fas fa-file-pdf"></i> Report'; btn.disabled = false;
    }).catch(() => {
      hide.forEach(el => el.style.visibility = '');
      if (header) header.style.display = '';
      const ph = document.getElementById('pdf-header'); if (ph) ph.remove();
      btn.innerHTML = '<i class="fas fa-file-pdf"></i> Report'; btn.disabled = false;
      alert('PDF generation failed. Try again.');
    });
  }, 500);
}

// ===== REFRESH =====
let isRefreshing = false;
function refresh() {
  if (isRefreshing) return;
  isRefreshing = true;
  
  const lb = document.getElementById('loadBar');
  if (lb) { lb.classList.add('active'); lb.style.width = '30%'; }

  requestAnimationFrame(() => {
    try {
      const f = getF(), p = getP();
      if (lb) lb.style.width = '60%';
      
      renderKPIs(f, p);
      renderROT(f);
      renderRev(f);
      const fd = renderFC(f);
      renderCat(f);
      renderHeatmaps(f);
      const us = renderPred(f, fd);
      renderTbl(f);
      renderFun(f);
      renderCoh();
      renderRFM(f, us);
      renderAd(f);
      
      if (lb) { 
        lb.style.width = '100%'; 
        setTimeout(() => { lb.classList.remove('active'); lb.style.width = '0'; isRefreshing = false; }, 300);
      } else {
        isRefreshing = false;
      }
    } catch (err) {
      console.error("Dashboard Refresh Error:", err);
      isRefreshing = false;
      if (lb) { lb.classList.remove('active'); lb.style.width = '0'; }
      alert("Dashboard crashed while refreshing data: " + err.message);
    }
  });
}

// ===== INIT =====
document.getElementById('fS').addEventListener('change', refresh);
document.getElementById('fE').addEventListener('change', refresh);
document.getElementById('fC').addEventListener('change', refresh);
document.getElementById('mB').addEventListener('click', e => { if (e.target === e.currentTarget) closeM() });

if (document.fonts) {
  document.fonts.ready.then(() => {
    popCats(); setupUpload(); refresh();
  });
} else {
  popCats(); setupUpload(); refresh();
}
