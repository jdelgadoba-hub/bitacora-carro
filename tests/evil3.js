// Ataque a la parte nueva: nombres "otro" con código en frecuencia/resumen, tipos raros, intervalos límite, años extremos
const { chromium, devices } = require('playwright'); const fs=require('fs');
const X='<img src=x onerror="window.__pwned=1">';
fs.writeFileSync('e3.json', JSON.stringify({app:"bitacora-carro",format:1,exportedAt:"2026-10-28T00:00:00Z",records:[
 {id:"v1",kind:"vehicle",name:X,odo:20000,odoDate:"2026-10-01"},
 {id:"r1",kind:"reading",vid:"v1",date:"1900-01-01",km:1},
 {id:"s1",kind:"service",vid:"v1",type:"otro",other:X,date:"2026-01-01",km:10000,nextKm:10500,cost:1},
 {id:"s2",kind:"service",vid:"v1",type:"constructor",date:"2026-02-01",km:11000,nextKm:11499,nextDate:"2026-02-28"},
 {id:"s3",kind:"service",vid:"v1",type:"aceite",date:"2100-12-31",km:1e12,nextKm:1e12,cost:1e12},
 {id:"s4",kind:"service",vid:"v1",type:"toString",date:"2026-03-01",km:12000,nextKm:20000}
]}));
(async()=>{
  const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined});
  const p=await (await b.newContext({...devices['iPhone 13']})).newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  const T=s=>(s||'').replace(/\s+/g,' ').trim();
  await p.goto('http://localhost:'+(process.env.PORT||8766)+'/'); await p.waitForTimeout(400);
  await p.setInputFiles('#restore-file','e3.json'); await p.waitForTimeout(300); await p.tap('#f-restore button[type=submit]'); await p.waitForTimeout(800);
  console.log('pwned:', await p.evaluate(()=>window.__pwned||0), '| <img> inyectados:', await p.evaluate(()=>document.querySelectorAll('.wrap img').length), '| proto:', await p.evaluate(()=>Object.prototype.toString.call({})));
  console.log('al año:', T(await p.textContent('.budget')).slice(0,330));
  console.log('años en resumen:', await p.$$eval('table.years tbody tr',r=>r.length), '| errores:', errs);
  await b.close();
})();
