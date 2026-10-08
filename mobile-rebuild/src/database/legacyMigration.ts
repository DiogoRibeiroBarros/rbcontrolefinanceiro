import type {SQLiteDatabase} from 'expo-sqlite';

// Copy, never move or erase. Unknown legacy records stay in the original file.
export async function migrateVerifiedLegacy(db:SQLiteDatabase,old:SQLiteDatabase,scope:string){
  const deviceId=JSON.parse(scope)[2];
  const exists=await old.getFirstAsync<{name:string}>("SELECT name FROM sqlite_master WHERE type='table' AND name='entities'");
  if(!exists)return;
  const row=await old.getFirstAsync<any>("SELECT * FROM entities WHERE entity_type='profile_store' AND entity_id='shared'");
  if(!row)return;
  let payload:any;try{payload=JSON.parse(row.payload);}catch{return;}
  if(payload?.cloudDeviceId!==deviceId)return;
  const shared=payload.sharedData||{},home=shared.homeExpenses||{};
  const count=['entries','bankAccounts','bankTransactions','cards','cardTransactions','invoicePayments','loans','subscriptions','investments','investmentMovements','savingsBoxes','savingsMovements','salaryRecords'].reduce((n,k)=>n+(Array.isArray(shared[k])?shared[k].length:0),0)+['residents','bills','residentDebts'].reduce((n,k)=>n+(Array.isArray(home[k])?home[k].length:0),0);
  if(!count||row.deleted_at)return; // Preserve a stale blank in the old file, not the active base.
  await db.withTransactionAsync(async()=>{
    await db.runAsync('INSERT OR IGNORE INTO entities(entity_type,entity_id,payload,version,updated_at,deleted_at,device_id,sync_status) VALUES(?,?,?,?,?,?,?,?)',row.entity_type,row.entity_id,row.payload,row.version,row.updated_at,row.deleted_at,row.device_id,row.sync_status);
    const queue=await old.getAllAsync<any>("SELECT * FROM sync_queue WHERE entity_type='profile_store' AND entity_id='shared' AND status<>'SYNCED'");
    for(const item of queue){let value:any;try{value=JSON.parse(item.payload);}catch{continue;}if(value?.cloudDeviceId!==deviceId||value?.cloudTenantId!==payload.cloudTenantId)continue;
      await db.runAsync('INSERT OR IGNORE INTO sync_queue(operation_id,entity_type,entity_id,operation,payload,base_version,created_at,updated_at,retry_count,last_attempt_at,last_error,status) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)',item.operation_id,item.entity_type,item.entity_id,item.operation,item.payload,item.base_version,item.created_at,item.updated_at,item.retry_count,item.last_attempt_at,item.last_error,item.status);
    }
  });
}
