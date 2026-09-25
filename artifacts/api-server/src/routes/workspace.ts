import { Router } from 'express';
import { z } from 'zod/v4';
import { pool } from '@workspace/db';
import { ensureCompany,readWorkspace,transaction,applyWorkspaceAction,recordUsage,reserveAiQuota } from '../lib/workspace';
import { configurationSchema,WorkspaceError } from '../lib/workspace-validation';
import { conductInterview } from '../lib/interview';
import { rateLimit } from '../middlewares/rate-limit';
import { AiRateLimitedError,AiUnavailableError,MissingApiKeyError,MissingModelError } from '../lib/domus-ai-errors';
import type { Request,Response,NextFunction } from 'express';
export function handleWorkspaceError(error:unknown,_req:Request,res:Response,next:NextFunction){
 if(error instanceof WorkspaceError){res.status(error.status).json({error:error.message});return;}
 if(error instanceof z.ZodError){res.status(400).json({error:error.issues.map(i=>i.message).join(' ').slice(0,500)});return;}
 if(error instanceof MissingApiKeyError||error instanceof MissingModelError){res.status(503).json({error:'IA não configurada neste ambiente.'});return;}
 if(error instanceof AiRateLimitedError){res.status(429).json({error:'IA temporariamente ocupada. Tente novamente mais tarde.'});return;}
 if(error instanceof AiUnavailableError||error instanceof SyntaxError){res.status(502).json({error:'A IA não retornou uma resposta válida. Sua configuração não foi alterada.'});return;}
 if((error as {code?:string})?.code==='23505'){res.status(409).json({error:'Este registro já existe. Atualize os dados antes de continuar.'});return;}
 next(error);
}
const router=Router();
router.get('/workspace',async(req,res)=>{res.json(await readWorkspace(await ensureCompany(req.user!.id)));});
router.post('/workspace/actions',async(req,res)=>{
 const companyId=await ensureCompany(req.user!.id);
 res.json(await transaction(db=>applyWorkspaceAction(db,companyId,req.body)));
});
router.get('/onboarding',async(req,res)=>{
 const id=await ensureCompany(req.user!.id);const r=await pool.query('SELECT interview,proposal FROM legal_companies WHERE id=$1',[id]);
 res.json({messages:r.rows[0].interview,proposal:r.rows[0].proposal});
});
router.post('/onboarding/interview',rateLimit({windowMs:60000,max:6}),async(req,res)=>{
 const message=z.string().trim().min(5).max(6000).parse(req.body.message);
 const id=await ensureCompany(req.user!.id);
 const r=await pool.query('SELECT interview,revision FROM legal_companies WHERE id=$1',[id]);
 const messages=[...r.rows[0].interview,{role:'user',content:message}];
 if(messages.length>30)throw new WorkspaceError(400,'A entrevista chegou ao limite de 15 respostas. Confirme ou revise a proposta existente.');
 await reserveAiQuota(id,req.user!.plan);
 const ai=await conductInterview(messages,usage=>recordUsage(id,req.user!.id,'onboarding',usage));
 let parsed;
 try{parsed=ai.parse();}catch{throw new AiUnavailableError(new Error('Invalid configuration'));}
 const updated=await pool.query('UPDATE legal_companies SET interview=$2,proposal=$3,revision=revision+1 WHERE id=$1 AND revision=$4 RETURNING id',[id,JSON.stringify([...messages,{role:'assistant',content:parsed.reply,questions:parsed.questions}]),parsed.configuration,r.rows[0].revision]);
 if(!updated.rows.length)throw new WorkspaceError(409,'Outra operação alterou o escritório. Atualize e tente novamente.');
 res.json({...parsed,usage:ai.result.usage});
});
router.post('/onboarding/confirm',async(req,res)=>{
 const config=configurationSchema.parse(req.body.configuration);const id=await ensureCompany(req.user!.id);
 const workspace=await transaction(async db=>{
  const r=await db.query('SELECT revision,configuration,proposal,configuration_version FROM legal_companies WHERE id=$1 FOR UPDATE',[id]);const c=r.rows[0];
  if(c.revision!==req.body.revision)throw new WorkspaceError(409,'Atualize a prévia antes de confirmar.');
  if(!c.proposal&&!c.configuration)throw new WorkspaceError(400,'Conclua a entrevista antes de confirmar.');
  if(c.configuration){
   for(const field of c.configuration.fields){const next=config.fields.find(f=>f.id===field.id);if(!next||JSON.stringify(next)!==JSON.stringify(field))throw new WorkspaceError(409,'Campos existentes não podem ser removidos ou alterados neste MVP.');}
   for(const stage of c.configuration.stages)if(!config.stages.some(s=>s.id===stage.id))throw new WorkspaceError(409,'Etapas existentes não podem ser removidas.');
   for(const service of c.configuration.services)if(!config.services.includes(service))throw new WorkspaceError(409,'Serviços existentes não podem ser removidos neste MVP.');
   if(config.fields.some(f=>f.required&&!c.configuration.fields.some((old:any)=>old.id===f.id)))throw new WorkspaceError(409,'Novos campos devem ser opcionais para preservar registros existentes.');
  }
  await db.query('INSERT INTO legal_configuration_versions(company_id,version,configuration,approved_by) VALUES($1,$2,$3,$4)',[id,c.configuration_version+1,config,req.user!.id]);
  await db.query('UPDATE legal_companies SET name=$2,configuration=$3,configuration_version=configuration_version+1,revision=revision+1,proposal=NULL WHERE id=$1',[id,config.companyName,config]);
  return readWorkspace(id,db);
 });res.json(workspace);
});
router.get('/usage',async(req,res)=>{
 const id=await ensureCompany(req.user!.id);
 const r=await pool.query('SELECT purpose,model,count(*)::int AS calls,sum(input_tokens)::int AS "inputTokens",sum(output_tokens)::int AS "outputTokens",sum(total_tokens)::int AS "totalTokens" FROM legal_ai_usage WHERE company_id=$1 GROUP BY purpose,model',[id]);
 const quota=await pool.query("SELECT calls FROM legal_ai_daily_quota WHERE company_id=$1 AND day=(now() at time zone 'UTC')::date",[id]);
 res.json({usage:r.rows,daily:{calls:quota.rows[0]?.calls??0,limit:req.user!.plan==='pro'?100:10,timezone:'UTC'}});
});
export default router;
