// Local browser QA only. Test identity route is NOT in app.ts or the production build.
import express from 'express';
import { readFile,readdir } from 'node:fs/promises';
import path from 'node:path';
import app from '../../../artifacts/api-server/src/app';
import { createSession,setSessionCookie } from '../../../artifacts/api-server/src/lib/auth';
import { testPostgres,pool } from './adapter';
const root=process.env.DOMUS_TEST_ROOT!;
for(const file of (await readdir(path.join(root,'lib/db/migrations'))).filter(f=>f.endsWith('.sql')).sort())await testPostgres.exec(await readFile(path.join(root,'lib/db/migrations',file),'utf8'));
await pool.query("INSERT INTO users(google_id,email,name) VALUES('test-only','demo@example.invalid','Pessoa de Teste')");
app.get('/__test/login',async(_req,res)=>{const s=await createSession(1);setSessionCookie(res,s.token,s.expiresAt);res.redirect('/');});
app.get('/__test/fixture',async(req,res)=>{
 if(!req.user){res.status(401).send('Use /__test/login first');return;}
 const {ensureCompany}=await import('../../../artifacts/api-server/src/lib/workspace');const id=await ensureCompany(req.user.id);
 const config={companyName:'Escritório Fictício — Teste Local',summary:'Configuração de teste técnico, não gerada pela IA.',briefing:{pain:'Pedidos dispersos',intake:'Email',responsibility:'Pessoa de Teste',financialNeeds:'ambos'},services:['Contratos'],stages:[{id:'analise',label:'Análise'},{id:'entrega',label:'Entrega'}],fields:[{id:'area',label:'Área',type:'select',entity:'demand',required:true,options:['Cível','Contratos']}]};
 await pool.query('UPDATE legal_companies SET configuration=$2,name=$3,revision=revision+1 WHERE id=$1',[id,config,config.companyName]);res.redirect('/');
});
app.use(express.static(path.join(root,'artifacts/domus/dist/public')));
app.get(/^\/(?!api\/).*/,(_req,res)=>res.sendFile(path.join(root,'artifacts/domus/dist/public/index.html')));
app.listen(5099,'127.0.0.1',()=>console.log('TEST ONLY http://127.0.0.1:5099/__test/login — embedded database; no external services simulated'));
