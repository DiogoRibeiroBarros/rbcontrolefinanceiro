let access='',refresh='',terms='',actionToken='';
const $=id=>document.getElementById(id);
const message=value=>{$('message').textContent=value;};
async function api(path,body,method='POST',retry=true){const r=await fetch(path,{method,headers:{'Content-Type':'application/json',...(access?{Authorization:'Bearer '+access}:{})},body:body===undefined?undefined:JSON.stringify(body),credentials:'omit'});if(r.status===401&&refresh&&retry){const t=await api('/v1/auth/refresh',{refreshToken:refresh},'POST',false);access=t.accessToken;refresh=t.refreshToken;return api(path,body,method,false);}const data=await r.json();if(!r.ok)throw new Error(data.error||'Falha na solicitação');return data;}
async function run(fn){try{await fn();}catch(e){message(e.message);}}
function form(id){return Object.fromEntries(new FormData($(id)));}
function list(el,rows,label,onRemove){el.replaceChildren();rows.forEach(row=>{const p=document.createElement('p');p.textContent=label(row);const b=document.createElement('button');b.textContent='Encerrar';b.onclick=()=>run(async()=>{await onRemove(row);await load();});p.append(b);el.append(p);});}
async function load(){const a=await api('/v1/account',undefined,'GET');$('auth').hidden=true;$('account').hidden=false;$('identity').textContent=a.user.name+' — '+a.user.email;$('subscription').textContent=`Plano ${a.plan}. Status ${a.subscription.status}. Fim do teste: ${a.subscription.trialEndsAt||'—'}. Período pago até: ${a.subscription.currentPeriodEnd||'—'}.`;
 list($('devices'),await api('/v1/devices',undefined,'GET'),d=>d.name+' — '+(d.revokedAt?'revogado':d.platform),d=>api('/v1/devices/'+encodeURIComponent(d.id),undefined,'DELETE'));
 list($('sessions'),await api('/v1/sessions',undefined,'GET'),s=>'Sessão de '+new Date(s.createdAt).toLocaleString(),s=>api('/v1/sessions/'+encodeURIComponent(s.id),undefined,'DELETE'));}
$('credentials').onsubmit=e=>{e.preventDefault();void run(async()=>{const b=form('credentials'),t=await api('/v1/auth/login',{email:b.email,password:b.password});access=t.accessToken;refresh=t.refreshToken;$('credentials').reset();await load();});};
document.addEventListener('click',e=>{const action=e.target.dataset.action;if(!action)return;void run(async()=>{const b=form('credentials');if(action==='register'){if(!b.terms)throw new Error('Aceite os termos após a leitura.');await api('/v1/auth/register',{name:b.name,email:b.email,password:b.password,termsVersion:terms});message('Conta criada. Confirme o e-mail e entre.');}
 else if(action==='forgot'){await api('/v1/auth/forgot-password',{email:b.email});message('Se existir uma conta, enviaremos instruções.');}
 else if(action==='verify'){await api('/v1/auth/verification',{});message('Verificação solicitada.');}
 else if(action==='refresh')await load();
 else if(action==='logout'){await api('/v1/auth/logout',{});access=refresh='';location.reload();}
 else if(action==='cancel'){if(confirm('Cancelar a próxima renovação?')){await api('/v1/payments/cancel',{});await load();}}
 else if(['PRO','BUSINESS'].includes(action)){const r=await api('/v1/payments/checkout',{plan:action});const u=new URL(r.url);if(u.protocol!=='https:'&&u.origin!==location.origin)throw new Error('Endereço recusado');location.assign(u.href);}
 else if(action==='export'){const data=await api('/v1/account/export',undefined,'GET'),url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='conta-rb.json';a.click();URL.revokeObjectURL(url);}
 });});
$('password').onsubmit=e=>{e.preventDefault();void run(async()=>{await api('/v1/auth/change-password',form('password'));access=refresh='';location.reload();});};
$('delete').onsubmit=e=>{e.preventDefault();void run(async()=>{await api('/v1/account',{password:form('delete').password},'DELETE');access=refresh='';location.reload();});};
$('reset-form').onsubmit=e=>{e.preventDefault();void run(async()=>{await api('/v1/auth/reset',{token:actionToken,password:form('reset-form').password});actionToken='';$('reset').hidden=true;message('Senha alterada. Entre novamente.');});};
void run(async()=>{const hash=new URLSearchParams(location.hash.slice(1));history.replaceState(null,'',location.pathname);const p=await api('/v1/plans',undefined,'GET');terms=p.termsVersion;const d=await api('/v1/downloads',undefined,'GET');if(d.url){const u=new URL(d.url);if(u.protocol==='https:'){const a=document.createElement('a');a.href=u.href;a.textContent='Baixar aplicativo';$('download').replaceChildren(a);}}if(hash.has('verify')){await api('/v1/auth/verify',{token:hash.get('verify')});message('E-mail confirmado.');}if(hash.has('reset')){actionToken=hash.get('reset');$('reset').hidden=false;}});
