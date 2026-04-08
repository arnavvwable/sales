const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  const consoleLogs = [];
  page.on('console', msg => consoleLogs.push(msg.text()));

  await page.goto('file:///d:/sales%20dashboard/index.html', {waitUntil: 'networkidle0'});
  
  // Upload real file
  const elementHandle = await page.$('#uF');
  await elementHandle.uploadFile('d:/sales dashboard/test_sales.csv');
  
  await new Promise(r => setTimeout(r, 1000));
  
  const chartStates = await page.evaluate(() => {
    return {
      rotCanvasExists: !!document.getElementById('rotC'),
      rotChartIsInstanceOfChart: rotCI2 && (typeof rotCI2.destroy === 'function'),
      rotData: rotCI2 ? rotCI2.data.datasets[0].data : null,
      rotLabels: rotCI2 ? rotCI2.data.labels : null,
      revData: revCI ? revCI.data.datasets[0].data : null,
      fcData: fcCI ? fcCI.data.datasets[0].data : null,
      catData: catCI ? catCI.data.datasets[0].data : null,
      firstOrder: orders[0],
      sysCols: sysCols
    };
  });
  
  console.log("CHART STATES:", JSON.stringify(chartStates, null, 2));
  console.log("CONSOLE LOGS:", consoleLogs);
  
  await browser.close();
})();
