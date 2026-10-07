import {ed25519} from '@noble/curves/ed25519';
const bytes=(s:string)=>Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
export function verifyMobileLicense(envelope:{payload:string;signature:string},pem:string,installationId:string,now=Date.now(),lastSeen=0):any|null{
 try{const der=bytes(pem.replace(/-----[^-]+-----/g,'').replace(/\s/g,''));if(der.length!==44)return null;const publicKey=der.slice(-32);if(!ed25519.verify(bytes(envelope.signature),new TextEncoder().encode(envelope.payload),publicKey))return null;
 const p=JSON.parse(new TextDecoder().decode(bytes(envelope.payload))),issued=Date.parse(p.issuedAt),end=Date.parse(p.offlineGraceUntil),perpetual=p.plan==='VIP';if(p.version!==1||p.issuer!=='rb-commercial'||p.audience!=='rb-gestao'||p.installationId!==installationId||!['FREE','PRO','BUSINESS','VIP'].includes(p.plan)||['suspended','expired','revoked'].includes(p.status)||!Number.isFinite(issued)||!Number.isFinite(end)||now<issued-300000||now<lastSeen-300000||now>end||(!perpetual&&end-issued>7*86400000))return null;return p;
 }catch{return null;}
}
