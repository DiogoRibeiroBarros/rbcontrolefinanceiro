import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import vm from 'node:vm';
import ts from 'typescript';
import {connectionScope,assertLinkedBase} from '../src/domain/connectionScope';
import {checkPairing} from '../src/domain/pairing';

// Execute the actual mobile SQL against SQLite, substituting native I/O only.
function runtime(){
  const files=new Map<string,DatabaseSync>(),modules=new Map<string,any>(),ciphertext=new Map<string,string>();
  const sqlite={openDatabaseAsync:async(name:string)=>{
    let db=files.get(name);if(!db){db=new DatabaseSync(':memory:');files.set(name,db);}const handle=db;
    return {execAsync:async(sql:string)=>handle.exec(sql),runAsync:async(sql:string,...values:any[])=>handle.prepare(sql).run(...values),getFirstAsync:async(sql:string,...values:any[])=>handle.prepare(sql).get(...values),getAllAsync:async(sql:string,...values:any[])=>handle.prepare(sql).all(...values),closeAsync:async()=>{},withTransactionAsync:async(fn:()=>Promise<void>)=>{handle.exec('BEGIN');try{await fn();handle.exec('COMMIT');}catch(e){handle.exec('ROLLBACK');throw e;}}};
  }};
  class EncryptedOfflineStore{constructor(private name:string){}async getItem(){return ciphertext.get(this.name)||null;}async setItem(value:string){ciphertext.set(this.name,value);}}
  function load(path:string):any{
    if(modules.has(path))return modules.get(path);
    const output:any={};modules.set(path,output);
    const source=readFileSync(new URL('../src/'+path+'.ts',import.meta.url),'utf8');
    const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;
    const require=(name:string)=>{
      if(name==='expo-sqlite')return sqlite;
      if(name==='expo-crypto')return {CryptoDigestAlgorithm:{SHA256:'sha256'},digestStringAsync:async(algorithm:string,value:string)=>createHash(algorithm).update(value).digest('hex')};
      if(name==='react-native')return {AppState:{addEventListener:()=>({remove(){}})}};
      if(name==='./encryptedOfflineStore')return {EncryptedOfflineStore};
      const resolved=new URL(name,new URL(path+'.ts','https://module.test/')).pathname.slice(1);
      return load(resolved);
    };
    vm.runInNewContext(compiled,{exports:output,require,console,Date,Math,Map,JSON,setTimeout,clearTimeout,URL,AbortController,fetch:(...args:Parameters<typeof fetch>)=>fetch(...args)});
    return output;
  }
  return {load,files,ciphertext,close(){files.forEach(db=>db.close());}};
}
const a={origin:'https://site.test',installationId:'cloud',deviceId:'phone-a',name:'A',tenantId:'base-a'};
const b={...a,deviceId:'phone-b',tenantId:'base-b'};

test('dados, fila, cache e cursor de outra conexão nunca aparecem na base atual',async()=>{
  const r=runtime();try{
    const db=r.load('database/database'),cache=r.load('platform/offlineCache'),sa=connectionScope(a),sb=connectionScope(b);
    const payload={profiles:[{id:'a'}],sharedData:{entries:[{id:'original'}]}};
    await db.saveSnapshot(sa,'profile_store','shared',payload,7,'2026-10-08T12:00:00Z');
    await db.queueProfileStore(sa,{...payload,localEdit:true},a.deviceId);
    await db.setMeta(sa,'server_cursor','7');await cache.saveOfflineStore(sa,{profileStore:payload});
    assert.equal(await db.getEntity(sb,'profile_store','shared'),null);
    assert.equal((await db.pendingOperations(sb)).length,0);assert.equal(await db.getMeta(sb,'server_cursor'),'');
    assert.equal(await cache.loadOfflineStore(sb),null);
    assert.equal((await db.pendingOperations(sa)).length,1);assert.equal((await cache.loadOfflineStore(sa)).profileStore.sharedData.entries.length,1);
    assert.equal(await db.saveSnapshot(sa,'profile_store','shared',{blank:true},1,'older'),false);
    assert.equal((await db.getEntity(sa,'profile_store','shared')).payload.localEdit,true);
  }finally{r.close();}
});

