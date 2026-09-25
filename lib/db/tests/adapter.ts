// TEST ONLY: embedded PostgreSQL adapter. Never imported by the deployed app.
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import * as schema from '../src/schema';
export * from '../src/schema';
export const testPostgres=new PGlite();
export const db=drizzle(testPostgres,{schema});
let transactionQueue=Promise.resolve();
export const pool={
 query:async(text:string,values:unknown[]=[])=>{
  const result=await testPostgres.query(text,values.map(v=>v!==null&&typeof v==='object'?JSON.stringify(v):v));
  return {...result,rowCount:result.affectedRows??result.rows.length};
 },
 connect:async()=>{const previous=transactionQueue;let release!:()=>void;transactionQueue=new Promise<void>(resolve=>{release=resolve;});await previous;return {...pool,release};},
};
