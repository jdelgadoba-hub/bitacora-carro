const { chromium, devices } = require('playwright');
const T=s=>(s||'').replace(/\s+/g,' ').trim();
async function run(b, label, file, clock){
  const ctx=await b.newContext({...devices['iPhone 13']}); const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  if(clock) await p.clock.setFixedTime(new Date(clock));
  await p.goto('http://localhost:'+(process.env.PORT||8766)+'/'); await p.waitForTimeout(400);
  await p.setInputFiles('#restore-file',file); await p.waitForTimeout(300); await p.tap('#f-restore button[type=submit]'); await p.waitForTimeout(600);
  console.log(`\n== ${label} ==`);
  console.log('aviso:', T(await p.textContent('.mi-remind').catch(()=>'(ninguno)')));
  console.log('selector de año:', await p.isVisible('#year') ? await p.$$eval('#year option',o=>o.map(x=>x.textContent).join(',')) + ' (elegido '+await p.inputValue('#year')+')' : 'oculto');
  console.log('stats:', T(await p.textContent('#mileage .stats')));
  console.log('aceite:', T(await p.textContent('.oil').catch(()=>'(sin bloque)')));
  console.log('al año:', T(await p.textContent('.budget')));
  console.log('resumen:', T(await p.textContent('table.years')));
  if(await p.isVisible('#year')){ await p.selectOption('#year','2026'); await p.waitForTimeout(200);
    console.log('eligiendo 2026 -> stats:', T(await p.textContent('#mileage .stats')), '| aceite:', T(await p.textContent('.oil span'))); }
  console.log('overflow:', await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth), '| errores:', errs);
  if(label.startsWith('A')) await p.screenshot({path:require('os').tmpdir()+'/yr.png',fullPage:true});
  await ctx.close();
}
(async()=>{
  const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined});
  await run(b,'A. Datos de ejemplo (hoy)','km.json');
  await run(b,'B. Diciembre (10 dic 2026), aceite sin intervalo propio','dic.json','2026-12-10T12:00:00');
  await run(b,'C. Cambio de año - 15 ene 2027','yr.json','2027-01-15T12:00:00');
  await b.close();
})();
