import { z } from 'zod/v4';

const text = z.string().trim().min(1).max(200);
const identifier = z.string().regex(/^[A-Za-z0-9_-]{1,80}$/);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v => {
  const d = new Date(`${v}T12:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0,10) === v;
}, 'Data inválida');
const optionalDate = z.union([date,z.literal('')]);
const money = z.number().finite().min(0).max(999999999).refine(v => Math.abs(v*100-Math.round(v*100))<0.00001,'Use até duas casas decimais');
const customValues = z.record(z.string().max(80), z.union([z.string().max(2000),z.number().finite()])).default({});
const history = z.array(z.object({id:identifier,action:z.string().max(1000),author:text,createdAt:z.string().max(50)})).max(1000).default([]);

export const configurationSchema = z.object({
 companyName:text, summary:z.string().trim().min(10).max(3000),
 briefing:z.object({pain:text,intake:text,responsibility:text,financialNeeds:z.enum(['receber','pagar','ambos','nenhum'])}),
 services:z.array(text).min(1).max(12),
 stages:z.array(z.object({id:identifier,label:text})).min(2).max(8),
 fields:z.array(z.object({id:identifier,label:text,type:z.enum(['text','number','select']),entity:z.enum(['demand','project']),required:z.boolean(),options:z.array(text).max(20)})).max(8),
}).superRefine((c,ctx)=>{
 for(const [label,list] of [['etapas',c.stages],['campos',c.fields]] as const){
  if(new Set(list.map(x=>x.id)).size!==list.length || new Set(list.map(x=>x.label.toLowerCase())).size!==list.length) ctx.addIssue({code:'custom',message:`Existem ${label} duplicados.`});
 }
 if(new Set(c.services.map(x=>x.toLowerCase())).size!==c.services.length)ctx.addIssue({code:'custom',message:'Serviços duplicados.'});
 for(const f of c.fields) if((f.type==='select' && f.options.length<2)||(f.type!=='select'&&f.options.length))ctx.addIssue({code:'custom',message:`Opções incompatíveis no campo ${f.label}.`});
 const reserved=new Set(['id','title','titulo','name','nome','client','cliente','clientid','responsible','responsavel','duedate','prazo','priority','prioridade','amount','valor','description','descricao','status','service','servico']);
 const normalize=(v:string)=>v.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z]/g,'');
 for(const f of c.fields)if(reserved.has(normalize(f.id))||reserved.has(normalize(f.label)))ctx.addIssue({code:'custom',message:`${f.label} já existe como campo padrão.`});
});
export type Configuration = z.infer<typeof configurationSchema>;
export const demandSchema = z.object({
 id:identifier,title:text,client:text,clientId:identifier.optional(),service:z.string().max(200).optional(),priority:z.enum(['urgente','alta','media','baixa']),responsible:text.nullable(),
 status:z.enum(['nova','em_analise','aguardando_cliente','aprovada','convertida','cancelada']),dueDate:optionalDate,
 estimatedValue:money,description:z.string().max(8000),origin:z.string().max(200),projectId:identifier.optional(),
 comments:z.array(z.object({id:identifier,author:text,authorInitials:z.string().max(10),text:z.string().max(4000),createdAt:z.string().max(50)})).max(500).default([]),
 history,files:z.array(z.unknown()).max(0).default([]),createdAt:z.string().max(50),customValues,
});
export const taskSchema=z.object({id:identifier,title:text,responsible:z.string().max(200),done:z.boolean(),dueDate:optionalDate.optional(),description:z.string().max(4000).optional()});
export const projectSchema=z.object({
 id:identifier,name:text,client:text,clientId:identifier.optional(),service:z.string().max(200).optional(),responsible:z.string().max(200),phase:identifier,progress:z.number().min(0).max(100),dueDate:optionalDate,
 budget:money,plannedCost:money,realizedCost:money,health:z.enum(['saudavel','atencao']),healthNote:z.string().max(2000).optional(),description:z.string().max(8000).optional(),demandId:identifier.optional(),
 tasks:z.array(taskSchema).max(200),phases:z.array(z.object({id:identifier,label:text,startDate:optionalDate,endDate:optionalDate})).max(8),history,customValues,
});
export const financialSchema=z.object({id:identifier,type:z.enum(['receber','pagar']),description:text,clientOrSupplier:text,projectId:identifier.optional(),amount:money.refine(n=>n>0),dueDate:date,status:z.enum(['pendente','vencido','pago','recebido']),paidAt:date.optional(),category:text});
export class WorkspaceError extends Error { constructor(public status:number,message:string){super(message);} }
export function validateCustom(values:Record<string,string|number>,config:Configuration,entity:'demand'|'project'){
 const fields=config.fields.filter(f=>f.entity===entity);
 for(const key of Object.keys(values)) if(!fields.some(f=>f.id===key))throw new WorkspaceError(400,`Campo personalizado desconhecido: ${key}`);
 for(const f of fields){const v=values[f.id];if(v===undefined||v===''){if(f.required)throw new WorkspaceError(400,`Preencha ${f.label}.`);continue;}
  if((f.type==='number'&&typeof v!=='number')||(f.type!=='number'&&typeof v!=='string')||(f.type==='select'&&!f.options.includes(String(v))))throw new WorkspaceError(400,`Valor inválido em ${f.label}.`);
 }
}