test('migração copia somente a base comprovada e preserva arquivo e fila antigos',async()=>{
  const r=runtime();try{
    const db=r.load('database/database');await db.initializeDatabase(connectionScope(b));
    const old=r.files.get('rb-gestao-offline.db')!;
    old.exec("CREATE TABLE entities(entity_type,entity_id,payload,version,updated_at,deleted_at,device_id,sync_status);CREATE TABLE sync_queue(operation_id,entity_type,entity_id,operation,payload,base_version,created_at,updated_at,retry_count,last_attempt_at,last_error,status);");
    const payload=JSON.stringify({cloudDeviceId:a.deviceId,cloudTenantId:a.tenantId,profiles:[{id:'main'}],sharedData:{entries:[{id:'preserved'}]}});
    old.prepare('INSERT INTO entities VALUES(?,?,?,?,?,?,?,?)').run('profile_store','shared',payload,7,'now',null,a.deviceId,'pending');
    old.prepare('INSERT INTO sync_queue VALUES(?,?,?,?,?,?,?,?,?,?,?,?)').run('same-operation-id','profile_store','shared','UPDATE',payload,6,'now','now',0,null,'','PENDING');
    const scope=connectionScope(a);assert.equal((await db.getEntity(scope,'profile_store','shared')).payload.sharedData.entries[0].id,'preserved');
    assert.equal((await db.pendingOperations(scope))[0].operationId,'same-operation-id');
    assert.equal(old.prepare('SELECT COUNT(*) AS n FROM entities').get()!.n,1);
    assert.equal(old.prepare('SELECT COUNT(*) AS n FROM sync_queue').get()!.n,1);
    assert.equal(await db.getEntity(connectionScope(b),'profile_store','shared'),null);
  }finally{r.close();}
});

test('sincronização rejeita resposta de outra base e aceita cursor zero',async()=>{
  const r=runtime(),original=global.fetch;try{
    const engine=r.load('sync/syncEngine'),db=r.load('database/database');
    await db.setMeta(connectionScope(a),'server_cursor','99');
    global.fetch=async()=>new Response(JSON.stringify({tenantId:'base-b',deviceId:a.deviceId,changes:[],nextCursor:0}));
    await assert.rejects(engine.synchronize({device:a,token:'token'}),/outra base/);
    assert.equal(await db.getMeta(connectionScope(a),'server_cursor'),'99');
    global.fetch=async()=>new Response(JSON.stringify({tenantId:a.tenantId,deviceId:a.deviceId,changes:[],nextCursor:0}));
    assert.equal((await engine.synchronize({device:a,token:'token'})).cursor,'0');
    assert.equal(await db.getMeta(connectionScope(a),'server_cursor'),'0');
  }finally{global.fetch=original;r.close();}
});

test('aprovação fica vinculada à base original do código',async()=>{
  const pending={requestId:'request',requestSecret:'secret',expiresIn:300,installationId:'cloud',tenantId:'base-a'};
  const fetcher=(async()=>new Response(JSON.stringify({status:'paired',installationId:'cloud',deviceId:'phone',token:'t'.repeat(43),tenantId:'base-b'}))) as typeof fetch;
  await assert.rejects(checkPairing('https://site.test',pending,'Celular',fetcher),/base mudou/);
  assert.throws(()=>assertLinkedBase(a,{tenantId:b.tenantId,deviceId:a.deviceId}),/outra base/);
});

test('conflito guarda a alteração original antes de reabrir a base recuperada',async()=>{
  const r=runtime();try{
    const db=r.load('database/database'),scope=connectionScope(a);
    await db.saveSnapshot(scope,'profile_store','shared',{original:true},9,'now');
    await db.queueProfileStore(scope,{localEdit:'preservar'},a.deviceId);
    const op=(await db.pendingOperations(scope))[0];
    await db.markOperation(scope,op.operationId,'CONFLICT','Base restaurada',{recovered:true},7);
    assert.equal(await db.applyServerOperation(scope,{entityType:'profile_store',entityId:'shared',payload:{recovered:true},version:7,updatedAt:'now'}),true);
    const sql=await db.initializeDatabase(scope),conflict=await sql.getFirstAsync('SELECT local_data FROM sync_conflicts WHERE operation_id=?',op.operationId);
    assert.equal(JSON.parse(conflict.local_data).localEdit,'preservar');
    assert.equal((await db.getEntity(scope,'profile_store','shared')).payload.recovered,true);
    assert.equal((await db.queueStats(scope)).conflicts,1);
  }finally{r.close();}
});
