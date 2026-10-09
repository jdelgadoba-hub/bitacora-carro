(function(){
"use strict";

// GitHub Pages cannot send frame-ancestors / X-Frame-Options headers, so refuse to run inside a frame.
if(window.top!==window.self){ document.body.replaceChildren(); document.body.append("Abre la Bitácora directamente, no dentro de otra página."); return; }

// ---------- local storage (IndexedDB, only on this device) ----------
const DB_NAME = "bitacora-carro", STORE = "records", META = "meta";
let idb = null;

function openDb(){
  return new Promise((resolve, reject)=>{
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = ()=>{
      const d = req.result;
      if(!d.objectStoreNames.contains(STORE)) d.createObjectStore(STORE, {keyPath:"id"});
      if(!d.objectStoreNames.contains(META)) d.createObjectStore(META);
    };
    req.onsuccess = ()=>resolve(req.result);
    req.onerror = ()=>reject(req.error);
  });
}
function tx(store, mode, fn){
  return new Promise((resolve, reject)=>{
    const t = idb.transaction(store, mode); const s = t.objectStore(store);
    let out; const r = fn(s); if(r) r.onsuccess = ()=>{ out = r.result; };
    t.oncomplete = ()=>resolve(out); t.onerror = ()=>reject(t.error); t.onabort = ()=>reject(t.error);
  });
}
const allRecords = ()=>tx(STORE,"readonly",s=>s.getAll());
const putRecord = r=>tx(STORE,"readwrite",s=>s.put(r));
const delRecord = id=>tx(STORE,"readwrite",s=>s.delete(id));
const getMeta = k=>tx(META,"readonly",s=>s.get(k));
const setMeta = (k,v)=>tx(META,"readwrite",s=>s.put(v,k));
function replaceAll(records){
  return new Promise((resolve, reject)=>{
    const t = idb.transaction(STORE,"readwrite"); const s = t.objectStore(STORE);
    s.clear(); records.forEach(r=>s.put(r));
    t.oncomplete = ()=>resolve(); t.onerror = ()=>reject(t.error); t.onabort = ()=>reject(t.error);
  });
}
const newId = ()=> (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36)+Math.random().toString(36).slice(2));

// Generic presets only to pre-fill "next due". Always defer to the owner's manual.
const TYPES = [
  ["aceite","Cambio de aceite y filtro",5000,6],
  ["filtro_aire","Filtro de aire",15000,12],
  ["filtro_cabina","Filtro de cabina (A/C)",15000,12],
  ["filtro_comb","Filtro de combustible",30000,24],
  ["banda_dist","Banda / cadena de distribución",null,null],
  ["banda_acc","Banda de accesorios",null,null],
  ["bujias","Bujías",null,null],
  ["frenos","Frenos (pastillas / discos)",null,null],
  ["liq_frenos","Líquido de frenos",null,24],
  ["refrigerante","Refrigerante",null,null],
  ["transmision","Aceite de transmisión",null,null],
  ["llantas","Llantas",null,null],
  ["rotacion","Rotación / alineación / balanceo",10000,null],
  ["bateria","Batería",null,null],
  ["suspension","Suspensión / amortiguadores",null,null],
  ["revision","Revisión general",10000,12],
  ["otro","Otro",null,null]
];
const TYPE = Object.freeze(Object.assign(Object.create(null), Object.fromEntries(TYPES.map(t=>[t[0],{label:t[1],km:t[2],mo:t[3]}]))));
const BACKUP_DAYS = 30;

const $ = s=>document.querySelector(s);
const state = { vehicles:[], services:[], sel:null, filter:"", editSvc:null, editCar:null, lastBackup:null, persisted:null, pendingRestore:null };

const nf = { format: n => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ".") };
const cf = new Intl.NumberFormat("es",{maximumFractionDigits:2});
const fmtKm = n => (n==null||n==="")?"—":nf.format(n);
const pad = n => String(n).padStart(2,"0");
const today = () => { const d=new Date(); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; };
const fmtDate = d => { if(!d) return "—"; const [y,m,day]=String(d).slice(0,10).split("-"); return `${day}/${m}/${y}`; };
const daysBetween = (a,b) => Math.round((new Date(b+"T12:00:00")-new Date(a+"T12:00:00"))/86400000);
const addMonths = (d,n) => { const x=new Date(d+"T12:00:00"); x.setMonth(x.getMonth()+n); return `${x.getFullYear()}-${pad(x.getMonth()+1)}-${pad(x.getDate())}`; };
const label = s => s.type==="otro" && s.other ? s.other : (TYPE[s.type]?.label || s.type);
const el = (tag, props={}, ...kids) => { const e=document.createElement(tag); Object.assign(e,props); kids.flat().forEach(k=>k!=null&&k!==""&&e.append(k)); return e; };

