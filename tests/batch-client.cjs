const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const source=name=>[...html.matchAll(new RegExp('(?:async )?function '+name+'\\([^]*?\\n\\}','g'))].at(-1)[0];
const names=['dividirBloquesV18','admiteOperacionesV18','paqueteOperacionesV18','guardarActividadV18','enviarPaqueteEntregaV16','medirRedV18'];
(async()=>{
 for(const [secure,capable] of [[true,false],[true,true],[false,false]]){
  const calls=[],writes=[];let incomplete=false;
  const c=vm.createContext({URLSearchParams,console,performance,asignaturaActual:{scriptUrl:'bank'},alumnoVerificado:{alumno_id:'a'},BLOQUE_SIZE:5,
   bancoConSesionV14:()=>secure,empaquetarPreguntaV3:p=>({...p}),esperar:async()=>{},
   api:async p=>{calls.push(p);if(p.action==='operacionesV18')return {ok:true,resultados:JSON.parse(p.operaciones).map(op=>op.action==='getExamen'?{preguntas:[{id:'q'}],hora_inicio:'today'}:op.action==='verificarEntrega'?{entrega_completa:!incomplete}:{ok:true})};return p.action==='verificarEntrega'?{entrega_completa:!incomplete}:{ok:true};},
   guardarBloqueActividadV10:async(a,k,rows)=>{writes.push({a,rows});}
  });vm.runInContext('const capacidadesBancoV18=new Map();const tiemposRedV18=[];'+names.map(source).join('\n'),c);
  if(capable)vm.runInContext("capacidadesBancoV18.set('bank',true)",c);
  const questions=Array.from({length:20},(_,i)=>({id:String(i),enunciado:'á 🙂',explicacion_larga:'texto'}));
  const activity=await c.guardarActividadV18({codigo:'x'},questions,{},true);
  if(capable){assert.equal(calls.length,1);assert.equal(writes.length,0);assert(activity.hora_inicio);const ops=JSON.parse(calls[0].operaciones);assert.equal(ops.at(-1).action,'getExamen');assert.deepEqual(JSON.parse(ops[1].preguntas)[0],{id:'0'});}
  else{assert.equal(activity,null);assert.equal(calls.length,1);assert.equal(writes.length,secure?1:4);}
  calls.length=0;writes.length=0;
  await c.enviarPaqueteEntregaV16('x',{filas:questions.map(q=>[q.id,'x']),fin:{}});
  if(capable){assert.equal(calls.length,1);assert.equal(writes.length,0);}else{assert.equal(calls.length,2);assert.equal(writes.length,secure?1:2);}
  incomplete=true;await assert.rejects(c.enviarPaqueteEntregaV16('x',{filas:[[1,'x']],fin:{}}),'incomplete delivery cannot become success');
  const large=Array.from({length:123},(_,i)=>({id:i,text:'á🙂'.repeat(1500)}));
  const chunks=c.dividirBloquesV18(large);assert.equal(chunks.flat().length,123);for(const b of chunks){assert(b.length<=50);assert(new URLSearchParams({v:JSON.stringify(b)}).toString().length<=180000);}
  await c.medirRedV18('maestro:verificarPin',async()=>({ok:true,pin:'1234',session_token:'secret'}));
  const diag=vm.runInContext('JSON.stringify(tiemposRedV18)',c);assert(!diag.includes('1234')&&!diag.includes('secret'));assert(diag.includes('verificarPin'));
  console.log('PASS: client path',secure?'session':'legacy',capable?'batch capability':'existing backend','bounded payloads, delivery confirmation, private diagnostics');
 }
})().catch(e=>{console.error(e);process.exitCode=1;});
