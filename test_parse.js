const fs = require('fs');

const csv = fs.readFileSync('test_sales.csv', 'utf8');

const lines = csv.split('\n').map(l => l.trim()).filter(l => l);
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

let localNxId = 1;
const newOrders = [];

function rndF() { return [] }
function rnd(a,b) { return a; }

rows.forEach(r => {
  const dt = r[dateCol];
  let amtStr = (r[amtCol] || '').toString().replace(/[^0-9.-]+/g, "");
  const amt = parseFloat(amtStr);
  if (!dt || isNaN(amt) || amt <= 0) return;

  let dateObj = new Date(dt);
  if (isNaN(dateObj)) {
    const m = dt.match(/^(\d{1,4})[\/\-](\d{1,2})[\/\-](\d{1,4})$/);
    if (m) {
      //... simulation of app.js date processing ...
    }
  }
  if (isNaN(dateObj)) return; // Invalid date
  const date = dateObj.toISOString().split('T')[0];

  newOrders.push({ ...r, id: localNxId++, date, userId: r[custCol] || 'C' + rnd(1, 20), category: r[catCol] || 'General', amount: amt, features: rndF() });
});

console.log('Original Headers:', originalHeaders);
console.log('Detected Cols:', {dateCol, amtCol, catCol, custCol});
console.log('First order:', newOrders[0]);
console.log('Total valid orders:', newOrders.length);