function toast(msg){ const t=el("div",{className:"toast",textContent:msg}); document.body.append(t); setTimeout(()=>t.remove(),2600); }
function remember(k,v){ try{ localStorage.setItem(k,v); }catch(e){} }
function recall(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } }

async function reload(){
  const docs = await allRecords();
  state.vehicles = docs.filter(d=>d.kind==="vehicle").sort((a,b)=>(a.createdAt||"").localeCompare(b.createdAt||""));
  state.services = docs.filter(d=>d.kind==="service");
  if(!state.vehicles.some(v=>v.id===state.sel)){
    const saved = recall("bc.sel");
    state.sel = state.vehicles.some(v=>v.id===saved) ? saved : (state.vehicles[0]?.id||null);
  }
  render();
}

// ---------- render ----------
function car(){ return state.vehicles.find(v=>v.id===state.sel) || null; }
function svcs(){ return state.services.filter(s=>s.vid===state.sel).sort((a,b)=>(b.date||"").localeCompare(a.date||"") || (b.km||0)-(a.km||0)); }

function render(){
  const chips=$("#chips"); chips.replaceChildren();
  state.vehicles.forEach(v=>{
    const b=el("button",{type:"button",className:"chip",textContent:v.name});
    b.setAttribute("aria-pressed", String(v.id===state.sel));
    b.onclick=()=>{ state.sel=v.id; remember("bc.sel",v.id); render(); };
    chips.append(b);
  });
  const add=el("button",{type:"button",className:"chip add",textContent:"+ Vehículo"}); add.onclick=()=>openCar(null); chips.append(add);

  const v=car();
  $("#btn-add").disabled = !v;
  $("#btn-csv").disabled = !v;

  const box=$("#car"); box.replaceChildren();
  if(!v){
    const b=el("button",{type:"button",className:"primary",textContent:"Agregar vehículo"}); b.onclick=()=>openCar(null);
    box.append(el("div",{className:"car"}, el("div",{className:"empty"},
      el("strong",{textContent:"Agrega tu primer vehículo"}),
      "Registra marca, placa y kilometraje. Luego anota cada cambio de aceite, banda o pieza. ¿Ya tienes un respaldo? Usa “Restaurar” abajo.",
      el("div",{style:"margin-top:12px"}, b))));
  } else {
    const list=svcs();
    const total=list.reduce((a,s)=>a+(Number(s.cost)||0),0);
    const last=list[0];
    const sub=[v.make,v.model,v.year].filter(Boolean).join(" · ");
    const editBtn=el("button",{type:"button",className:"iconbtn",textContent:"Editar"}); editBtn.onclick=()=>openCar(v);
    const odoBtn=el("button",{type:"button",className:"iconbtn",textContent:"Actualizar km"}); odoBtn.onclick=openOdo;
    box.append(el("div",{className:"car"},
      el("div",{className:"car-head"},
        el("div",{style:"min-width:0"}, el("div",{className:"car-name",textContent:v.name}), el("div",{className:"car-sub",textContent:sub||"Sin datos de modelo"})),
        v.plate ? el("div",{className:"plate",textContent:v.plate}) : null
      ),
      el("div",{className:"odo"},
        el("div",{}, el("div",{className:"odo-label",textContent:"Odómetro"}),
          el("div",{className:"odo-val"}, fmtKm(v.odo), el("span",{textContent:"km"})),
          el("div",{className:"odo-date",textContent:v.odoDate?`Actualizado ${fmtDate(v.odoDate)}`:""})),
        el("div",{style:"display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end"}, odoBtn, editBtn)
      ),
      el("div",{className:"stats"},
        el("div",{className:"stat"}, el("b",{textContent:String(list.length)}), el("small",{textContent:"Servicios"})),
        el("div",{className:"stat"}, el("b",{textContent:"$"+cf.format(total)}), el("small",{textContent:"Gastado"})),
        el("div",{className:"stat"}, el("b",{textContent:last?fmtDate(last.date).replace(/\/(\d\d)(\d\d)$/,"/$2"):"—"}), el("small",{textContent:"Último"}))
      )
    ));
  }
  renderDue(v); renderLog(v); renderDataStatus();
}

