(function(){
 'use strict';
 var state=null,mode='login',busy=false;
 var bridge=window.rbDesktop&&window.rbDesktop.commercial;
 function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
 function date(v){return v?new Date(v).toLocaleDateString('pt-BR'):'—';}
 function can(feature){return !bridge||!!(state&&state.license&&state.license.entitlements&&state.license.entitlements.features[feature]);}
 function notify(){window.dispatchEvent(new CustomEvent('rb-commercial-changed'));}
 async function update(){if(!bridge)return;try{state=await bridge.call('status');notify();}catch(error){state=state||{configured:true,license:{plan:'FREE',entitlements:{features:{},limits:{}}},message:error.message};notify();}}
 function authForm(){
  var creating=mode==='register';
  return '<div class="rb-commercial-auth"><div class="commercial-auth-hero"><div class="commercial-auth-logo">RB</div><div><span class="commercial-eyebrow">CONTA RB GESTÃO</span><h2>'+(creating?'Crie sua conta':'Bem-vindo de volta')+'</h2><p>'+(creating?'Cadastre-se para ativar sua licença e acessar seus dispositivos.':'Entre para sincronizar sua licença e continuar com segurança.')+'</p></div></div><div class="commercial-auth-tabs"><button type="button" class="'+(!creating?'active':'')+'" data-commercial-mode="login">Entrar</button><button type="button" class="'+(creating?'active':'')+'" data-commercial-mode="register">Criar conta</button></div><form id="rb-account-form" novalidate>'+(creating?'<label>Nome completo<input class="input" name="name" maxlength="100" autocomplete="name" required placeholder="Como devemos chamar você?"></label>':'')+'<label>E-mail<input class="input" name="email" type="email" required autocomplete="email" placeholder="voce@exemplo.com"></label><label>Senha<input class="input" name="password" type="password" minlength="8" maxlength="128" required autocomplete="'+(creating?'new-password':'current-password')+'" placeholder="Mínimo de 8 caracteres"></label>'+(creating?'<label class="commercial-terms"><input name="terms" type="checkbox" required> <span>Li e aceito os termos e a política de privacidade.</span></label>':'')+'<p class="commercial-form-error" id="rb-commercial-form-error" role="alert" hidden></p><button class="primary-btn commercial-submit" type="submit">'+(creating?'Criar conta e entrar':'Entrar na conta')+' <span>→</span></button></form><div class="commercial-auth-links">'+(!creating?'<button type="button" data-commercial="forgot">Esqueci minha senha</button>':'<button type="button" data-commercial-mode="login">Já tenho uma conta</button>')+'<button type="button" data-commercial="import-license">Ativar token VIP</button><button type="button" data-commercial="free">Continuar com FREE</button></div></div>';
 }
 function render(){
  if(!bridge)return '<section class="card"><h2>Conta RB</h2><p>Gerencie a conta comercial pelo aplicativo Windows ou pelo aplicativo móvel. Seus perfis financeiros permanecem separados.</p></section>';
  if(!state)return '<section class="card">Carregando conta RB…</section>';
  var user=state.user,license=state.license||{},sub=state.subscription||{};
  var feature=(license.entitlements&&license.entitlements.limits)||{};
  var content=user?'<div class="commercial-account-head"><div class="commercial-avatar">'+esc(String(user.name||'R').charAt(0).toUpperCase())+'</div><div><span class="commercial-eyebrow">CONTA CONECTADA</span><h2>'+esc(user.name)+'</h2><p>'+esc(user.email)+(user.verified?'':' · verificação pendente')+'</p></div><span class="commercial-plan">'+esc(license.plan||'FREE')+'</span></div><div class="commercial-account-summary"><div><small>Status</small><strong>'+esc(sub.status||'active')+'</strong></div><div><small>Licença offline até</small><strong>'+date(license.offlineGraceUntil)+'</strong></div><div><small>Dispositivos</small><strong>'+esc(feature.devices||0)+'</strong></div></div><div class="row wrap commercial-account-actions"><button class="primary-btn" data-commercial="refresh">Atualizar licença</button><button class="secondary-btn" data-commercial="devices">Meus dispositivos</button><button class="secondary-btn" data-commercial="verify">Reenviar verificação</button><button class="secondary-btn" data-commercial="logout">Sair da conta</button></div><div class="row wrap"><button class="primary-btn" data-commercial="checkout" data-plan="PRO">Conhecer PRO</button><button class="secondary-btn" data-commercial="portal">Termos e privacidade</button></div>':authForm();
  return '<section class="card rb-commercial-card"><div class="commercial-card-top"><div><span class="commercial-eyebrow">LICENÇA E SINCRONIZAÇÃO</span><h2>Conta RB Gestão</h2><p>Use a mesma conta no desktop e nos seus dispositivos autorizados.</p></div><span class="commercial-status-dot '+(state.configured?'online':'offline')+'">'+(state.configured?'Serviço online':'Modo local')+'</span></div>'+content+'<p>Versão '+esc(state.appVersion||'')+' · Instalação '+esc(state.installationId||'')+'</p><p id="rb-commercial-message" class="commercial-message" role="status">'+esc(state.message||'')+'</p><div id="rb-commercial-devices"></div></section>';
 }
 function showError(message){var target=document.querySelector('#rb-commercial-form-error');if(target){target.textContent=message;target.hidden=!message;}}
 function setBusy(value){busy=value;var form=document.querySelector('#rb-account-form');if(!form)return;Array.prototype.slice.call(form.querySelectorAll('button,input')).forEach(function(el){el.disabled=value;});var submit=form.querySelector('button[type=submit]');if(submit)submit.innerHTML=value?'Conectando…':'Entrar na conta <span>→</span>';}
 async function action(name,button){
  if(busy)return;
  try{
   var data={},form=document.querySelector('#rb-account-form');if(form)data=Object.fromEntries(new FormData(form));
   if(name==='import-license'){var token=window.prompt('Cole o token VIP fornecido pelo administrador:');if(!token)return;data={token:token.trim()};}
   if(name==='register'){
    if(!form.reportValidity())return;if(!data.terms)throw new Error('Aceite os termos para criar a conta.');
    data.termsVersion='2026-10';delete data.terms;setBusy(true);await bridge.call('register',data);
    await bridge.call('login',{email:data.email,password:data.password});mode='login';
   }else{
    if(name==='checkout')data={plan:button.getAttribute('data-plan')};
    if(name==='revoke')data={id:button.getAttribute('data-id')};
    if(name==='login'){if(!form.reportValidity())return;setBusy(true);await bridge.call('login',data);}
    else {var result=await bridge.call(name,data);if(name==='devices'){var el=document.querySelector('#rb-commercial-devices');if(el)el.innerHTML='<h3>Dispositivos ('+result.filter(function(d){return !d.revokedAt;}).length+')</h3>'+result.map(function(d){return '<p>'+esc(d.name)+' · '+esc(d.platform)+' · '+(d.revokedAt?'Revogado':'Ativo <button class="secondary-btn" data-commercial="revoke" data-id="'+esc(d.id)+'">Encerrar acesso</button>')+'</p>';}).join('');}}
   }
   await update();var message=document.querySelector('#rb-commercial-message');if(message)message.textContent=name==='register'?'Conta criada e login realizado.':(message.textContent||'Operação concluída.');
   showError('');
  }catch(error){showError(error.message||'Não foi possível concluir a operação.');var target=document.querySelector('#rb-commercial-message');if(target)target.textContent=error.message||'Não foi possível concluir a operação.';}
  finally{setBusy(false);}
 }
 document.addEventListener('click',function(e){var modeButton=e.target.closest('[data-commercial-mode]');if(modeButton){e.preventDefault();mode=modeButton.getAttribute('data-commercial-mode')||'login';notify();return;}var b=e.target.closest('[data-commercial]');if(b&&bridge){e.preventDefault();void action(b.getAttribute('data-commercial'),b);}});
 document.addEventListener('submit',function(e){if(e.target.id==='rb-account-form'){e.preventDefault();void action(mode==='register'?'register':'login',e.target);}});
 window.RBCommercial={render,can,status:function(){return state;},check:function(feature){if(can(feature))return true;alert('Este recurso requer PRO. Os dados existentes continuam disponíveis para consulta e exportação. Abra Conta RB para conhecer os planos.');return false;}};
 document.addEventListener('DOMContentLoaded',update);
})();
