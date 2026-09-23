import {createHash,randomBytes,sign,createPrivateKey} from 'node:crypto';
import argon2 from 'argon2';
export const token=()=>randomBytes(32).toString('base64url');
export const digest=(value:string)=>createHash('sha256').update(value).digest('hex');
export const hashPassword=(value:string)=>argon2.hash(value,{type:argon2.argon2id,memoryCost:65536,timeCost:3,parallelism:1});
export const verifyPassword=(hash:string,value:string)=>argon2.verify(hash,value);
export function signedLicense(payload:object,privateKey:string){const encoded=Buffer.from(JSON.stringify(payload)).toString('base64url');return {payload:encoded,signature:sign(null,Buffer.from(encoded),createPrivateKey(privateKey)).toString('base64url')};}
export function sanitize(value:unknown):unknown {if(Array.isArray(value))return value.map(sanitize);if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,/password|pin|token|secret|authorization|cookie|financial|profileStore|payload/i.test(k)?'[REDACTED]':sanitize(v)]));return typeof value==='string'?value.replace(/Bearer\s+\S+/gi,'Bearer [REDACTED]').replace(/([?&](?:key|token)=)[^&\s]*/gi,'$1[REDACTED]'):value;}