function dueItems(v){
  const latest=new Map();
  svcs().forEach(s=>{ const k=s.type==="otro"?"otro:"+(s.other||""):s.type; if(!latest.has(k)) latest.set(k,s); });
  const out=[];
  latest.forEach(s=>{
    if(!s.nextKm && !s.nextDate) return;
    const kmLeft = s.nextKm ? s.nextKm-(v.odo||0) : null;
    const dLeft = s.nextDate ? daysBetween(today(), s.nextDate) : null;
    let st="ok";
    if((kmLeft!=null&&kmLeft<=0)||(dLeft!=null&&dLeft<=0)) st="bad";
    else if((kmLeft!=null&&kmLeft<1000)||(dLeft!=null&&dLeft<30)) st="warn";
    const rank = Math.min(kmLeft!=null?kmLeft/40:Infinity, dLeft!=null?dLeft:Infinity); // ~40 km/día para ordenar
    out.push({s,kmLeft,dLeft,st,rank});
  });
  return out.sort((a,b)=>a.rank-b.rank);
}

function renderDue(v){
  const box=$("#due"); box.replaceChildren();
  if(!v){ box.append(el("div",{className:"empty",textContent:"Aquí verás lo que toca y lo que ya se pasó."})); return; }
  const items=dueItems(v);
  if(!items.length){ box.append(el("div",{className:"empty"}, el("strong",{textContent:"Nada programado"}), "Al registrar un servicio, indica el próximo km o fecha y aparecerá aquí.")); return; }
  const word={bad:"Vencido",warn:"Pronto",ok:"Al día"};
  items.forEach(({s,kmLeft,dLeft,st})=>{
    const parts=[];
    if(s.nextKm) parts.push(kmLeft<=0?`pasado por ${fmtKm(-kmLeft)} km`:`faltan ${fmtKm(kmLeft)} km (a los ${fmtKm(s.nextKm)})`);
    if(s.nextDate) parts.push(dLeft<=0?`venció el ${fmtDate(s.nextDate)}`:`antes del ${fmtDate(s.nextDate)}`);
    const r=el("button",{type:"button",className:"row",title:"Registrar este servicio"},
      el("div",{className:"row-title",textContent:label(s)}),
      el("div",{className:"row-right"}, el("span",{className:"pill "+st,textContent:word[st]})),
      el("div",{className:"row-meta",textContent:parts.join(" · ")})
    );
    r.onclick=()=>openSvc(null,s.type,s.other);
    box.append(r);
  });
}

