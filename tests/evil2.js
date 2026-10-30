const { chromium, devices } = require('playwright'); const fs=require('fs');
const XSS='<img src=x onerror="window.__pwned=1">';
function backup(records){ return JSON.stringify({app:"bitacora-carro",format:1,exportedAt:"2026-10-28T00:00:00Z",records}); }
// A: inyección y tipos raros en lecturas + colisión de IDs
fs.writeFileSync('e2a.json', backup([
  {id:"v1",kind:"vehicle",name:"Carro",odo:20000,odoDate:"2026-10-01"},
  {id:"r1",kind:"reading",vid:"v1",date:"2026-01-01",km:10000,note:XSS,"__proto__":{x:1}},
  {id:"r2",kind:"reading",vid:"v1",date:XSS,km:12000},
  {id:"r3",kind:"reading",vid:"v1",date:"2026-03-01",km:"15000"},
  {id:"r4",kind:"reading",vid:"v1",date:"2026-04-01",km:-5},
  {id:"r5",kind:"reading",vid:"v1",date:"2026-05-01",km:1e308},
  {id:"v1",kind:"reading",vid:"v1",date:"2026-06-01",km:18000},          // ID del vehículo
  {id:"s1",kind:"service",vid:"v1",type:"aceite",date:"2026-01-01",km:10000,nextKm:10000.0001,cost:1e15},
  {id:"s2",kind:"service",vid:"v1",type:"filtro_aire",date:"2026-01-01",km:10000,nextDate:"2026-01-02",cost:50000}
]));
// B: volumen: 30.000 lecturas y fechas extremas 1900-2100
const recs=[{id:"v1",kind:"vehicle",name:"Volumen",odo:0,odoDate:null}];
for(let i=0;i<30000;i++){ const d=new Date(Date.UTC(1900,0,1)+i*2.4*86400000).toISOString().slice(0,10); recs.push({id:"r"+i,kind:"reading",vid:"v1",date:d,km:i*50}); }
recs.push({id:"rz",kind:"reading",vid:"v1",date:"2100-12-31",km:9999999});
fs.writeFileSync('e2b.json', backup(recs));
(async()=>{
  const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined});
  const T=s=>(s||'').replace(/\s+/g,' ').trim();
  for (const f of ['e2a.json','e2b.json']){
    const p=await (await b.newContext({...devices['iPhone 13']})).newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
    await p.goto('http://localhost:'+(process.env.PORT||8766)+'/'); await p.waitForTimeout(400);
    await p.setInputFiles('#restore-file',f); await p.waitForTimeout(500);
    const open=await p.isVisible('#dlg-restore');
    console.log(`\n[${f}] (${(fs.statSync(f).size/1e6).toFixed(2)} MB) resumen:`, open ? await p.textContent('#r-summary') : '(rechazado) '+T(await p.textContent('.toast').catch(()=>'')));
    if(!(await p.isVisible('#dlg-restore'))){ await p.close(); continue; }
    const t0=Date.now(); await p.tap('#f-restore button[type=submit]'); await p.waitForSelector('#mileage .mi',{timeout:30000}); const ms=Date.now()-t0;
    console.log('restaurar+dibujar:', ms,'ms | pwned:', await p.evaluate(()=>window.__pwned||0), '| proto:', await p.evaluate(()=>({}).x||0), '| <img> inyectados:', await p.evaluate(()=>document.querySelectorAll('.wrap img').length));
    console.log('vehículo intacto:', T(await p.textContent('.car-name').catch(()=>'NO')), '| stats:', T(await p.textContent('#mileage .stats')));
    console.log('lecturas:', T(await p.$$eval('#mileage summary',s=>s.map(x=>x.textContent).join(' / '))), '| años en selector:', await p.$$eval('#year option',o=>o.length));
    console.log('presupuesto:', T(await p.textContent('.budget')).slice(0,220));
    const t1=Date.now(); if(await p.isVisible('#year')) await p.selectOption('#year', {index:0}); const ms2=Date.now()-t1;
    console.log('cambio de año:', ms2, 'ms | overflow:', await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth), '| errores:', errs);
    await p.close();
  }
  await b.close();
})();
