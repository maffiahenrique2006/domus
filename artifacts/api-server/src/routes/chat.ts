import { Router } from 'express';
import { z } from 'zod/v4';
import { pool } from '@workspace/db';
import { ensureCompany,readWorkspace,recordUsage,reserveAiQuota,transaction } from '../lib/workspace';
import { askDomusAi } from '../lib/domus-ai';
import { rateLimit } from '../middlewares/rate-limit';
const router=Router();
router.get('/chat/messages',async(req,res)=>{
 const id=await ensureCompany(req.user!.id);
 const r=await pool.query('SELECT id,role,content,created_at AS "createdAt" FROM legal_chat_messages WHERE company_id=$1 AND user_id=$2 ORDER BY id',[id,req.user!.id]);res.json(r.rows);
});
router.post('/chat/messages',rateLimit({windowMs:60000,max:12}),async(req,res)=>{
 const content=z.string().trim().min(1).max(4000).parse(req.body.content);const userId=req.user!.id;const companyId=await ensureCompany(userId);
 const workspace=await readWorkspace(companyId);
 const previous=await pool.query('SELECT role,content FROM legal_chat_messages WHERE company_id=$1 AND user_id=$2 ORDER BY id DESC LIMIT 8',[companyId,userId]);
 await reserveAiQuota(companyId,req.user!.plan);
 const total=(type:string,status?:string)=>workspace.financialEntries.filter(f=>f.type===type&&(!status||f.status===status)).reduce((sum,f)=>sum+Math.round(f.amount*100),0)/100;
 const context={today:new Date().toISOString().slice(0,10),company:workspace.company,
  totals:{demands:workspace.demands.length,projects:workspace.projects.length,financialEntries:workspace.financialEntries.length,receivable:total('receber'),received:total('receber','recebido'),payable:total('pagar'),paid:total('pagar','pago')},
  demands:workspace.demands.slice(0,20).map(d=>({id:d.id,title:d.title,status:d.status,priority:d.priority,dueDate:d.dueDate,responsible:d.responsible})),
  projects:workspace.projects.slice(0,20).map(p=>({id:p.id,name:p.name,phase:p.phase,progress:p.progress,dueDate:p.dueDate,health:p.health,taskCount:p.tasks.length,tasks:p.tasks.filter((t:any)=>!t.done).slice(0,5).map((t:any)=>({id:t.id,title:t.title.slice(0,100),dueDate:t.dueDate}))})),
  financialEntries:workspace.financialEntries.slice(0,20).map(f=>({id:f.id,projectId:f.projectId,type:f.type,amount:f.amount,status:f.status,dueDate:f.dueDate})),
  scope:'Totais cobrem todos os registros; detalhes limitados aos primeiros 20 por módulo e até 5 tarefas pendentes por caso. Se faltarem detalhes, informe a limitação. Sem consulta jurídica externa.'};
 const ai=await askDomusAi(content,context,previous.rows.reverse().map(m=>({...m,content:m.content.slice(0,1000)})),usage=>recordUsage(companyId,userId,'chat',usage));
 const message=await transaction(async db=>{
  await db.query('INSERT INTO legal_chat_messages(company_id,user_id,role,content) VALUES($1,$2,$3,$4)',[companyId,userId,'user',content]);
  const r=await db.query('INSERT INTO legal_chat_messages(company_id,user_id,role,content) VALUES($1,$2,$3,$4) RETURNING id,role,content,created_at AS "createdAt"',[companyId,userId,'assistant',ai.text]);return r.rows[0];
 });res.json({message,usage:ai.usage});
});
router.delete('/chat/messages/:id',async(req,res)=>{const id=await ensureCompany(req.user!.id);const messageId=z.coerce.number().int().positive().parse(req.params.id);
 await pool.query('DELETE FROM legal_chat_messages WHERE company_id=$1 AND user_id=$2 AND id=$3',[id,req.user!.id,messageId]);res.json({success:true});});
router.post('/chat/clear',async(req,res)=>{const id=await ensureCompany(req.user!.id);await pool.query('DELETE FROM legal_chat_messages WHERE company_id=$1 AND user_id=$2',[id,req.user!.id]);res.json({success:true});});
export default router;