function renderLog(v){
  const box=$("#log"); box.replaceChildren();
  const sel=$("#filter");
  const used=[...new Set(state.services.filter(s=>s.vid===state.sel).map(s=>s.type))];
  sel.replaceChildren(el("option",{value:"",textContent:"Todos los tipos"}), ...used.map(t=>el("option",{value:t,textContent:TYPE[t]?.label||t})));
  sel.value=used.includes(state.filter)?state.filter:"";
  if(!v){ box.append(el("div",{className:"empty",textContent:"Cada cambio de aceite, banda o pieza quedará anotado aquí con fecha, km y costo."})); return; }
  const list=svcs().filter(s=>!sel.value||s.type===sel.value);
  if(!list.length){ box.append(el("div",{className:"empty"}, el("strong",{textContent:"Sin registros todavía"}), "Toca “Registrar servicio” para anotar el primero.")); return; }
  list.forEach(s=>{
    const meta=[fmtDate(s.date), s.parts, s.shop].filter(Boolean).join(" · ");
    const r=el("button",{type:"button",className:"row"},
      el("div",{className:"row-title",textContent:label(s)}),
      el("div",{className:"row-right",textContent:fmtKm(s.km)+" km"}),
      el("div",{className:"row-meta"}, meta, s.cost!=null?el("span",{className:"mono",textContent:"  ·  $"+cf.format(s.cost)}):null, s.notes?el("div",{textContent:s.notes}):null)
    );
    r.onclick=()=>openSvc(s);
    box.append(r);
  });
}

function renderDataStatus(){
  const has = state.vehicles.length>0;
  const days = state.lastBackup ? daysBetween(state.lastBackup.slice(0,10), today()) : null;
  const lines=[];
  lines.push(state.lastBackup ? `Último respaldo: ${fmtDate(state.lastBackup)}${days>0?` (hace ${days} día${days===1?"":"s"})`:" (hoy)"}.` : "Aún no has hecho ningún respaldo.");
  if(state.persisted===true) lines.push("Almacenamiento persistente: activado.");
  else if(state.persisted===false) lines.push("Este navegador no garantiza conservar los datos: respalda con frecuencia.");
  lines.push("Respaldar abre el menú Compartir: elige “Guardar en Archivos” y luego iCloud Drive, Google Drive u OneDrive.");
  $("#data-status").textContent = lines.join(" ");

  const b=$("#banner");
  if(has && (days==null || days>=BACKUP_DAYS)){
    b.className="banner warn"; b.hidden=false;
    b.replaceChildren(el("span",{textContent: days==null ? "Tus datos solo están en este teléfono. Haz tu primer respaldo." : `Llevas ${days} días sin respaldar.`}),
      Object.assign(el("button",{type:"button",textContent:"Respaldar ahora"}),{onclick:backup}));
  } else if(!b.classList.contains("bad")) b.hidden=true;
}

// ---------- sheets ----------
document.querySelectorAll("[data-close]").forEach(b=>b.onclick=()=>b.closest("dialog").close());
$("#filter").onchange=e=>{ state.filter=e.target.value; renderLog(car()); };
$("#btn-add").onclick=()=>openSvc(null);

const typeSel=$("#s-type");
TYPES.forEach(([k,l])=>typeSel.append(el("option",{value:k,textContent:l})));

function presetHint(){
  const t=TYPE[typeSel.value]; $("#s-other-wrap").hidden = typeSel.value!=="otro";
  const bits=[]; if(t.km) bits.push(`${nf.format(t.km)} km`); if(t.mo) bits.push(`${t.mo} meses`);
  $("#s-hint").textContent = bits.length
    ? `Sugerencia genérica: cada ${bits.join(" o ")}. Verifica el intervalo en el manual de tu vehículo.`
    : "Este intervalo varía mucho por modelo: tómalo del manual del fabricante o de tu mecánico.";
}
function applyPreset(){
  const t=TYPE[typeSel.value]; const km=Number($("#s-km").value)||0; const d=$("#s-date").value;
  $("#s-nextkm").value = t.km && km ? km+t.km : "";
  $("#s-nextdate").value = t.mo && d ? addMonths(d,t.mo) : "";
}
typeSel.onchange=()=>{ presetHint(); if(!state.editSvc) applyPreset(); };
["#s-km","#s-date"].forEach(id=>$(id).addEventListener("change",()=>{ if(!state.editSvc) applyPreset(); }));

