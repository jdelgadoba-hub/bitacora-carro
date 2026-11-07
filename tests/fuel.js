// Regresión de combustible con resultados calculados a mano (reloj fijo: sábado 7 nov 2026).
const { chromium, devices } = require('playwright');
const T=s=>(s||'').replace(/\s+/g,' ').trim();
(async()=>{
  const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined});
  const p=await (await b.newContext({...devices['iPhone 13']})).newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.clock.setFixedTime(new Date('2026-11-07T12:00:00'));
  await p.goto('http://localhost:'+(process.env.PORT||8766)+'/'); await p.waitForTimeout(400);
  await p.setInputFiles('#restore-file','fuel.json'); await p.waitForTimeout(300);
  console.log('restaurar:', await p.textContent('#r-summary'));
  await p.tap('#f-restore button[type=submit]'); await p.waitForTimeout(600);
  console.log('fuel stats:', T(await p.textContent('#fuel .stats')));
  console.log('fuel notas:', T(await p.textContent('#fuel .mi > p.hint')));
  console.log('octubre:', T(await p.$eval('#fuel details.tbl table', t=>t.textContent)).match(/Octubre[^N]*/)?.[0]);
  console.log('semanas:', T(await p.textContent('#fuel table.years')).slice(0,120));
  console.log('lista:', T(await p.textContent('#fuel .list')).slice(0,90));
  console.log('odómetro tras tanqueos:', await p.textContent('.odo-val'));
  // registrar un tanqueo desde el formulario
  await p.$eval('#btn-fuel',x=>x.click()); console.log('etiqueta unidad:', await p.textContent('#u-vol-label'));
  await p.fill('#u-km','51000'); await p.fill('#u-vol','8'); await p.fill('#u-cost','128000'); console.log('precio en vivo:', await p.textContent('#u-hint'));
  await p.tap('#u-save'); await p.waitForTimeout(200); console.log('km menor -> aviso:', T(await p.textContent('#u-err')).slice(0,60), '|', await p.textContent('#u-save'));
  await p.fill('#u-km','51500'); await p.tap('#u-save'); await p.waitForTimeout(400);
  console.log('tras guardar -> semana:', T(await p.textContent('#fuel .stats')), '| odómetro:', await p.textContent('.odo-val'));
  // cambiar a litros
  await p.$eval('.car .iconbtn:last-child',x=>x.click()); await p.selectOption('#c-unit','L'); await p.tap('#f-car button[type=submit]'); await p.waitForTimeout(400);
  console.log('en litros:', T(await p.textContent('#fuel .stats')), '| lista:', T(await p.textContent('#fuel .list')).slice(0,40));
  await p.$eval('.car .iconbtn:last-child',x=>x.click()); await p.selectOption('#c-unit','gal'); await p.tap('#f-car button[type=submit]'); await p.waitForTimeout(400);
  console.log('de vuelta a galones:', T(await p.textContent('#fuel .stats')), '| lista:', T(await p.textContent('#fuel .list')).slice(0,40));
  console.log('overflow:', await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth), '| errores:', errs);
  await b.close();
})();
