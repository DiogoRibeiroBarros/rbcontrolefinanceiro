(function(){
 'use strict';
 var state=null;
 var bridge=window.rbDesktop&&window.rbDesktop.commercial;
 function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
 function date(v){return v?new Date(v).toLocaleDateString('pt-BR'):'—';}
 function can(feature){return !bridge||!!(state&&state.license.entitlements.features[feature]);}
 function notify(){window.dispatchEvent(new CustomEvent('rb-commercial-changed'));}
 async function update(){if(!bridge)return;try{state=await bridge.call('status');notify();}catch{}}
 function render(){
  if(!bridge)return '<section class="card"><h2>Conta RB</h2><p>Gerencie a conta comercial pelo aplicativo Windows ou pelo aplicativo móvel. Seus perfis financeiros permanecem separados.</p></section>';
  if(!state)return '<section class="card">Carregando conta RB…</section>';
  var user=state.user,license=state.license,sub=state.subscription||{};
  return '<section class="card"><h2>Conta RB <span class="green">'+esc(license.plan)+'</span></h2><p>Identidade comercial separada dos perfis financeiros deste computador.</p>'+(state.configured?'':'<p>A API comercial ainda não foi configurada nesta distribuição. O modo FREE está disponível.</p>')+
   (user?'<h3>'+esc(user.name)+'</h3><p>'+esc(user.email)+(user.verified?'':' — verificação pendente')+'</p><p>Status: '+esc(sub.status)+' · Renovação: '+date(sub.currentPeriodEnd)+' · Fim do teste: '+date(sub.trialEndsAt)+'</p><p>Licença offline até: '+date(license.offlineGraceUntil)+'</p><div class="row wrap"><button class="primary-btn" data-commercial="refresh">Atualizar licença</button><button class="secondary-btn" data-commercial="portal">Gerenciar assinatura / segurança</button><button class="secondary-btn" data-commercial="devices">Meus dispositivos</button><button class="secondary-btn" data-commercial="verify">Reenviar verificação</button><button class="secondary-btn" data-commercial="logout">Sair da conta RB</button></div><div class="row wrap"><button class="primary-btn" data-commercial="checkout" data-plan="PRO">Conhecer PRO</button><button class="secondary-btn" data-commercial="checkout" data-plan="BUSINESS">Conhecer BUSINESS</button></div>':
   '<form id="rb-account-form"><label>Nome (cadastro)<input class="input" name="name" maxlength="100" autocomplete="name"></label><label>E-mail<input class="input" name="email" type="email" required autocomplete="email"></label><label>Senha da conta RB<input class="input" name="password" type="password" minlength="12" maxlength="128" required autocomplete="current-password"></label><p><label><input name="terms" type="checkbox"> Li os termos e a política disponíveis no portal da conta.</label></p><div class="row wrap"><button class="primary-btn" type="submit">Entrar</button><button class="secondary-btn" type="button" data-commercial="register">Criar conta</button><button class="secondary-btn" type="button" data-commercial="forgot">Recuperar senha</button><button class="secondary-btn" type="button" data-commercial="free">Continuar com FREE</button><button class="secondary-btn" type="button" data-commercial="portal">Termos e privacidade</button></div></form>')+
   '<p>Versão '+esc(state.appVersion)+' · Instalação '+esc(state.installationId)+'</p><p>Limite de dispositivos: '+esc(license.entitlements.limits.devices)+'</p><p id="rb-commercial-message" role="status">'+esc(state.message)+'</p><div id="rb-commercial-devices"></div></section>';
 }
 async function action(name,button){try{
  var data={},form=document.querySelector('#rb-account-form');if(form)data=Object.fromEntries(new FormData(form));
  if(name==='register'){if(!form.reportValidity())return;if(!data.terms)throw new Error('Leia e aceite os termos para criar a conta.');var plans=await bridge.call('plans');data.termsVersion=plans.termsVersion;delete data.terms;}
  if(name==='checkout')data={plan:button.getAttribute('data-plan')};if(name==='revoke')data={id:button.getAttribute('data-id')};
  var result=await bridge.call(name,data);
  if(name==='devices'){var el=document.querySelector('#rb-commercial-devices');el.innerHTML='<h3>Dispositivos ('+result.filter(function(d){return !d.revokedAt;}).length+')</h3>'+result.map(function(d){return '<p>'+esc(d.name)+' · '+esc(d.platform)+' · '+(d.revokedAt?'Revogado':'Ativo <button class="secondary-btn" data-commercial="revoke" data-id="'+esc(d.id)+'">Encerrar acesso</button>')+'</p>';return;}
  await update();var message=document.querySelector('#rb-commercial-message');if(message)message.textContent=result.message||'Operação concluída.';
 }catch(e){var target=document.querySelector('#rb-commercial-message');if(target)target.textContent=e.message;}}
 document.addEventListener('click',function(e){var b=e.target.closest('[data-commercial]');if(b&&bridge){e.preventDefault();void action(b.getAttribute('data-commercial'),b);}});
 document.addEventListener('submit',function(e){if(e.target.id==='rb-account-form'){e.preventDefault();void action('login',e.target);}});
 window.RBCommercial={render,can,status:function(){return state;},check:function(feature){if(can(feature))return true;alert('Este recurso requer PRO. Os dados existentes continuam disponíveis para consulta e exportação. Abra Minha conta para conhecer os planos.');return false;}};
 document.addEventListener('DOMContentLoaded',update);
})();
