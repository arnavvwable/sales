const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  // Attach console log
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));

  await page.goto('file:///d:/sales%20dashboard/index.html');
  await new Promise(r => setTimeout(r, 1000));
  
  // Try uploading test file
  const elementHandle = await page.$('input[type=file]');
  await elementHandle.uploadFile('d:/sales dashboard/test_sales.csv');
  
  await new Promise(r => setTimeout(r, 1000));

  // Check the DOM for a chart
  const hasRotChart = await page.evaluate(() => {
    const canvas = document.getElementById('rotC');
    // Using simple element checking instead of Chart instance since it might be destroyed
    return {
      canvasExists: !!canvas,
      canvasHeight: canvas ? canvas.height : null,
      canvasStyle: canvas ? canvas.getAttribute('style') : null
    };
  });
  console.log('ROT Chart State:', hasRotChart);
  
  // See what getF() equals
  const filterSummary = await page.evaluate(() => {
    try {
      const f = getF();
      return { length: f.length, firstDate: f[0] && f[0].date };
    } catch(e) {
      return e.message;
    }
  });
  console.log('Filtered data length:', filterSummary);

  const errors = await page.evaluate(() => {
    try {
      refresh();
      return "refresh ran";
    } catch(e) {
      return e.message;
    }
  });
  console.log('Refresh call result:', errors);
  
  await browser.close();
})();
