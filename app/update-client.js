(function () {
  'use strict';
  // Subscribes once at application startup, independently of route/settings rendering.
  var api = window.rbDesktop && window.rbDesktop.updates;
  var state = { phase:'idle', supported:!!api, currentVersion:'', version:'', progress:0 };
  var modalOpen = false;
  var pendingPrompt = null;
  var previousFocus = null;
  var unsubscribers = [];
  var observer;
  function escape(value) { return String(value == null ? '' : value).replace(/[&<>"']/g, function(c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function accept(value) {
    if (!value) return;
    state = Object.assign({}, state, value);
    if (value.progress && typeof value.progress === 'object') state.progress=Number(value.progress.percent)||0;
    if (value.status && !value.phase) state.phase=value.status;
    if (typeof value.enabled === 'boolean' && value.supported == null) state.supported=value.enabled;
    if (value.lastCheckedAt && !value.lastCheck) state.lastCheck=value.lastCheckedAt;
    if (typeof value.percent === 'number' && value.progress == null) state.progress=value.percent;
    renderStatus();
    if (modalOpen) renderModal();
  }
  function renderStatus() {
    var summary=document.querySelector('[data-update-summary]');
    if (!summary) return;
    summary.textContent=state.supported ? 'Verificação automática ativa — ao iniciar e a cada 4 horas, em qualquer tela.' : 'Verificação automática disponível no aplicativo Windows instalado.';
    document.querySelector('[data-update-last-check]').textContent='Última verificação: '+(state.lastCheck ? new Date(state.lastCheck).toLocaleString('pt-BR') : 'ainda não realizada');
    var labels={checking:'Verificando atualizações…', available:'Nova versão disponível: '+state.version, deferred:'Atualização '+state.version+' adiada.', downloading:'Baixando atualização: '+Math.round(Number(state.progress)||0)+'%', downloaded:'Atualização pronta para instalar.', installing:'Preparando reinicialização…'};
    document.querySelector('[data-update-message]').textContent=state.message || labels[state.phase] || '';
    document.querySelectorAll('.update-settings-card [data-action]').forEach(function(button) { button.disabled=!state.supported || ['checking','downloading','installing'].includes(state.phase); });
    var open=document.querySelector('.update-settings-card [data-update-action="open"]');
    if(open) open.hidden=!state.version || !['available','deferred','downloading','downloaded'].includes(state.phase);
  }
  function modalRoot() { return document.getElementById('global-update-root'); }
  function close() {
    modalOpen=false;
    pendingPrompt=null;
    modalRoot().replaceChildren();
    var shell=document.getElementById('app-shell');
    if(shell) shell.inert=false;
    if(previousFocus && previousFocus.isConnected) previousFocus.focus();
  }
  function showPrompt(value) {
    accept(value);
    var other=document.getElementById('modal-root');
    if (other && other.childElementCount) { pendingPrompt=value||state; return; }
    if(!modalOpen) previousFocus=document.activeElement;
    pendingPrompt=null;
    modalOpen=true;
    var shell=document.getElementById('app-shell');
    if(shell) shell.inert=true;
    renderModal();
  }
  function renderModal() {
    var focus=document.activeElement && document.activeElement.getAttribute('data-update-action');
    var phase=state.phase;
    var title='Nova atualização disponível', body='<p>RB Gestão <strong>'+escape(state.version)+'</strong> está disponível.</p>', buttons='';
    if(phase==='downloading') {
      title='Atualizando RB Gestão';
      var percent=Math.max(0,Math.min(100,Number(state.progress)||0));
      body='<p>Baixando e verificando a integridade do instalador.</p><progress max="100" value="'+percent+'" aria-label="Progresso da atualização"></progress><p aria-live="polite">'+Math.round(percent)+'%</p>';
      buttons='<button class="secondary-btn" data-update-action="later">Continuar trabalhando</button>';
    } else if(phase==='downloaded') {
      title='Atualização pronta';
      body='<p>Versão '+escape(state.version)+' baixada e verificada. Salve seu trabalho antes de reiniciar.</p>';
      buttons='<button class="secondary-btn" data-update-action="later">Reiniciar depois</button><button class="lime-btn" data-update-action="restart">Reiniciar e atualizar</button>';
    } else if(phase==='installing') {
      title='Preparando atualização'; body='<p>O aplicativo será reiniciado para concluir a instalação.</p>';
    } else if(phase==='error') {
      title='Não foi possível atualizar';
      body='<p role="alert">'+escape(state.error || state.message || 'Tente novamente mais tarde.')+'</p>';
      buttons='<button class="secondary-btn" data-update-action="later">Fechar</button><button class="lime-btn" data-update-action="check">Verificar novamente</button>';
    } else {
      buttons='<button class="secondary-btn" data-update-action="defer">Mais tarde</button><button class="lime-btn" data-update-action="download">Atualizar agora</button>';
    }
    modalRoot().innerHTML='<div class="modal-backdrop"><section class="modal global-update-modal" role="dialog" aria-modal="true" aria-labelledby="global-update-title"><span class="settings-kicker">ATUALIZAÇÃO DO RB GESTÃO</span><h2 id="global-update-title">'+title+'</h2><p class="modal-desc">Você está usando: '+escape(state.currentVersion)+'</p>'+body+'<div class="actions">'+buttons+'</div></section></div>';
    var target=focus && modalRoot().querySelector('[data-update-action="'+focus+'"]');
    target=target||modalRoot().querySelector('button');
    if(target) target.focus();
  }
  async function invoke(method, value) {
    if(!api || typeof api[method]!=='function') return;
    try { var result=await api[method](value); accept(result); return result; }
    catch(error) { accept({phase:'error', error:error.message||'Serviço de atualização indisponível.'}); }
  }
  async function action(name) {
    if(name==='later') return close();
    if(name==='open') return showPrompt(state);
    if(name==='defer') { var version=state.version; close(); return invoke('defer',version); }
    if(name==='download') { accept({phase:'downloading',progress:0,message:''}); return invoke('download',state.version); }
    if(name==='restart') { accept({phase:'installing',message:''}); return invoke('install'); }
    if(name==='check') { close(); return invoke('check'); }
  }
  window.rbUpdateClient={ renderStatus:renderStatus, check:function(force){return invoke(force?'force':'check');} };
  document.addEventListener('DOMContentLoaded',function() {
    if(!modalRoot()) { var node=document.createElement('div'); node.id='global-update-root'; document.body.appendChild(node); }
    document.addEventListener('click',function(event) {
      var button=event.target.closest('[data-update-action]');
      if(!button)return;
      event.preventDefault(); event.stopImmediatePropagation();
      if(!button.disabled) void action(button.getAttribute('data-update-action'));
    },true);
    document.addEventListener('keydown',function(event) {
      if(!modalOpen)return;
      if(event.key==='Escape') { event.preventDefault(); event.stopImmediatePropagation(); if(state.phase!=='installing') void action(['available','deferred'].includes(state.phase)?'defer':'later'); }
      if(event.key==='Tab') { var items=modalRoot().querySelectorAll('button:not(:disabled)'); if(!items.length)return; var first=items[0],last=items[items.length-1]; if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();} else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();} }
    },true);
    observer=new MutationObserver(function(){ if(pendingPrompt && !document.getElementById('modal-root').childElementCount) showPrompt(pendingPrompt); });
    observer.observe(document.getElementById('modal-root'),{childList:true});
    if(api) {
      if(api.onState) unsubscribers.push(api.onState(accept));
      if(api.onPrompt) unsubscribers.push(api.onPrompt(showPrompt));
      if(api.status) void invoke('status');
    }
    renderStatus();
  });
  window.addEventListener('beforeunload',function(){ unsubscribers.forEach(function(unsubscribe){if(typeof unsubscribe==='function')unsubscribe();}); if(observer)observer.disconnect(); });
})();
