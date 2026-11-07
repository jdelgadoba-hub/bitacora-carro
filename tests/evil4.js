// Pentest de combustible: XSS, tipos raros, valores absurdos, ID repetido, fechas futuras, fórmulas CSV, rendimiento imposible.
const { chromium, devices } = require('playwright'); const fs=require('fs');
const X='<img src=x onerror="window.__pwned=1">';
fs.writeFileSync('e4.json', JSON.stringify({app:"bitacora-carro",format:1,exportedAt:"2026-11-07T00:00:00Z",records:[
 {id:"v1",kind:"vehicle",name:"Carro",odo:10000,odoDate:"2026-10-01",fuelUnit:"<script>"},
 {id:"g1",kind:"fuel",vid:"v1",date:"2026-10-01",km:10000,vol:10,cost:100000,full:true,station:X},
 {id:"g2",kind:"fuel",vid:"v1",date:"2026-10-10",km:10400,vol:10,cost:100000,full:true,station:"=HYPERLINK(\"http://evil\",\"x\")"},
 {id:"g3",kind:"fuel",vid:"v1",date:"2026-10-12",km:60000,vol:1,cost:1,full:true,station:"rendimiento imposible"},
 {id:"g4",kind:"fuel",vid:"v1",date:"2026-10-13",vol:0,cost:5,full:true},
 {id:"g5",kind:"fuel",vid:"v1",date:"2026-10-13",vol:-3,cost:5},
 {id:"g6",kind:"fuel",vid:"v1",date:"2026-10-13",vol:"10",cost:5},
 {id:"g7",kind:"fuel",vid:"v1",date:"2026-10-13",vol:5000,cost:5},
 {id:"g8",kind:"fuel",vid:"v1",date:"2026-10-13",vol:5,cost:1e15},
 {id:"g9",kind:"fuel",vid:"v1",date:"2026-10-14",vol:5,cost:50000,full:"true",km:"x"},
 {id:"v1",kind:"fuel",vid:"v1",date:"2026-10-15",vol:5,cost:5},
 {id:"g10",kind:"fuel",vid:"v1",date:"2099-01-01",km:9000,vol:5,cost:999999999,full:true},
 {id:"g11",kind:"fuel",vid:"OTRO",date:"2026-10-15",vol:5,cost:5},
 {id:"g12",kind:"fuel",vid:"v1",date:"2026-02-30",vol:5,cost:5}
]}));
(async()=>{
  const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined});
  const p=await (await b.newContext({...devices['iPhone 13']})).newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  const T=s=>(s||'').replace(/\s+/g,' ').trim();
  await p.clock.setFixedTime(new Date('2026-11-07T12:00:00'));
  await p.addInitScript(()=>{ navigator.canShare=undefined; });
  await p.goto('http://localhost:'+(process.env.PORT||8766)+'/'); await p.waitForTimeout(400);
  await p.setInputFiles('#restore-file','e4.json'); await p.waitForTimeout(300);
  console.log('resumen:', await p.textContent('#r-summary'));
  await p.tap('#f-restore button[type=submit]'); await p.waitForTimeout(700);
  console.log('pwned:', await p.evaluate(()=>window.__pwned||0), '| <img> inyectados:', await p.evaluate(()=>document.querySelectorAll('.wrap img').length));
  console.log('vehículo intacto:', T(await p.textContent('.car-name').catch(()=>'NO')), '| unidad:', await p.textContent('#fuel .stats small:last-child'));
  console.log('stats:', T(await p.textContent('#fuel .stats')));
  console.log('tanqueos:', T(await p.$eval('#fuel h2:last-of-type',x=>x.textContent).catch(()=>'')), '|', T(await p.$$eval('#fuel h2',h=>h.map(x=>x.textContent).join(' / '))));
  await p.evaluate(()=>{ const o=URL.createObjectURL; URL.createObjectURL=b=>{ b.text().then(t=>window.__csv=t); return o(b); }; });
  await p.$eval('#btn-csv',b=>b.click()); await p.waitForTimeout(600);
  const csv=await p.evaluate(()=>window.__csv||''); console.log('CSV estación con fórmula:', (csv.match(/"'=HYPERLINK[^\n]*/)||['NO NEUTRALIZADA'])[0].slice(0,40));
  console.log('fetch externo:', await p.evaluate(()=>fetch('https://example.com').then(()=>'PERMITIDO',()=>'bloqueado')));
  console.log('overflow:', await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth), '| errores:', JSON.stringify(errs.filter(e=>!/Content Security Policy/.test(e))));
  await b.close();
})();
