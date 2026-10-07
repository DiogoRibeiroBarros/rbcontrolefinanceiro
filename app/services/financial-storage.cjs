'use strict';
const fs=require('node:fs'),path=require('node:path');
class FinancialStorage{
 constructor(directory,rights){this.file=path.join(directory,'financial-store-v2.json');this.rights=rights;}
 load(){return fs.existsSync(this.file)?JSON.parse(fs.readFileSync(this.file,'utf8')):null;}
 checkpoint(){if(fs.existsSync(this.file)){const dir=path.join(path.dirname(this.file),'migration-backups');fs.mkdirSync(dir,{recursive:true});fs.copyFileSync(this.file,path.join(dir,Date.now()+'-'+require('node:crypto').randomUUID()+'.json'));}}
 save(value,{migration=false,restore=false}={}){
  if(!value||!Array.isArray(value.profiles)||!value.profiles.length||!value.sharedData)throw new Error('Base financeira inválida');
  const current=this.load();if(current&&!migration&&!restore){
   const old=current.sharedData,next=value.sharedData;
   if(!this.rights.can('investments')&&['investments','investmentMovements'].some(k=>JSON.stringify(old[k]||[])!==JSON.stringify(next[k]||[])))throw new Error('Investimentos disponíveis para consulta. PRO necessário para alterações.');
   if(value.profiles.length>current.profiles.length&&value.profiles.length>this.rights.limit('profiles'))throw new Error('Limite de perfis do plano atingido');
   const countRecords=store=>Object.entries(store||{}).filter(([key,val])=>Array.isArray(val)&&!['categories','settings'].includes(key)).reduce((total,[,val])=>total+val.length,0);const before=countRecords(old),after=countRecords(next),recordLimit=this.rights.limit('records');if(after>before&&after>recordLimit)throw new Error('Limite de registros do plano atingido');
  }
  if(migration||restore)this.checkpoint();
  fs.mkdirSync(path.dirname(this.file),{recursive:true});fs.writeFileSync(this.file+'.tmp',JSON.stringify(value));fs.renameSync(this.file+'.tmp',this.file);return value;
 }
}
module.exports={FinancialStorage};
