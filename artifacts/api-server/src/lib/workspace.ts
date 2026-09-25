import { randomUUID } from 'node:crypto';
import { pool } from '@workspace/db';
import { configurationSchema, demandSchema, projectSchema, financialSchema, validateCustom, WorkspaceError, type Configuration } from './workspace-validation';

export type SqlClient = Pick<typeof pool,'query'>;
export async function transaction<T>(work:(client:SqlClient)=>Promise<T>):Promise<T>{
 const client=await pool.connect();
 try{await client.query('BEGIN');const result=await work(client);await client.query('COMMIT');return result;}
 catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}
export async function ensureCompany(userId:number):Promise<string>{
 return transaction(async client=>{
  // Serializes first-time initialization for the same authenticated user.
  await client.query('SELECT id FROM users WHERE id=$1 FOR UPDATE',[userId]);
  const existing=await client.query('SELECT company_id FROM legal_memberships WHERE user_id=$1',[userId]);
  if(existing.rows[0])return existing.rows[0].company_id as string;
  const id=randomUUID();
  await client.query('INSERT INTO legal_companies(id) VALUES($1)',[id]);
  await client.query('INSERT INTO legal_memberships(user_id,company_id) VALUES($1,$2)',[userId,id]);
  return id;
 });
}
export async function readWorkspace(companyId:string,client:SqlClient=pool){
 const result=await client.query('SELECT id,name,configuration,revision FROM legal_companies WHERE id=$1',[companyId]);
 const c=result.rows[0];if(!c)throw new WorkspaceError(404,'Escritório não encontrado.');
 const [clients,demands,projects,tasks,financial]=await Promise.all([
  client.query('SELECT id,name,email,phone FROM legal_clients WHERE company_id=$1 ORDER BY name',[companyId]),
  client.query('SELECT payload FROM legal_demands WHERE company_id=$1 ORDER BY id',[companyId]),
  client.query('SELECT id,payload FROM legal_projects WHERE company_id=$1 ORDER BY id',[companyId]),
  client.query('SELECT project_id,payload FROM legal_tasks WHERE company_id=$1 ORDER BY id',[companyId]),
  client.query('SELECT payload FROM legal_financial_entries WHERE company_id=$1 ORDER BY id',[companyId]),
 ]);
 const financialEntries=financial.rows.map(r=>r.payload);
 const today=new Date().toISOString().slice(0,10);
 return {company:{id:c.id,name:c.name,onboarded:!!c.configuration},configuration:c.configuration,revision:c.revision,
  clients:clients.rows,demands:demands.rows.map(r=>r.payload),
  projects:projects.rows.map(r=>{const taskList=tasks.rows.filter(t=>t.project_id===r.id).map(t=>t.payload);return {...r.payload,tasks:taskList,
   progress:taskList.length?Math.round(taskList.filter(t=>t.done).length/taskList.length*100):0,
   plannedCost:financialEntries.filter(f=>f.projectId===r.id&&f.type==='pagar').reduce((s,f)=>s+Math.round(f.amount*100),0)/100,
   realizedCost:financialEntries.filter(f=>f.projectId===r.id&&f.type==='pagar'&&f.status==='pago').reduce((s,f)=>s+Math.round(f.amount*100),0)/100,
   health:taskList.some(t=>!t.done&&t.dueDate&&t.dueDate<today)?'atencao':'saudavel'};}),
  financialEntries:financialEntries.map(f=>({...f,status:!['pago','recebido'].includes(f.status)&&f.dueDate<today?'vencido':f.status})),
 };
}
async function clientFor(db:SqlClient,companyId:string,name:string,id?:string){
 if(id){const r=await db.query('SELECT id,name FROM legal_clients WHERE company_id=$1 AND id=$2',[companyId,id]);if(!r.rows[0])throw new WorkspaceError(400,'Cliente não pertence a este escritório.');if(r.rows[0].name!==name)throw new WorkspaceError(400,'Nome e identificação de cliente não correspondem.');return id;}
 const result=await db.query('INSERT INTO legal_clients(company_id,id,name) VALUES($1,$2,$3) ON CONFLICT(company_id,name) DO UPDATE SET name=EXCLUDED.name RETURNING id',[companyId,randomUUID(),name]);
 return result.rows[0].id;
}
async function existing(db:SqlClient,table:string,companyId:string,id:string){
 const r=await db.query(`SELECT payload FROM ${table} WHERE company_id=$1 AND id=$2`,[companyId,id]);
 if(!r.rows[0])throw new WorkspaceError(404,'Registro não encontrado neste escritório.');
 return r.rows[0].payload;
}
async function writeDemand(db:SqlClient,companyId:string,data:unknown,config:Configuration,create:boolean){
 const d=demandSchema.parse(data);validateCustom(d.customValues,config,'demand');
 if(d.service&&!config.services.includes(d.service))throw new WorkspaceError(400,'Serviço não configurado.');
 const clientId=await clientFor(db,companyId,d.client,d.clientId);d.clientId=clientId;
 if(create)await db.query('INSERT INTO legal_demands(company_id,id,client_id,status,payload) VALUES($1,$2,$3,$4,$5)',[companyId,d.id,clientId,d.status,d]);
 else await db.query('UPDATE legal_demands SET client_id=$3,status=$4,payload=$5 WHERE company_id=$1 AND id=$2',[companyId,d.id,clientId,d.status,d]);
}
async function writeProject(db:SqlClient,companyId:string,data:unknown,config:Configuration,create:boolean){
 const p=projectSchema.parse(data);validateCustom(p.customValues,config,'project');
 if(!config.stages.some(s=>s.id===p.phase))throw new WorkspaceError(400,'Etapa não configurada para este escritório.');
 if(new Set(p.tasks.map(t=>t.id)).size!==p.tasks.length)throw new WorkspaceError(400,'Tarefas duplicadas.');
 for(const phase of p.phases){if(!config.stages.some(s=>s.id===phase.id)||phase.startDate&&phase.endDate&&phase.startDate>phase.endDate)throw new WorkspaceError(400,'Cronograma inválido.');}
 if(p.service&&!config.services.includes(p.service))throw new WorkspaceError(400,'Serviço não configurado.');
 const clientId=await clientFor(db,companyId,p.client,p.clientId);p.clientId=clientId;const {tasks,...payload}=p;
 if(create)await db.query('INSERT INTO legal_projects(company_id,id,client_id,demand_id,payload) VALUES($1,$2,$3,$4,$5)',[companyId,p.id,clientId,p.demandId??null,payload]);
 else await db.query('UPDATE legal_projects SET client_id=$3,payload=$4 WHERE company_id=$1 AND id=$2',[companyId,p.id,clientId,payload]);
 await db.query('DELETE FROM legal_tasks WHERE company_id=$1 AND project_id=$2',[companyId,p.id]);
 for(const t of tasks)await db.query('INSERT INTO legal_tasks(company_id,project_id,id,payload) VALUES($1,$2,$3,$4)',[companyId,p.id,t.id,t]);
}
export async function applyWorkspaceAction(db:SqlClient,companyId:string,body:any){
 const result=await db.query('SELECT configuration,revision FROM legal_companies WHERE id=$1 FOR UPDATE',[companyId]);
 const c=result.rows[0];if(!c?.configuration)throw new WorkspaceError(409,'Conclua a configuração do escritório.');
 if(body.revision!==c.revision)throw new WorkspaceError(409,'Os dados mudaram. Atualize a página e tente novamente.');
 const config=configurationSchema.parse(c.configuration);const p=body.payload;
 if(!p||typeof p!=='object')throw new WorkspaceError(400,'Operação inválida.');
 switch(body.type){
 case 'CREATE_DEMAND':
  if(p.projectId||p.status==='convertida')throw new WorkspaceError(400,'Use a conversão para criar o vínculo com um caso.');
  await writeDemand(db,companyId,p,config,true);break;
 case 'UPDATE_DEMAND':{
  const old=await existing(db,'legal_demands',companyId,p.id);
  if(old.status==='convertida'&&(p.updates?.clientId!==undefined&&p.updates.clientId!==old.clientId||p.updates?.client!==undefined&&p.updates.client!==old.client))throw new WorkspaceError(409,'O cliente de uma demanda convertida não pode ser alterado.');
  if(p.updates?.projectId!==undefined||p.updates?.status==='convertida'||old.status==='convertida'&&p.updates?.status&&p.updates.status!=='convertida')throw new WorkspaceError(400,'Vínculo de conversão não pode ser alterado.');
  await writeDemand(db,companyId,{...old,...p.updates,id:old.id},config,false);break;
 }
 case 'CONVERT_DEMAND':{
  const d=await existing(db,'legal_demands',companyId,p.demandId);
  if(d.status!=='aprovada'||d.projectId)throw new WorkspaceError(409,'A demanda precisa estar aprovada e ainda não convertida.');
  const project={id:`P-${randomUUID()}`,name:d.title,client:d.client,clientId:d.clientId,service:d.service,responsible:d.responsible??'',phase:config.stages[0]!.id,progress:0,dueDate:d.dueDate,budget:d.estimatedValue,plannedCost:0,realizedCost:0,health:'saudavel',demandId:d.id,tasks:[],phases:[],history:[],customValues:p.customValues??{}};
  await writeProject(db,companyId,project,config,true);
  await writeDemand(db,companyId,{...d,status:'convertida',projectId:project.id},config,false);break;
 }
 case 'CREATE_PROJECT':
  if(p.demandId)throw new WorkspaceError(400,'Use a conversão de demanda para criar esse vínculo.');
  await writeProject(db,companyId,p,config,true);break;
 case 'UPDATE_PROJECT':{
  const old=await existing(db,'legal_projects',companyId,p.id);
  if(old.demandId&&(p.updates?.clientId!==undefined&&p.updates.clientId!==old.clientId||p.updates?.client!==undefined&&p.updates.client!==old.client))throw new WorkspaceError(409,'O cliente de um caso convertido não pode ser alterado.');
  if(p.updates?.demandId!==undefined)throw new WorkspaceError(400,'Demanda de origem não pode ser alterada.');
  const tasks=await db.query('SELECT payload FROM legal_tasks WHERE company_id=$1 AND project_id=$2',[companyId,p.id]);
  await writeProject(db,companyId,{...old,tasks:tasks.rows.map(t=>t.payload),...p.updates,id:old.id},config,false);break;
 }
 case 'TOGGLE_PROJECT_TASK':{
  const t=await db.query('SELECT payload FROM legal_tasks WHERE company_id=$1 AND project_id=$2 AND id=$3',[companyId,p.projectId,p.taskId]);
  if(!t.rows[0])throw new WorkspaceError(404,'Tarefa não encontrada.');
  await db.query('UPDATE legal_tasks SET payload=$4 WHERE company_id=$1 AND project_id=$2 AND id=$3',[companyId,p.projectId,p.taskId,{...t.rows[0].payload,done:!t.rows[0].payload.done}]);break;
 }
 case 'CREATE_FINANCIAL':case 'UPDATE_FINANCIAL':{
  const create=body.type==='CREATE_FINANCIAL';
  const old=create?null:await existing(db,'legal_financial_entries',companyId,p.id);
  const f=financialSchema.parse(create?p:{...old,...p.updates,id:old.id});
  if(f.type==='receber'&&f.status==='pago'||f.type==='pagar'&&f.status==='recebido')throw new WorkspaceError(400,'Situação financeira incompatível.');
  if(['pago','recebido'].includes(f.status)){f.paidAt=f.paidAt??new Date().toISOString().slice(0,10);}else delete f.paidAt;
  if(f.projectId)await existing(db,'legal_projects',companyId,f.projectId);
  if(create)await db.query('INSERT INTO legal_financial_entries(company_id,id,project_id,amount,type,status,payload) VALUES($1,$2,$3,$4,$5,$6,$7)',[companyId,f.id,f.projectId??null,f.amount,f.type,f.status,f]);
  else await db.query('UPDATE legal_financial_entries SET project_id=$3,amount=$4,type=$5,status=$6,payload=$7 WHERE company_id=$1 AND id=$2',[companyId,f.id,f.projectId??null,f.amount,f.type,f.status,f]);break;
 }
 case 'CREATE_CLIENT':case 'UPDATE_CLIENT':{
  const create=body.type==='CREATE_CLIENT';
  const old=create?null:(await db.query('SELECT * FROM legal_clients WHERE company_id=$1 AND id=$2',[companyId,p.id])).rows[0];
  if(!create&&!old)throw new WorkspaceError(404,'Cliente não encontrado.');
  const data=create?p:{...old,...p.updates,id:old.id};
  if(typeof data.name!=='string'||!data.name.trim()||data.name.length>200)throw new WorkspaceError(400,'Nome inválido.');
  const email=data.email??'',phone=data.phone??'';
  if(typeof email!=='string'||email.length>250||email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||typeof phone!=='string'||phone.length>50)throw new WorkspaceError(400,'Contato inválido.');
  if(create){const id=typeof data.id==='string'&&/^[A-Za-z0-9_-]{1,80}$/.test(data.id)?data.id:randomUUID();await db.query('INSERT INTO legal_clients(company_id,id,name,email,phone) VALUES($1,$2,$3,$4,$5)',[companyId,id,data.name.trim(),email,phone]);}
  else {await db.query('UPDATE legal_clients SET name=$3,email=$4,phone=$5 WHERE company_id=$1 AND id=$2',[companyId,data.id,data.name.trim(),email,phone]);
   await db.query("UPDATE legal_demands SET payload=jsonb_set(payload,'{client}',to_jsonb($3::text)) WHERE company_id=$1 AND client_id=$2",[companyId,data.id,data.name.trim()]);
   await db.query("UPDATE legal_projects SET payload=jsonb_set(payload,'{client}',to_jsonb($3::text)) WHERE company_id=$1 AND client_id=$2",[companyId,data.id,data.name.trim()]);
  }break;
 }
 default:throw new WorkspaceError(400,'Operação não suportada.');
 }
 await db.query('UPDATE legal_companies SET revision=revision+1 WHERE id=$1',[companyId]);
 return readWorkspace(companyId,db);
}
export async function recordUsage(companyId:string,userId:number,purpose:string,usage:{responseId:string,model:string,inputTokens:number,outputTokens:number,totalTokens:number}){
 await pool.query('INSERT INTO legal_ai_usage(company_id,user_id,purpose,response_id,model,input_tokens,output_tokens,total_tokens) VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(response_id) DO NOTHING',[companyId,userId,purpose,usage.responseId,usage.model,usage.inputTokens,usage.outputTokens,usage.totalTokens]);
}
export async function reserveAiQuota(companyId:string,plan:string){
 const limit=plan==='pro'?100:10;
 const r=await pool.query(`INSERT INTO legal_ai_daily_quota(company_id,day,calls) VALUES($1,(now() at time zone 'UTC')::date,1)
 ON CONFLICT(company_id,day) DO UPDATE SET calls=legal_ai_daily_quota.calls+1 WHERE legal_ai_daily_quota.calls<$2 RETURNING calls`,[companyId,limit]);
 if(!r.rows[0])throw new WorkspaceError(429,`Limite diário de ${limit} chamadas de IA atingido. O limite renova à meia-noite UTC.`);
}