function armDelete(btn, armedText){
  if(btn.dataset.armed){ return true; }
  btn.dataset.armed="1"; btn.textContent=armedText; return false;
}

function openSvc(s, type, other){
  const v=car(); if(!v) return;
  state.editSvc=s||null;
  $("#svc-title").textContent = s?"Editar servicio":"Registrar servicio";
  typeSel.value = s?.type || type || "aceite";
  $("#s-other").value = s?.other || other || "";
  $("#s-date").value = s?.date || today();
  $("#s-km").value = s?.km ?? (v.odo ?? "");
  $("#s-parts").value = s?.parts || ""; $("#s-cost").value = s?.cost ?? ""; $("#s-shop").value = s?.shop || "";
  $("#s-notes").value = s?.notes || "";
  $("#s-nextkm").value = s?.nextKm ?? ""; $("#s-nextdate").value = s?.nextDate || "";
  presetHint(); if(!s) applyPreset();
  const del=$("#s-del"); del.hidden=!s; del.textContent="Eliminar"; delete del.dataset.armed;
  $("#dlg-svc").showModal();
}
$("#s-del").onclick=async e=>{
  if(!armDelete(e.currentTarget,"¿Seguro? Toca de nuevo")) return;
  const s=state.editSvc; $("#dlg-svc").close();
  try{ await delRecord(s.id); await reload(); toast("Registro eliminado"); }catch(err){ toast("No se pudo eliminar: "+err); }
};
$("#f-svc").onsubmit=async e=>{
  e.preventDefault();
  const v=car(); const num=x=>x===""?null:Number(x);
  const now=new Date().toISOString();
  const data={ kind:"service", vid:v.id, type:typeSel.value,
    other: typeSel.value==="otro" ? $("#s-other").value.trim() : "",
    date:$("#s-date").value, km:num($("#s-km").value), parts:$("#s-parts").value.trim(),
    cost:num($("#s-cost").value), shop:$("#s-shop").value.trim(), notes:$("#s-notes").value.trim(),
    nextKm:num($("#s-nextkm").value), nextDate:$("#s-nextdate").value||null, updatedAt:now };
  const prev=state.editSvc;
  $("#dlg-svc").close();
  try{
    await putRecord({...data, id: prev?prev.id:newId(), createdAt: prev?.createdAt||now});
    if(data.km!=null && data.km>(v.odo||0)) await putRecord({...v, odo:data.km, odoDate:data.date});
    await reload(); toast("Servicio guardado");
  }catch(err){ toast("No se pudo guardar: "+err); }
};

function openCar(v){
  state.editCar=v;
  $("#car-title").textContent = v?"Editar vehículo":"Nuevo vehículo";
  $("#c-name").value=v?.name||""; $("#c-make").value=v?.make||""; $("#c-model").value=v?.model||"";
  $("#c-year").value=v?.year||""; $("#c-plate").value=v?.plate||""; $("#c-odo").value=v?.odo??"";
  const del=$("#c-del"); del.hidden=!v; del.textContent="Eliminar vehículo"; delete del.dataset.armed;
  $("#dlg-car").showModal();
}
$("#c-del").onclick=async e=>{
  const v=state.editCar; const mine=state.services.filter(s=>s.vid===v.id);
  if(!armDelete(e.currentTarget,`Borra también ${mine.length} registro(s). ¿Confirmas?`)) return;
  $("#dlg-car").close();
  try{
    for(const s of mine) await delRecord(s.id);
    await delRecord(v.id); state.sel=null; await reload(); toast("Vehículo eliminado");
  }catch(err){ toast("No se pudo eliminar: "+err); }
};
$("#f-car").onsubmit=async e=>{
  e.preventDefault();
  const v=state.editCar;
  const data={ kind:"vehicle", name:$("#c-name").value.trim(), make:$("#c-make").value.trim(), model:$("#c-model").value.trim(),
    year:$("#c-year").value?Number($("#c-year").value):null, plate:$("#c-plate").value.trim().toUpperCase(),
    odo:Number($("#c-odo").value)||0 };
  $("#dlg-car").close();
  try{
    if(v){ await putRecord({...v, ...data, odoDate: data.odo!==v.odo ? today() : v.odoDate}); }
    else { const id=newId(); await putRecord({...data, id, odoDate:today(), createdAt:new Date().toISOString()}); state.sel=id; remember("bc.sel",id); }
    await reload(); toast("Vehículo guardado");
  }catch(err){ toast("No se pudo guardar: "+err); }
};

