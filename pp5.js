const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  
  const consoleLogs = [];
  page.on('console', msg => consoleLogs.push(msg.text()));
  page.on('pageerror', err => consoleLogs.push('PAGE ERROR: ' + err.toString()));

  await page.goto('file:///d:/sales%20dashboard/index.html', {waitUntil: 'networkidle0'});
  
  // Upload real file
  const elementHandle = await page.$('#uF');
  if (elementHandle) {
    await elementHandle.uploadFile('d:/sales dashboard/test_sales.csv');
    await new Promise(r => setTimeout(r, 2000));
  } else {
    consoleLogs.push("COULD NOT FIND FILE UPLOAD INPUT #uF");
  }
  
  const hasAppJsElements = await page.evaluate(() => {
    return {
      hasInitRotMode: typeof rotMode !== 'undefined'
    }
  });

  console.log("APP.JS LOADED:", hasAppJsElements);
  console.log("CONSOLE LOGS:", consoleLogs);
  
  await browser.close();
})();
