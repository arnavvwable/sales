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
  
  // Upload real file
  const elementHandle = await page.$('#uF');
  if (elementHandle) {
    await elementHandle.uploadFile('d:/sales dashboard/test_sales.csv');
    await new Promise(r => setTimeout(r, 2000)); // wait for transitions
    
    // Check if the dataset UI pill was injected properly
    const datasetHtml = await page.$eval('#uR', el => el.innerHTML);
    
    await page.screenshot({ path: 'd:/sales dashboard/dashboard_multiple.png', fullPage: true });
    
    console.log("SUCCESS. UR HTML:", datasetHtml.substring(0, 50) + "...");
  } else {
    console.log("FAILED TO FIND uF");
  }

  if (consoleLogs.length > 0) {
    console.log("LOGS:", consoleLogs);
  }
  await browser.close();
})();
