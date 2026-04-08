const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  
  const consoleLogs = [];
  page.on('console', msg => consoleLogs.push(msg.text()));

  await page.goto('file:///d:/sales%20dashboard/index.html', {waitUntil: 'networkidle0'});
  
  // Upload real file
  const elementHandle = await page.$('#uF');
  if (elementHandle) {
    await elementHandle.uploadFile('d:/sales dashboard/test_sales.csv');
    // Wait for refresh to complete
    await new Promise(r => setTimeout(r, 2000));
  } else {
    consoleLogs.push("COULD NOT FIND FILE UPLOAD INPUT #uF");
  }
  
  const chartStates = await page.evaluate(() => {
    return {
      ordersLength: (typeof orders !== 'undefined') ? orders.length : -1,
      fLength: typeof getF === 'function' ? getF().length : -1,
      rotCanvasExists: !!document.getElementById('rotC'),
      rotChartExists: rotCI2 !== null,
      rotLabels: rotCI2 ? rotCI2.data.labels : null,
      sysCols: typeof sysCols !== 'undefined' ? sysCols : null
    };
  });
  
  console.log("CHART STATES:", JSON.stringify(chartStates, null, 2));
  console.log("CONSOLE LOGS:", consoleLogs);
  
  await browser.close();
})();
