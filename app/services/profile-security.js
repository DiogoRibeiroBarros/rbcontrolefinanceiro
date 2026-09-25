(function(root){
 'use strict';
 var ITERATIONS=600000;
 var cryptoApi=root.crypto||(typeof require==='function'?require('node:crypto').webcrypto:null);
 function hex(bytes){return Array.from(new Uint8Array(bytes)).map(function(b){return b.toString(16).padStart(2,'0');}).join('');}
 function unhex(value){if(!/^[a-f0-9]+$/i.test(value)||value.length%2)throw new Error('Salt inválido');return new Uint8Array(value.match(/../g).map(function(x){return parseInt(x,16);}));}
 async function create(password){if(!cryptoApi?.subtle)throw new Error('Criptografia indisponível');var salt=cryptoApi.getRandomValues(new Uint8Array(16)),key=await cryptoApi.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);return {passwordVersion:2,passwordAlgorithm:'pbkdf2-sha256',passwordSalt:hex(salt),passwordIterations:ITERATIONS,passwordHash:hex(await cryptoApi.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt,iterations:ITERATIONS},key,256))};}
 async function verify(password,profile){
  if(profile.passwordVersion===2){if(profile.passwordAlgorithm!=='pbkdf2-sha256'||!Number.isSafeInteger(profile.passwordIterations)||profile.passwordIterations<100000||profile.passwordIterations>2000000)return false;var key=await cryptoApi.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveBits']);return hex(await cryptoApi.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:unhex(profile.passwordSalt),iterations:profile.passwordIterations},key,256))===profile.passwordHash;}
  var value=profile.id+'|RB-GESTAO|'+password;
  if(profile.passwordHash.startsWith('legacy-')){var h=2166136261;for(var i=0;i<value.length;i++){h^=value.charCodeAt(i);h=Math.imul(h,16777619);}return 'legacy-'+(h>>>0).toString(16)===profile.passwordHash;}
  return hex(await cryptoApi.subtle.digest('SHA-256',new TextEncoder().encode(value)))===profile.passwordHash;
 }
 root.RBProfileSecurity={create,verify};if(typeof module!=='undefined')module.exports=root.RBProfileSecurity;
})(typeof window!=='undefined'?window:globalThis);
