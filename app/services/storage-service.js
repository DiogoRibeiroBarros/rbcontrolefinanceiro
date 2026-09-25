(function(root){
 'use strict';
 var KEY='rb_gestao_financeira_profiles_v1',LEGACY='rb_gestao_financeira_windows_v120';
 function StorageService(storage,bridge){this.storage=storage;this.bridge=bridge;this.failed=false;}
 StorageService.prototype.checkpoint=function(){var raw=this.storage.getItem(KEY)||this.storage.getItem(LEGACY);if(raw)this.storage.setItem(KEY+'_pre_migration_'+Date.now(),raw);};
 StorageService.prototype.load=function(){
  var existing=this.storage.getItem(KEY),old=this.storage.getItem(LEGACY);
  try{if(this.bridge){var result=this.bridge.load();if(!result.ok)throw new Error(result.error);if(result.value)return result.value;}
   var value=existing?JSON.parse(existing):null;if(existing||old)this.checkpoint();return value;
  }catch(e){this.failed=true;throw e;}
 };
 StorageService.prototype.save=function(value){if(this.failed)throw new Error('Base preservada: restaure um backup para continuar.');if(this.bridge){var r=this.bridge.save(value);if(!r.ok)throw new Error(r.error);}this.storage.setItem(KEY,JSON.stringify(value));};
 StorageService.prototype.export=function(){return this.load();};
 StorageService.prototype.import=function(value){if(!value||!Array.isArray(value.profiles)||!value.sharedData)throw new Error('Backup inválido');this.checkpoint();if(this.bridge){var r=this.bridge.restore(value);if(!r.ok)throw new Error(r.error);}this.failed=false;this.storage.setItem(KEY,JSON.stringify(value));return value;};
 root.RBStorageService=StorageService;if(typeof module!=='undefined')module.exports=StorageService;
})(typeof window!=='undefined'?window:globalThis);
