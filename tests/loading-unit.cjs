// No dependencies: node tests/loading-unit.cjs
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
for(const [,script] of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g))new vm.Script(script);
const source=name=>{const matches=[...html.matchAll(new RegExp('(?:async )?function '+name+'\\([^]*?\\n\\}','g'))];assert(matches.length,name);return matches.at(-1)[0];};
const bank={nombre:'Test',scriptUrl:'https://example.test/bank'};
let calls=[],fail=false,clock=100000;
const ctx=vm.createContext({URL,Map,JSON,console,Date:{now:()=>clock},window:{location:{href:'https://example.test/'},_asignaturasPublicas:[bank]},MAESTRO_URL:'master',asignaturaActual:bank,alumnoVerificado:{session_token:'one'},cargarAsignaturas:()=>[],sessionStorage:{getItem:()=>null},solicitarBancoRedV17:async(p,b,t)=>{calls.push({p,b,t});await new Promise(r=>setTimeout(r,5));if(fail){fail=false;throw Error('failed');}return {items:[t]};}});
vm.runInContext("const lecturasSesionV17=new Map();let contextoLecturasV17='',revisionLecturasV17=0;"+source('reiniciarLecturasSesionV17')+source('solicitarBancoV14')+source('normalizarUrlImagenV3')+source('escaparHtmlV3')+source('crearBloqueImagenPregunta'),ctx);
const api=p=>ctx.solicitarBancoV14(p);
(async()=>{
 await Promise.all([api({action:'getTemasFuentes'}),api({action:'getTemasFuentes'})]);assert.equal(calls.length,1);
 await api({action:'getTemasFuentes'});assert.equal(calls.length,1);
 clock+=31000;await api({action:'getTemasFuentes'});assert.equal(calls.length,2);
 ctx.alumnoVerificado.session_token='two';assert.equal((await api({action:'getTemasFuentes'})).items[0],'two');assert.equal(calls.length,3);
 await api({action:'guardarExamen'});await api({action:'getTemasFuentes'});assert.equal(calls.length,5);
 await api({action:'getExamen',codigo:'A'});await api({action:'getExamen',codigo:'A'});assert.equal(calls.length,7,'exam state never cached');
 ctx.reiniciarLecturasSesionV17();fail=true;await assert.rejects(api({action:'getTemasFuentes'}));await api({action:'getTemasFuentes'});assert.equal(calls.length,9);
 ctx.reiniciarLecturasSesionV17();const pending=api({action:'getTemasFuentes'});ctx.reiniciarLecturasSesionV17();await pending;await api({action:'getTemasFuentes'});assert.equal(calls.length,11,'invalidated pending read cannot refill cache');
 ctx.alumnoVerificado.session_token='';await assert.rejects(api({action:'getTemasFuentes'}));assert.equal(calls.length,11);
 console.log('PASS: deduplication, catalog expiry, session isolation, invalidation, live exam state, errors, missing token');
 const data='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jS1kAAAAASUVORK5CYII=';
 for(const field of ['imagen_url','image_url','imagen'])assert(ctx.crearBloqueImagenPregunta({[field]:data}).includes('src="'+data+'"'));
 for(const bad of ['javascript:alert(1)','data:text/html;base64,WA==','data:image/svg+xml;base64,WA==','data:image/png;base64,WA==" onerror="alert(1)'])assert.equal(ctx.normalizarUrlImagenV3(bad),'');
 assert.equal(ctx.normalizarUrlImagenV3('/image.png'),'https://example.test/image.png');
 assert.equal(ctx.normalizarUrlImagenV3('https://example.test/a.jpg'),'https://example.test/a.jpg');
 console.log('PASS: saved raster images survive rendering; unsafe URLs rejected; online URLs preserved');
 const requested=[];let finish=[];
 const pctx=vm.createContext({usaRepasosV15:()=>false,api:p=>{requested.push(p.action);return new Promise(r=>finish.push(()=>r(p.action==='getRespuestasAlumno'?[{tema:'T1',concepto:'x',es_correcta:'NO'}]:[{completado:'SI'},{completado:'SI'}])));}});
 vm.runInContext(source('calcularPriorizacion'),pctx);const p=pctx.calcularPriorizacion('one',['T1']);
 assert.deepEqual(requested,['getRespuestasAlumno','getExamenesAlumno']);finish.forEach(f=>f());assert.equal((await p)['T1|||x'].peso,3);
 console.log('PASS: independent history reads overlap and preserve prioritization');
 for(const [type,started] of [['PRACTICA',false],['EXAMEN',false],['EXAMEN',true]]){
  let release,registered=0,shown=false;
  const activity={tipo_actividad:type,alumno_id:'one',hora_inicio:started?'2026-10-01T00:00:00Z':'',preguntas:[{id:'1',opciones:{a:'A',b:'B'},respuesta_correcta:'A',explicacion_corta:'x'}]};
  const env={console,Date,Map,Number,String,alumnoVerificado:{alumno_id:'one'},document:{hidden:false,getElementById:()=>({})},
   detenerCronometrosV3:()=>{},irA:s=>{if(s==='screen-examen')shown=true;},
   api:async p=>{if(p.action==='getExamen')return activity;registered++;return new Promise(r=>{release=r;});},
   letrasOpciones:()=>['a','b'],crearEstadosPreguntasV3:()=>[{visitas:0}],restaurarEstadoLocalV3:()=>false,
   aplicarRespuestasServidorV16:()=>{},renderizarExamen:()=>{},iniciarCronometrosV3:()=>{},guardarEstadoLocalV3:()=>{},alert:m=>{throw Error(m);}};
  const ec=vm.createContext(env);vm.runInContext(source('esPracticaV3')+source('iniciarExamen'),ec);
  const opening=ec.iniciarExamen('code');await new Promise(r=>setImmediate(r));
  assert.equal(registered,started?0:1);
  assert.equal(shown,type==='PRACTICA'||started,'new exams wait for registration; practice/resume do not');
  if(release)release({ok:true});await opening;assert(shown);
 }
 console.log('PASS: new exams wait for start registration; practices and resumed exams avoid the extra wait');
 console.log('PASS: all application script blocks parse');
})().catch(e=>{console.error(e);process.exitCode=1;});
