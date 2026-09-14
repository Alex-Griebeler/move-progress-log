// Copiar para supabase/functions/whoop-sync/mirror_test.ts na Fabrik.
import {assertEquals,assertRejects,assert} from 'jsr:@std/assert';
import {fetchCollectionsReal,RateLimited,syncStudent} from './sync.ts';
Deno.test('janela cancelada não inicia paginação',async()=>{
 const c=new AbortController();c.abort();let calls=0;const original=fetch;
 globalThis.fetch=(()=>{calls++;throw new Error('não deve consultar');}) as typeof fetch;
 try{await assertRejects(()=>fetchCollectionsReal('teste','2026-09-01','2026-09-02',c.signal));assertEquals(calls,0);}finally{globalThis.fetch=original;}
});
Deno.test('paginação repetida falha sem upsert parcial e cada HTTP recebe timeout',async()=>{
 const original=fetch;let writes=0;const logs:unknown[]=[];
 globalThis.fetch=((_url,init)=>{assert(init?.signal);return Promise.resolve(Response.json({records:[],next_token:'repetido'}));}) as typeof fetch;
 const supa={from:()=>({upsert:()=>{writes++;return Promise.resolve({error:null});},insert:(row:unknown)=>{logs.push(row);return Promise.resolve({error:null});}})};
 try{
  await assertRejects(()=>syncStudent({supa,fetchCollections:fetchCollectionsReal},{student_id:'teste',accessToken:'teste',start:'2026-09-01',end:'2026-09-02'}));
  assertEquals(writes,0);assertEquals(logs,[{student_id:'teste',status:'failed',error_message:'sync_failed'}]);
 }finally{globalThis.fetch=original;}
});
Deno.test('429 preserva Retry-After e não devolve corpo do fabricante',async()=>{
 const original=fetch;
 globalThis.fetch=(()=>Promise.resolve(new Response('conteúdo privado',{status:429,headers:{'Retry-After':'900'}}))) as typeof fetch;
 try{const e=await assertRejects(()=>fetchCollectionsReal('teste','2026-09-01','2026-09-02'),RateLimited);assertEquals(e.seconds,900);assertEquals(e.message,'rate_limited');}finally{globalThis.fetch=original;}
});
