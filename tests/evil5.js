// Pentest de fotos en respaldos manipulados: esquemas peligrosos, SVG, HTML, URL externas, ruptura de atributos, tamaño.
const { chromium, devices } = require('playwright'); const fs=require('fs');
const tiny='data:image/jpeg;base64,'+fs.readFileSync('tiny.jpg').toString('base64');
const svg='data:image/svg+xml;base64,'+Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" onload="window.__pwned=1"><script>window.__pwned=2</script></svg>').toString('base64');
const veh=(id,photo)=>({id,kind:"vehicle",name:id,odo:1000,odoDate:"2026-10-01",photo});
fs.writeFileSync('e5.json', JSON.stringify({app:"bitacora-carro",format:1,exportedAt:"2026-11-11T00:00:00Z",records:[
  veh("ok", tiny), veh("js","javascript:window.__pwned=3"), veh("svg",svg), veh("http","http://evil.example/x.jpg"),
  veh("html","data:text/html;base64,PHNjcmlwdD53aW5kb3cuX19wd25lZD00PC9zY3JpcHQ+"), veh("attr",'data:image/jpeg;base64,AA" onerror="window.__pwned=5'),
  veh("huge",'data:image/jpeg;base64,'+'A'.repeat(800000)), veh("obj",{src:tiny}), veh("nl",tiny+"\n")
]}));
(async()=>{
  const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined});
  const p=await (await b.newContext({...devices['iPhone 13']})).newPage(); const errs=[], ext=[];
  p.on('pageerror',e=>errs.push(e.message)); p.on('request',r=>{ if(!r.url().startsWith('http://localhost')&&!r.url().startsWith('data:')) ext.push(r.url()); });
  await p.goto('http://localhost:'+(process.env.PORT||8766)+'/'); await p.waitForTimeout(400);
  await p.setInputFiles('#restore-file','e5.json'); await p.waitForTimeout(400); await p.tap('#f-restore button[type=submit]'); await p.waitForTimeout(700);
  const withPhoto=[];
  for (const name of ['ok','js','svg','http','html','attr','huge','obj','nl']) {
    await p.tap(`.chip >> text="${name}"`); await p.waitForTimeout(150);
    if(await p.isVisible('.car .car-photo')) withPhoto.push(name);
  }
  console.log('vehículos con foto mostrada:', withPhoto.join(','));
  console.log('pwned:', await p.evaluate(()=>window.__pwned||0), '| peticiones externas:', ext.length, '| errores:', JSON.stringify(errs));
  await b.close();
})();
