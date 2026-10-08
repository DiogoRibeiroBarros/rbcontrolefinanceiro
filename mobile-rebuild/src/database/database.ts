import * as SQLite from 'expo-sqlite';
import { scopedName } from '../platform/scopedName';
import { migrateVerifiedLegacy } from './legacyMigration';

export type QueueStatus='PENDING'|'SYNCING'|'SYNCED'|'ERROR'|'CONFLICT';
export type QueueOperation={operationId:string;entityType:string;entityId:string;operation:'CREATE'|'UPDATE'|'DELETE';payload:unknown;baseVersion:number;createdAt:string};
const databases=new Map<string,Promise<SQLite.SQLiteDatabase>>();
const now=()=>new Date().toISOString();
const id=()=>`${Date.now().toString(36)}-${Math.random().toString(36).slice(2,12)}`;

// Explicit scopes keep an old in-flight request in its original database too.
// The legacy rb-gestao-offline.db is preserved, never copied into an unknown base.
export function initializeDatabase(scope:string):Promise<SQLite.SQLiteDatabase>{
  let pending=databases.get(scope);
  if(!pending){pending=(async()=>{const name=await scopedName(scope);const db=await SQLite.openDatabaseAsync(`rb-base-${name}.db`);await db.execAsync(`PRAGMA journal_mode = WAL;
CREATE TABLE IF NOT EXISTS migrations(version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS sync_meta(key TEXT PRIMARY KEY, value TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS entities(entity_type TEXT NOT NULL, entity_id TEXT NOT NULL, payload TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1, updated_at TEXT NOT NULL, deleted_at TEXT, device_id TEXT NOT NULL, sync_status TEXT NOT NULL DEFAULT 'synced', PRIMARY KEY(entity_type,entity_id));
CREATE TABLE IF NOT EXISTS sync_queue(operation_id TEXT PRIMARY KEY, entity_type TEXT NOT NULL, entity_id TEXT NOT NULL, operation TEXT NOT NULL, payload TEXT NOT NULL, base_version INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, retry_count INTEGER NOT NULL DEFAULT 0, last_attempt_at TEXT, last_error TEXT, status TEXT NOT NULL DEFAULT 'PENDING');
CREATE TABLE IF NOT EXISTS sync_conflicts(id INTEGER PRIMARY KEY AUTOINCREMENT, operation_id TEXT NOT NULL, entity_type TEXT NOT NULL, entity_id TEXT NOT NULL, local_data TEXT NOT NULL, server_data TEXT NOT NULL, base_version INTEGER NOT NULL, server_version INTEGER NOT NULL, created_at TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'OPEN');
INSERT OR IGNORE INTO migrations(version,applied_at) VALUES(1,'${now()}');`);
  const migrated=await db.getFirstAsync<{value:string}>("SELECT value FROM sync_meta WHERE key='legacy_checked'");
  if(!migrated){const old=await SQLite.openDatabaseAsync('rb-gestao-offline.db');try{await migrateVerifiedLegacy(db,old,scope);}finally{await old.closeAsync();}await db.runAsync("INSERT OR REPLACE INTO sync_meta(key,value) VALUES('legacy_checked','1')");}
  return db;})();databases.set(scope,pending);void pending.catch(()=>databases.delete(scope));}
  return pending;
}
export async function setDeviceId(scope:string,deviceId:string){await setMeta(scope,'device_id',deviceId);}
export async function getMeta(scope:string,key:string){const db=await initializeDatabase(scope);const row=await db.getFirstAsync<{value:string}>('SELECT value FROM sync_meta WHERE key=?',key);return row?.value||'';}
export async function setMeta(scope:string,key:string,value:string){const db=await initializeDatabase(scope);await db.runAsync('INSERT OR REPLACE INTO sync_meta(key,value) VALUES(?,?)',key,value);}
export async function saveEntity(scope:string,entityType:string,entityId:string,payload:unknown,deviceId:string,operation:'CREATE'|'UPDATE'|'DELETE'='UPDATE'){
  const db=await initializeDatabase(scope);const timestamp=now();const existing=await db.getFirstAsync<{version:number}>('SELECT version FROM entities WHERE entity_type=? AND entity_id=?',entityType,entityId);const version=(existing?.version||0)+1;const deletedAt=operation==='DELETE'?timestamp:null;
  await db.withTransactionAsync(async()=>{await db.runAsync('INSERT OR REPLACE INTO entities(entity_type,entity_id,payload,version,updated_at,deleted_at,device_id,sync_status) VALUES(?,?,?,?,?,?,?,?)',entityType,entityId,JSON.stringify(payload),version,timestamp,deletedAt,deviceId,'pending');await db.runAsync('INSERT INTO sync_queue(operation_id,entity_type,entity_id,operation,payload,base_version,created_at,updated_at,status) VALUES(?,?,?,?,?,?,?,?,?)',id(),entityType,entityId,operation,JSON.stringify(payload),existing?.version||0,timestamp,timestamp,'PENDING');});return version;
}
export async function queueProfileStore(scope:string,profileStore:unknown,deviceId:string){return saveEntity(scope,'profile_store','shared',profileStore,deviceId,'UPDATE');}
export async function saveSnapshot(scope:string,entityType:string,entityId:string,payload:unknown,version:number,updatedAt:string,deviceId='server',deletedAt:string|null=null,fromSync=false){const db=await initializeDatabase(scope);const result=await db.runAsync("INSERT INTO entities(entity_type,entity_id,payload,version,updated_at,deleted_at,device_id,sync_status) VALUES(?,?,?,?,?,?,?,'synced') ON CONFLICT(entity_type,entity_id) DO UPDATE SET payload=excluded.payload,version=excluded.version,updated_at=excluded.updated_at,deleted_at=excluded.deleted_at,device_id=excluded.device_id WHERE entities.sync_status='synced' AND (entities.version<=excluded.version OR ?)",entityType,entityId,JSON.stringify(payload),version,updatedAt,deletedAt,deviceId,fromSync?1:0);return result.changes>0;}
export async function getEntity<T=unknown>(scope:string,entityType:string,entityId:string):Promise<{payload:T;version:number;updatedAt:string}|null>{const db=await initializeDatabase(scope);const row=await db.getFirstAsync<any>('SELECT payload,version,updated_at FROM entities WHERE entity_type=? AND entity_id=? AND deleted_at IS NULL',entityType,entityId);if(!row)return null;return {payload:JSON.parse(row.payload) as T,version:Number(row.version||0),updatedAt:String(row.updated_at||'')};}
export async function queueStats(scope:string){const db=await initializeDatabase(scope);const row=await db.getFirstAsync<any>("SELECT COUNT(*) AS pending FROM sync_queue WHERE status IN ('PENDING','ERROR','SYNCING')");const conflicts=await db.getFirstAsync<any>("SELECT COUNT(*) AS conflicts FROM sync_queue WHERE status='CONFLICT'");return {pending:Number(row?.pending||0),conflicts:Number(conflicts?.conflicts||0),cursor:await getMeta(scope,'server_cursor')};}
export async function pendingOperations(scope:string,limit=50):Promise<QueueOperation[]>{const db=await initializeDatabase(scope);const rows=await db.getAllAsync<any>('SELECT * FROM sync_queue WHERE status IN (\'PENDING\',\'ERROR\') ORDER BY created_at LIMIT ?',limit);return rows.map(row=>({operationId:row.operation_id,entityType:row.entity_type,entityId:row.entity_id,operation:row.operation,payload:JSON.parse(row.payload),baseVersion:row.base_version,createdAt:row.created_at}));}
export async function markOperation(scope:string,operationId:string,status:QueueStatus,error='',serverData:unknown=null,serverVersion=0){
  const db=await initializeDatabase(scope);
  await db.withTransactionAsync(async()=>{
    if(status==='CONFLICT')await db.runAsync("INSERT INTO sync_conflicts(operation_id,entity_type,entity_id,local_data,server_data,base_version,server_version,created_at) SELECT operation_id,entity_type,entity_id,payload,?,base_version,?,? FROM sync_queue WHERE operation_id=? AND status<>'CONFLICT'",JSON.stringify(serverData),serverVersion,now(),operationId);
    await db.runAsync('UPDATE sync_queue SET status=?,last_error=?,updated_at=?,last_attempt_at=? WHERE operation_id=?',status,error,now(),now(),operationId);
    if(status==='SYNCED'||status==='CONFLICT')await db.runAsync("UPDATE entities SET sync_status='synced' WHERE NOT EXISTS(SELECT 1 FROM sync_queue q WHERE q.entity_type=entities.entity_type AND q.entity_id=entities.entity_id AND q.status IN ('PENDING','ERROR','SYNCING'))");
  });
}
export async function applyServerOperation(scope:string,change:any){return saveSnapshot(scope,change.entityType,change.entityId,change.deletedAt?{}:change.payload,change.version,change.updatedAt,change.deviceId||'server',change.deletedAt||null,true);}
