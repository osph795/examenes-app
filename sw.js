/* Change VERSION with every release. Updates activate immediately; current activities are not force-reloaded. */
const VERSION='examenes-shell-v17-12';
const ROOT=new URL('./',self.location.href);
const INDEX=new URL('index.html',ROOT).href;
const SHELL=['index.html','manifest.webmanifest','icons/icon-192.png','icons/icon-512.png'].map(p=>new URL(p,ROOT).href);
self.addEventListener('install',event=>event.waitUntil((async()=>{
  const cache=await caches.open(VERSION);
  await cache.addAll(SHELL.map(url=>new Request(url,{cache:'reload'})));
  // Activa la nueva versión sin esperar a que se cierren todas las pestañas.
  // No recarga una actividad abierta; solo hace que la siguiente navegación use el shell nuevo.
  await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  for(const key of await caches.keys())if(key.startsWith('examenes-shell-')&&key!==VERSION)await caches.delete(key);
  await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
  const r=event.request,u=new URL(r.url);
  if(r.method!=='GET'||u.origin!==ROOT.origin)return;
  // Never intercept bank/master requests, JSON configuration, or unrelated pages.
  const navigation=r.mode==='navigate'&&(u.pathname===ROOT.pathname||u.pathname===new URL(INDEX).pathname);
  const asset=SHELL.includes(u.href);
  if(!navigation&&!asset)return;
  event.respondWith((async()=>{
    const cache=await caches.open(VERSION);
    if(navigation){
      // Con conexión, prioriza siempre la versión actual de index.html.
      // Si la red falla, conserva el funcionamiento offline con la copia cacheada.
      try{
        const fresh=await fetch(new Request(INDEX,{cache:'no-store'}));
        if(fresh.ok){await cache.put(INDEX,fresh.clone());return fresh;}
      }catch(e){}
      const fallback=await cache.match(INDEX);
      return fallback||fetch(r);
    }
    const hit=await cache.match(r);
    return hit||fetch(r);
  })());
});
