const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  // Attach console log
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));

  await page.goto('file:///d:/sales%20dashboard/index.html', {waitUntil: 'networkidle0'});
  
  const csvContent = fs.readFileSync('test_sales.csv', 'utf8');
  
  // Inject exactly what parseCSV does but avoid file reader
  const result = await page.evaluate((csv) => {
    try {
      // Simulate FileReader result
      const e = { target: { result: csv } };
      
      const lines = e.target.result.split('\n').map(l => l.trim()).filter(l => l);
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

      const oldOrders = [...orders];
      const newOrders = [];
      let localNxId = 1;

      rows.forEach(r => {
        const dt = r[dateCol];
        let amtStr = (r[amtCol] || '').toString().replace(/[^0-9.-]+/g, "");
        const amt = parseFloat(amtStr);
        if (!dt || isNaN(amt) || amt <= 0) return;

        let dateObj = new Date(dt);
        const date = dateObj.toISOString().split('T')[0];

        newOrders.push({ ...r, id: localNxId++, date, userId: r[custCol] || 'C' + rnd(1, 20), category: r[catCol] || 'General', amount: amt, features: rndF() });
      });

      sysCols.dt = dateCol || 'Date';
      sysCols.amt = amtCol || 'Amount';
      sysCols.cat = catCol || 'Category';
      sysCols.cust = custCol || 'Customer';
      sysCols.all = originalHeaders;

      orders = newOrders;
      nxId = localNxId;

      const dates = orders.map(o => o.date).sort();
      document.getElementById('fS').value = dates[0];
      document.getElementById('fE').value = dates[dates.length - 1];

      popCats();
      refresh();
      
      const rotCanvas = document.getElementById('rotC');
      return {
        success: true,
        ordersLength: orders.length,
        filterLength: getF().length,
        canvasHeight: rotCanvas.height,
        canvasWidth: rotCanvas.width,
        chartInstanceExists: !!Chart.getChart('rotC')
      };
    } catch(err) {
      return { error: err.message, stack: err.stack };
    }
  }, csvContent);
  
  console.log('Result:', result);
  await browser.close();
})();
