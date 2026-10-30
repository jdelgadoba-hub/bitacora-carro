const { chromium, devices } = require('playwright'); const fs=require('fs');
(async()=>{
  const XSS='<img src=x onerror="window.__pwned=1">"><svg onload=window.__pwned=2>';
  const evil={app:"bitacora-carro",format:1,exportedAt:"2026-10-01T00:00:00Z",records:[
    {id:"v1",kind:"vehicle",name:XSS,make:XSS,model:"m",plate:XSS,odo:1000,"__proto__":{polluted:1}},
    {id:"s1",kind:"service",vid:"v1",type:"__proto__",date:"2026-01-01",km:900,parts:"=HYPERLINK(\"http://evil\",\"x\")",shop:"+cmd|' /C calc'!A0",notes:XSS,nextKm:2000},
    {id:"s2",kind:"service",vid:"v1",type:"constructor",date:"9999-99-99",km:-5,nextDate:"2026-13-45",cost:"1e999"},
    {id:"s3",kind:"service",vid:"OTRO",type:"aceite",date:"2026-01-01"},
    {id:"x".repeat(500),kind:"vehicle",name:"largo"},
    {id:"v9",kind:"admin",name:"tipo desconocido"}
  ]};
  fs.writeFileSync('evil.json',JSON.stringify(evil).replace('"__proto__":{"polluted":1}','"__proto__":{"polluted":1}'));
  const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined});
  const ctx=await b.newContext({...devices['iPhone 13'],acceptDownloads:true}); const p=await ctx.newPage(); await p.addInitScript(()=>{ navigator.canShare=undefined; }); const errs=[];
  p.on('pageerror',e=>errs.push(e.message));
  await p.goto('http://localhost:'+(process.env.PORT||8766)+'/'); await p.waitForTimeout(300);
  await p.setInputFiles('#restore-file','evil.json'); await p.waitForTimeout(300);
  console.log('resumen:', await p.textContent('#r-summary'));
  await p.click('#f-restore button[type=submit]'); await p.waitForTimeout(600);
  console.log('pwned:', await p.evaluate(()=>window.__pwned||0), '| proto polluted:', await p.evaluate(()=>({}).polluted||0));
  console.log('img/svg inyectados:', await p.evaluate(()=>document.querySelectorAll('.wrap img,.wrap svg').length));
  console.log('vencimientos:', (await p.textContent('#due')).replace(/\s+/g,' ').slice(0,200));
  console.log('historial:', (await p.textContent('#log')).replace(/\s+/g,' ').slice(0,250));
  await p.evaluate(()=>{ const o=URL.createObjectURL; URL.createObjectURL=b=>{ b.text().then(t=>window.__csv=t); return o(b); }; });
  await p.$eval('#btn-csv',b=>b.click()); await p.waitForTimeout(800);
  console.log('CSV:\n'+(await p.evaluate(()=>window.__csv||'(sin archivo)')).slice(1,600));
  // CSP: intentar conexión externa
  console.log('fetch externo:', await p.evaluate(()=>fetch('https://example.com').then(()=>'PERMITIDO',e=>'bloqueado')));
  console.log('errores JS:', errs);
  await b.close();
})();
