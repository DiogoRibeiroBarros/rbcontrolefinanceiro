'use strict';
const fs=require('node:fs'),path=require('node:path');
class SecureStorage{
 constructor(file,safeStorage){this.file=file;this.safe=safeStorage;}
 load(){if(!fs.existsSync(this.file))return {};if(!this.safe.isEncryptionAvailable())throw new Error('Cofre do sistema indisponível');return JSON.parse(this.safe.decryptString(fs.readFileSync(this.file)));}
 save(value){if(!this.safe.isEncryptionAvailable()||this.safe.getSelectedStorageBackend?.()==='basic_text')throw new Error('Cofre seguro indisponível');fs.mkdirSync(path.dirname(this.file),{recursive:true});fs.writeFileSync(this.file+'.tmp',this.safe.encryptString(JSON.stringify(value)));fs.renameSync(this.file+'.tmp',this.file);}
}
module.exports={SecureStorage};
