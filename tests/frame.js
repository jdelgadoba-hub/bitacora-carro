const { chromium } = require('playwright');
(async()=>{
  const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined});
  const p=await b.newPage();
  await p.setContent('<iframe src="http://localhost:'+(process.env.PORT||8766)+'/" width="400" height="300"></iframe>'); await p.waitForTimeout(1500);
  console.log('dentro de iframe:', (await p.frames()[1].textContent('body')).trim().slice(0,80));
  await b.close();
})();
