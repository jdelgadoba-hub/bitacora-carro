// Foto del vehículo: privacidad (sin EXIF/GPS), tamaño, archivos inválidos, quitar, respaldo y restauración.
const { chromium, devices } = require('playwright'); const fs=require('fs');
const T=s=>(s||'').replace(/\s+/g,' ').trim();
const storedPhoto = p => p.evaluate(()=>new Promise(res=>{ const r=indexedDB.open('bitacora-carro'); r.onsuccess=()=>{ const g=r.result.transaction('records').objectStore('records').getAll(); g.onsuccess=()=>res((g.result.find(x=>x.kind==='vehicle')||{}).photo||null); }; }));
(async()=>{
  const b=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined});
  const ctx=await b.newContext({...devices['iPhone 13'], acceptDownloads:true}); const p=await ctx.newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
  await p.addInitScript(()=>{ navigator.canShare=undefined; });
  await p.goto('http://localhost:'+(process.env.PORT||8766)+'/'); await p.waitForTimeout(400);
  await p.tap('text=Agregar vehículo'); await p.fill('#c-name','Corolla'); await p.fill('#c-odo','50000');
  for (const f of ['notimg.txt','fake.jpg','big.png']) { await p.setInputFiles('#c-photo', f); await p.waitForTimeout(1500); console.log(`archivo ${f}:`, T(await p.textContent('#c-photo-hint')), '| vista previa:', await p.isVisible('#c-photo-prev')); }
  await p.setInputFiles('#c-photo','gps.jpg'); await p.waitForTimeout(1500);
  console.log('foto real:', T(await p.textContent('#c-photo-hint')), '| vista previa:', await p.isVisible('#c-photo-prev'));
  await p.tap('#f-car button[type=submit]'); await p.waitForTimeout(500);
  console.log('foto en tarjeta:', await p.isVisible('.car .car-photo'));
  const ph=await storedPhoto(p); const bytes=Buffer.from(ph.split(',')[1],'base64');
  const dims=await p.evaluate(src=>new Promise(r=>{ const i=new Image(); i.onload=()=>r(i.naturalWidth+'x'+i.naturalHeight); i.src=src; }), ph);
  console.log('guardada:', ph.slice(0,23), '| tamaño:', Math.round(bytes.length/1024)+' KB', '| dimensiones:', dims);
  console.log('EXIF eliminado:', !bytes.includes(Buffer.from('Exif')), '| marca/modelo eliminados:', !bytes.includes(Buffer.from('TestPhoneMaker')) && !bytes.includes(Buffer.from('SecretModel')));
  // respaldo -> borrar todo -> restaurar
  const [dl]=await Promise.all([p.waitForEvent('download'), p.$eval('#btn-backup',x=>x.click())]); const bk=await dl.path(); fs.copyFileSync(bk,'photo-backup.json');
  console.log('respaldo incluye foto:', JSON.parse(fs.readFileSync('photo-backup.json','utf8')).records.some(r=>r.photo && r.photo.startsWith('data:image/jpeg')));
  await p.evaluate(()=>new Promise(res=>{ const r=indexedDB.open('bitacora-carro'); r.onsuccess=()=>{ const t=r.result.transaction('records','readwrite'); t.objectStore('records').clear(); t.oncomplete=res; }; }));
  await p.reload(); await p.waitForTimeout(500);
  await p.setInputFiles('#restore-file','photo-backup.json'); await p.waitForTimeout(400); await p.tap('#f-restore button[type=submit]'); await p.waitForTimeout(600);
  console.log('restaurada:', await p.isVisible('.car .car-photo'));
  // quitar foto
  await p.$eval('.car .iconbtn:last-child',x=>x.click()); await p.tap('#c-photo-del'); await p.tap('#f-car button[type=submit]'); await p.waitForTimeout(500);
  console.log('tras quitar -> tarjeta:', await p.isVisible('.car .car-photo'), '| guardada:', await storedPhoto(p));
  console.log('overflow:', await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth), '| errores:', errs);
  await b.close();
})();