function openOdo(){ const v=car(); $("#o-km").value=v.odo??""; $("#dlg-odo").showModal(); }
$("#f-odo").onsubmit=async e=>{
  e.preventDefault(); const v=car(); const km=Number($("#o-km").value);
  $("#dlg-odo").close();
  if(km<(v.odo||0)){ toast("La lectura es menor que la anterior; revísala"); return; }
  try{ await putRecord({...v, odo:km, odoDate:today()}); await reload(); toast("Kilometraje actualizado"); }
  catch(err){ toast("No se pudo guardar: "+err); }
};

// ---------- files: backup / restore / CSV ----------
async function shareOrDownload(filename, text, mime){
  const blob = new Blob([text], {type:mime});
  const file = new File([blob], filename, {type:mime});
  if(navigator.canShare && navigator.canShare({files:[file]})){
    try{ await navigator.share({files:[file], title:filename}); return "shared"; }
    catch(err){ if(err && err.name==="AbortError") return "cancelled"; }
  }
  const url=URL.createObjectURL(blob);
  const a=el("a",{href:url,download:filename}); document.body.append(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),5000);
  return "downloaded";
}

async function backup(){
  const records = await allRecords();
  const payload = { app:"bitacora-carro", format:1, exportedAt:new Date().toISOString(), records };
  const name = `bitacora-respaldo-${today()}.json`;
  const res = await shareOrDownload(name, JSON.stringify(payload,null,1), "application/json");
  if(res==="cancelled"){ toast("Respaldo cancelado"); return; }
  state.lastBackup = new Date().toISOString();
  await setMeta("lastBackup", state.lastBackup);
  renderDataStatus();
  toast(res==="shared" ? "Respaldo listo. Verifica que quedó guardado en tu nube." : "Respaldo descargado");
}
$("#btn-backup").onclick=()=>backup().catch(err=>toast("No se pudo respaldar: "+err));

$("#btn-csv").onclick=async ()=>{
  const v=car(); if(!v) return;
  const q=x=>{ let v=String(x??""); if(typeof x==="string" && /^[=+\-@\t\r]/.test(v)) v="'"+v; return `"${v.replace(/"/g,'""')}"`; };
  const rows=[["Fecha","Kilometraje","Servicio","Piezas","Costo","Taller","Próximo km","Próxima fecha","Notas"]]
    .concat(svcs().map(s=>[s.date,s.km,label(s),s.parts,s.cost,s.shop,s.nextKm,s.nextDate,s.notes]));
  const csv="﻿"+rows.map(r=>r.map(q).join(",")).join("\r\n");
  const name=(v.plate||v.name).replace(/[^\w-]+/g,"_");
  try{ const r=await shareOrDownload(`bitacora_${name}.csv`, csv, "text/csv"); if(r!=="cancelled") toast("CSV listo"); }
  catch(err){ toast("No se pudo exportar: "+err); }
};

