/* Change VERSION with every release. No skipWaiting: don't interrupt activities. */
const VERSION='examenes-shell-v17-2';
const ROOT=new URL('./',self.location.href);
const INDEX=new URL('index.html',ROOT).href;
const SHELL=['index.html','manifest.webmanifest','icons/icon-192.png','icons/icon-512.png'].map(p=>new URL(p,ROOT).href);
self.addEventListener('install',event=>event.waitUntil((async()=>{
  const cache=await caches.open(VERSION);
  await cache.addAll(SHELL.map(url=>new Request(url,{cache:'reload'})));
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
    const hit=await cache.match(navigation?INDEX:r);
    return hit||fetch(r);
  })());
});
