const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 1000 });
  
  const consoleLogs = [];
  page.on('console', msg => consoleLogs.push(msg.text()));
  page.on('pageerror', err => consoleLogs.push('PAGE ERROR: ' + err.toString()));

  // bypass auth
  await page.evaluateOnNewDocument(() => {
    localStorage.setItem('auth', 'true');
  });

  await page.goto('file:///d:/sales%20dashboard/index.html', {waitUntil: 'networkidle0'});
  
  // Upload real file 1st time
  const elementHandle = await page.$('#uF');
  if (elementHandle) {
    await elementHandle.uploadFile('d:/sales dashboard/test_sales.csv');
    
    // Check for load bar
    await new Promise(r => setTimeout(r, 500));
    const loadBarActive = await page.evaluate(() => document.getElementById('loadBar').classList.contains('active'));
    console.log("LOAD BAR ACTIVE DURING UPLOAD:", loadBarActive);

    await new Promise(r => setTimeout(r, 2000));
    
    // Check chart status
    const chartData = await page.evaluate(() => {
      return {
        rotC: document.getElementById('rotC').clientHeight,
        rC: document.getElementById('rC').clientHeight,
        ordersCount: document.querySelectorAll('#oT tr').length
      };
    });
    console.log("CHART DATA:", chartData);
    
    // Test CLEAR ALL
    await page.evaluate(() => {
        window.confirm = () => true;
        document.querySelector('.btn-del').click();
    });
    await new Promise(r => setTimeout(r, 1000));
    
    const ordersAfterClear = await page.evaluate(() => document.querySelectorAll('#oT tr').length);
    console.log("ORDERS AFTER CLEAR ALL:", ordersAfterClear);
  }

  if (consoleLogs.length > 0) console.log("INTERNAL LOGS:", consoleLogs);
  await browser.close();
})();
