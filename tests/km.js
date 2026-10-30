const { chromium, devices } = require('playwright');
(async()=>{
  const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined});
  const p=await (await b.newContext({...devices['iPhone 13']})).newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  const T=s=>s.replace(/\s+/g,' ').trim();
  await p.goto('http://localhost:'+(process.env.PORT||8766)+'/'); await p.waitForTimeout(500);
  await p.setInputFiles('#restore-file','km.json'); await p.waitForTimeout(300);
  console.log('restaurar:', await p.textContent('#r-summary'));
  await p.tap('#f-restore button[type=submit]'); await p.waitForTimeout(600);
  console.log('stats:', T(await p.textContent('#mileage .stats')));
  console.log('tabla:', T(await p.$eval('#mileage details.tbl table', t=>t.textContent)).slice(0,300));
  console.log('readout:', T(await p.textContent('.readout')));
  console.log('notas:', T(await p.textContent('#mileage > .mi > p.hint')));
  console.log('presupuesto:', T(await p.textContent('.budget')));
  console.log('recordatorio Corolla:', await p.$('.mi-remind')!==null);
  await p.screenshot({path:require('os').tmpdir()+'/km.png',fullPage:true});
  // historical reading inconsistent with neighbours -> asks for confirmation
  await p.tap('text=Actualizar km'); await p.fill('#o-date','2026-05-01'); await p.fill('#o-km','30000'); await p.tap('#o-save'); await p.waitForTimeout(200);
  console.log('lectura histórica incoherente:', T(await p.textContent('#o-err')).slice(0,70), '|', await p.textContent('#o-save'));
  await p.fill('#o-km','18000'); await p.tap('#o-save'); await p.waitForTimeout(400);
  console.log('lectura histórica válida -> odómetro sigue:', await p.textContent('.odo-val'), '| lecturas:', (await p.$$eval('#mileage summary',s=>s.map(x=>x.textContent))).join(' / '));
  // monthly reminder on second vehicle (last reading in September)
  await p.tap('.chip >> text=Moto'); await p.waitForTimeout(200);
  console.log('recordatorio Moto:', T(await p.textContent('.mi-remind')), '| stats:', T(await p.textContent('#mileage .stats')));
  await p.tap('.mi-remind button'); await p.fill('#o-km','6500'); await p.tap('#o-save'); await p.waitForTimeout(400);
  console.log('tras registrar -> recordatorio:', await p.$('.mi-remind')!==null, '| stats:', T(await p.textContent('#mileage .stats')));
  console.log('overflow:', await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth), '| errores:', errs);
  await b.close();
})();