// Validate an imported backup strictly: only known kinds and plain fields are accepted.
const STR = (x,max)=> typeof x==="string" ? x.slice(0,max) : "";
const NUM = x=> (typeof x==="number" && isFinite(x) && x>=0) ? x : null;
const DATE = x=>{
  if(typeof x!=="string" || !/^\d{4}-\d{2}-\d{2}/.test(x)) return null;
  const d=x.slice(0,10), [y,m,day]=d.split("-").map(Number), t=new Date(Date.UTC(y,m-1,day));
  return (y>=1900 && y<=2100 && t.getUTCMonth()===m-1 && t.getUTCDate()===day) ? d : null;
};
function sanitize(r){
  if(!r || typeof r!=="object" || typeof r.id!=="string" || !r.id || r.id.length>64) return null;
  if(r.kind==="vehicle") return { id:r.id, kind:"vehicle", name:STR(r.name,40)||"Vehículo", make:STR(r.make,30), model:STR(r.model,40),
    year:NUM(r.year), plate:STR(r.plate,12).toUpperCase(), odo:NUM(r.odo)||0, odoDate:DATE(r.odoDate), createdAt:STR(r.createdAt,40) };
  if(r.kind==="service") return { id:r.id, kind:"service", vid:STR(r.vid,64), type: TYPE[r.type] ? r.type : "otro",
    other:STR(r.other,60) || (TYPE[r.type] ? "" : STR(r.type,60)), date:DATE(r.date), km:NUM(r.km), parts:STR(r.parts,200),
    cost:NUM(r.cost), shop:STR(r.shop,80), notes:STR(r.notes,500), nextKm:NUM(r.nextKm), nextDate:DATE(r.nextDate),
    createdAt:STR(r.createdAt,40), updatedAt:STR(r.updatedAt,40) };
  return null;
}

$("#btn-restore").onclick=()=>{ $("#restore-file").value=""; $("#restore-file").click(); };
$("#restore-file").onchange=async e=>{
  const f=e.target.files[0]; if(!f) return;
  if(f.size>5*1024*1024){ toast("El archivo es demasiado grande para ser un respaldo"); return; }
  try{
    const data=JSON.parse(await f.text());
    if(data?.app!=="bitacora-carro" || !Array.isArray(data.records)) throw new Error("no es un respaldo de esta app");
    const recs=data.records.map(sanitize).filter(Boolean);
    const vids=new Set(recs.filter(r=>r.kind==="vehicle").map(r=>r.id));
    const clean=recs.filter(r=>r.kind==="vehicle" || vids.has(r.vid));
    state.pendingRestore=clean;
    const nv=clean.filter(r=>r.kind==="vehicle").length, ns=clean.length-nv;
    $("#r-summary").textContent=`Respaldo del ${fmtDate(data.exportedAt)}: ${nv} vehículo(s) y ${ns} servicio(s).`;
    $("#dlg-restore").showModal();
  }catch(err){ toast("No se pudo leer el archivo: "+(err.message||err)); }
};
$("#f-restore").onsubmit=async e=>{
  e.preventDefault(); $("#dlg-restore").close();
  try{ await replaceAll(state.pendingRestore||[]); state.pendingRestore=null; state.sel=null; await reload(); toast("Datos restaurados"); }
  catch(err){ toast("No se pudo restaurar: "+err); }
};

// ---------- boot ----------
(async()=>{
  try{
    idb = await openDb();
    state.lastBackup = (await getMeta("lastBackup")) || null;
    if(navigator.storage?.persist){
      try{ state.persisted = (await navigator.storage.persisted()) || (await navigator.storage.persist()); }catch(e){}
    }
    await reload();
  }catch(err){
    const b=$("#banner"); b.className="banner bad"; b.hidden=false;
    b.textContent="Este navegador no permite guardar datos (¿modo privado?). Abre la app desde Safari normal o desde el ícono de inicio.";
    render();
  }
  if("serviceWorker" in navigator){ navigator.serviceWorker.register("sw.js").catch(()=>{}); }
})();
})();
