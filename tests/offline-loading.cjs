// Run: NODE_PATH="$CODEX_PRIMARY_RUNTIME_NODE_MODULES" node tests/offline-loading.cjs
const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
for(const [,script] of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)) new Function(script);
new Function(fs.readFileSync(path.join(root,'sw.js'),'utf8'));
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jS1kAAAAASUVORK5CYII=','base64');
const calls=[];
let base,fixture,failNext=false;
const server=http.createServer(async(req,res)=>{
 const url=new URL(req.url,'http://localhost');
 if(url.pathname==='/asignaturas.json') {res.setHeader('Content-Type','application/json');res.end(JSON.stringify({maestroUrl:base+'/master',asignaturas:[{nombre:'Test',scriptUrl:base+'/bank',seguridad:'sesion-v14'}]}));return;}
 if(url.pathname==='/image.png'){res.setHeader('Content-Type','image/png');res.end(png);return;}
 if(url.pathname==='/bank'){
  let body='';for await(const chunk of req)body+=chunk;
  const p=Object.fromEntries(new URLSearchParams(body));calls.push(p);
  await new Promise(r=>setTimeout(r,p.action==='registrarInicioExamen'?250:35));
  res.setHeader('Content-Type','application/json');
  if(failNext){failNext=false;res.end(JSON.stringify({ok:false,error:'fixture failure'}));return;}
  res.end(JSON.stringify(p.action==='getExamen'?fixture:p.action==='getTemasFuentes'?{items:[{tema:'T1',tema_nombre:'Test',fuente:'PROPIA'}]}:{ok:true}));return;
 }
 const file=path.join(root,url.pathname==='/'?'index.html':url.pathname);
 if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return;}
 res.setHeader('Content-Type',file.endsWith('.html')?'text/html':file.endsWith('.js')?'application/javascript':file.endsWith('.png')?'image/png':'application/json');
 res.end(fs.readFileSync(file));
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));base=`http://127.0.0.1:${server.address().port}`;
 const browser=await chromium.launch({headless:true});
 try{
 const context=await browser.newContext();const page=await context.newPage();const errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
 await page.goto(base);await page.evaluate(()=>navigator.serviceWorker.ready);
 await page.evaluate(async()=>{
  const cfg=await cargarAsignaturasPublicas();MAESTRO_URL=cfg.maestroUrl;window._asignaturasPublicas=cfg.asignaturas;
  asignaturaActual={...cfg.asignaturas[0]};alumnoVerificado={alumno_id:'one',session_token:'token-one',nombre:'Test'};
  alumnoAccesoActual={modo:'autonomo'};
 });
 await page.evaluate(()=>Promise.all([api({action:'getTemasFuentes'}),api({action:'getTemasFuentes'})]));
 assert.equal(calls.length,1,'identical pending reads share one request');
 await page.evaluate(()=>api({action:'getTemasFuentes'}));assert.equal(calls.length,1,'catalog reused');
 await page.evaluate(()=>{for(const e of lecturasSesionV17.values())e.fecha-=300001;return api({action:'getTemasFuentes'});});assert.equal(calls.length,2,'catalog expires');
 await page.evaluate(()=>{alumnoVerificado.session_token='token-two';return api({action:'getTemasFuentes'});});assert.equal(calls.length,3,'session cannot reuse another catalog');
 await page.evaluate(()=>api({action:'guardarPregunta',codigo:'test'}));await page.evaluate(()=>api({action:'getTemasFuentes'}));assert.equal(calls.length,5,'write invalidates catalog');
 await page.evaluate(()=>reiniciarLecturasSesionV17());failNext=true;
 assert.equal(await page.evaluate(()=>api({action:'getTemasFuentes'}).then(()=>false,()=>true)),true);
 await page.evaluate(()=>api({action:'getTemasFuentes'}));assert.equal(calls.length,7,'failed read is retryable');
 console.log('PASS: read deduplication, expiry, session isolation, write invalidation, retry');
 assert.deepEqual(await page.evaluate(()=>['javascript:alert(1)','data:text/html;base64,WA==','data:image/svg+xml;base64,WA=='].map(normalizarUrlImagenV3)),['','','']);
 fixture={alumno_id:'one',alumna:'Test',tipo_actividad:'PRACTICA',politica_explicaciones:'INMEDIATAS',completado:'NO',preguntas:['imagen_url','image_url','imagen'].map((field,i)=>({id:String(i),enunciado:'Pregunta con imagen',opciones:{a:'Uno',b:'Dos'},respuesta_correcta:'A',explicacion_corta:'Explicación', [field]:base+'/image.png'}))};
 await page.evaluate(()=>iniciarExamen('fixture'));
 await page.evaluate(()=>descargarPracticaV17());
 const saved=await page.evaluate(()=>descargasV17()[0]?.d);
 assert(saved,'download saved');for(const [i,key] of ['imagen_url','image_url','imagen'].entries())assert(saved.actividad.preguntas[i][key].startsWith('data:image/png;base64,'));
 await context.setOffline(true);await page.reload();
 await page.evaluate(()=>abrirLocalV17(descargasV17()[0].d));
 await page.waitForFunction(()=>document.querySelector('#screen-examen .pregunta-imagen img')?.naturalWidth===1);
 assert.equal(await page.evaluate(()=>modoLocalV17),true);
 for(let i=0;i<3;i++){
  await page.evaluate(i=>{indicePreguntaActualV3=i;renderizarExamen();},i);
  await page.waitForFunction(()=>document.querySelector('#screen-examen .pregunta-imagen img')?.naturalWidth===1);
 }
 console.log('PASS: download -> offline reload -> local exam renders all image aliases');
 assert.deepEqual(errors,[],'no unhandled browser errors');
 console.log('PASS: application JavaScript parses and runs');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
