// Exercise real Apps Script routing, permissions and persistence against in-memory Sheets.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
class Sheet{
 constructor(rows){this.rows=structuredClone(rows);this.reads=0;}
 getLastRow(){return this.rows.length;}getLastColumn(){return Math.max(1,...this.rows.map(r=>r.length));}
 getMaxColumns(){return Math.max(30,this.getLastColumn());}insertColumnsAfter(){}
 appendRow(r){this.rows.push([...r]);}
 getDataRange(){return this.getRange(1,1,Math.max(1,this.getLastRow()),this.getLastColumn());}
 getRange(r,c,n=1,m=1){const self=this;return {
  getValues(){self.reads++;return Array.from({length:n},(_,i)=>Array.from({length:m},(_,j)=>self.rows[r+i-1]?.[c+j-1]??''));},
  getDisplayValues(){return this.getValues().map(row=>row.map(String));},getValue(){return this.getValues()[0][0];},
  setValue(v){return this.setValues([[v]]);},setValues(rows){for(let i=0;i<n;i++){self.rows[r+i-1]??=[];for(let j=0;j<m;j++)self.rows[r+i-1][c+j-1]=rows[i][j];}return this;}
 };}
}
for(const dir of ['fisiologia-us','fisiologia-medica-ii','psicologia-medica']){
 const code=fs.readFileSync(path.join(__dirname,'../apps-script',dir,'Code.gs'),'utf8');
 const bank=code.match(/const BANCO_NOMBRE_V14 = '([^']+)'/)[1];
 const headers=['tema','tema_nombre','concepto_id','concepto','enunciado','a','b','c','d','e','respuesta_correcta','fuente','dificultad','explicacion_corta','explicacion_larga','estado_explicacion','tags','activa','version','id','imagen_url','imagen_alt'];
 const questions=Array.from({length:20},(_,i)=>['T1','Tema','c','Concepto','Pregunta '+i,'Uno','Dos','','','','A','PROPIA','media','Corta','Larga','completa','','1','1','q'+i,'','']);
 const sh={preguntas:new Sheet([headers,...questions]),examenes:new Sheet([Array(30).fill('header')]),preguntas_examen:new Sheet([['codigo','json']]),respuestas:new Sheet([Array(21).fill('header').concat('tiene_duda')])};
 let auth=0,opens=0,held=false,allow=true,mode='autonomo';
 const user=()=>({ok:allow,banco:bank,rol:'alumno',alumno_id:'a',nombre:'Alumno',modo:mode,fuentes:['PROPIA']});
 const ctx=vm.createContext({console,SpreadsheetApp:{openById(){opens++;return {getSheetByName:n=>sh[n]};},flush(){}},
  ContentService:{MimeType:{JSON:'json'},createTextOutput(text){return {getContent:()=>text,setMimeType(){return this;}};}},
  UrlFetchApp:{fetch(){auth++;return {getResponseCode:()=>200,getContentText:()=>JSON.stringify(user())};}},
  LockService:{getScriptLock:()=>({waitLock(){assert(!held,'nested lock');held=true;},releaseLock(){held=false;}})},
  CacheService:{getScriptCache:()=>({get:()=>null,put(){},remove(){}})}
 });vm.runInContext(code,ctx);
 const invoke=p=>JSON.parse(ctx.doPost({parameter:{session_token:'fixture',...p}}).getContent());
 const batch=ops=>invoke({action:'operacionesV18',operaciones:JSON.stringify(ops)});
 const create=(codigo,n=20)=>({action:'guardarExamen',codigo,alumno_id:'a',temas:'T1',num_preguntas:n,tipo_actividad:'EXAMEN',sistema_penalizacion:'ADAPTADA_OPCIONES'});
 const qs=(codigo,ids=questions.map(r=>r[19]))=>({action:'guardarPreguntas',codigo,preguntas:JSON.stringify(ids.map(id=>({id})))});
 const ops=[create('x'),qs('x'),{action:'registrarInicioExamen',codigo:'x'},{action:'getExamen',codigo:'x'}];
 let result=batch(ops);assert.equal(result.ok,true,JSON.stringify(result));assert.equal(auth,1);assert.equal(opens,1);assert.equal(sh.preguntas.reads,1,'bank read reused inside a request');
 assert.equal(result.resultados.at(-1).preguntas.length,20);assert(result.resultados.at(-1).hora_inicio);
 result=batch(ops);assert(result.ok);assert.equal(sh.examenes.rows.length,2);assert.equal(sh.preguntas_examen.rows.length,21,'creation retry is idempotent');
 let before=sh.examenes.rows.length;result=batch([create('bad'),{action:'borrarAlumno'}]);assert.equal(result.ok,false);assert.equal(sh.examenes.rows.length,before,'prevalidate all action names');
 result=batch([{action:'getExamen',codigo:'missing'}]);assert.equal(result.ok,false,'ownership remains enforced');
 allow=false;before=opens;result=batch(ops);assert.equal(result.ok,false);assert.equal(opens,before,'denied auth does not open Sheets');allow=true;
 mode='supervisado';result=batch([create('supervised')]);assert.equal(result.ok,false);mode='autonomo';
 result=batch([create('outside',1),qs('outside',['unknown'])]);assert.equal(result.ok,false);assert(!sh.preguntas_examen.rows.some(r=>r[0]==='outside'),'unknown questions rejected');
 const rows=questions.map((q,i)=>{const r=Array(22).fill('');r[0]='untrusted';r[1]='x';r[3]='other';r[4]=q[19];r[7]=i===0?'B':'A';r[9]='SI';return r;});
 const finish=[{action:'guardarRespuestasBloque',filas:JSON.stringify(rows)},{action:'verificarEntrega',codigo:'x',esperadas:20},{action:'finalizarExamen',codigo:'x',nota_final:'999'}];
 before=auth;result=batch(finish);assert(result.ok,JSON.stringify(result));assert.equal(auth,before+1,'one auth for entire delivery');assert.equal(sh.respuestas.rows.length,21);assert.equal(sh.respuestas.rows[1][3],'a');assert.equal(sh.respuestas.rows[1][9],'NO','server marks answers');assert.equal(sh.examenes.rows[1][29],9,'server calculates grade, ignores forged grade');
 result=batch(finish);assert(result.ok);assert.equal(sh.respuestas.rows.length,21,'delivery retry does not duplicate');
 result=batch([create('incomplete',2),qs('incomplete',['q0','q1']),{action:'verificarEntrega',codigo:'incomplete',esperadas:2},{action:'finalizarExamen',codigo:'incomplete'}]);assert.equal(result.ok,false);assert.equal(sh.examenes.rows.find(r=>r[0]==='incomplete')[6],'NO','incomplete batch stops before finalization');
 console.log('PASS:',dir,'creation/delivery, one auth, bank reuse, retries, access/source checks and authoritative grade');
}
