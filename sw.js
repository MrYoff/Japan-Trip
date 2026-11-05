// Offline support for the Japan Trip planner.
// Page + scripts: network first (so updates show up), cached copy when offline.
// Libraries, photos and map tiles: cached as you use them.
const SHELL='jtp-shell-v3', RUNTIME='jtp-runtime-v1', MAX_RUNTIME=400;
const SHELL_FILES=['./','./index.html','./app.js','./manifest.json','./icons/icon-192.png','./icons/icon-512.png','./icons/apple-touch-icon.png','./icons/favicon-32.png',
 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css','https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js','https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(SHELL).then(c=>Promise.all(SHELL_FILES.map(u=>c.add(u).catch(()=>{})))).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==SHELL&&k!==RUNTIME).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
async function trim(){const c=await caches.open(RUNTIME),ks=await c.keys();for(let i=0;i<ks.length-MAX_RUNTIME;i++)await c.delete(ks[i])}
self.addEventListener('fetch',e=>{
 const r=e.request;if(r.method!=='GET')return;const u=new URL(r.url);
 // live data & lookups always go to the network (Firestore handles its own offline copy)
 if(/googleapis\.com|firebaseio|nominatim|frankfurter|open-meteo|flightaware|wikipedia\.org\/w\/api/.test(u.href))return;
 if(u.origin===location.origin){
  e.respondWith(fetch(r).then(res=>{if(res.ok){const cp=res.clone();caches.open(SHELL).then(c=>c.put(r,cp))}return res})
   .catch(()=>caches.match(r,{ignoreSearch:true}).then(m=>m||caches.match('./index.html'))));return}
 // everything else (libraries, Wikipedia photos, map tiles): cache first
 e.respondWith(caches.match(r).then(m=>m||fetch(r).then(res=>{if(res.ok||res.type==='opaque'){const cp=res.clone();caches.open(RUNTIME).then(c=>c.put(r,cp)).then(trim)}return res})));
});
