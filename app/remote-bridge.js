(function () {
  var PROFILE_KEY = 'rb_gestao_financeira_profiles_v1';
  var LOGIN_SESSION_KEY = 'rb_gestao_financeira_authenticated_profile_v1';
  var originalSetItem = Storage.prototype.setItem;
  var loading = true;
  var syncQueue = Promise.resolve();
  var lastSnapshotExportedAt = '';
  var pollTimer = null;
  var nativeBridge = location.protocol === 'file:' && window.ReactNativeWebView;
  // Desktop uses IPC. Never poll a fictitious HTTP endpoint from a local file.
  if(location.protocol === 'file:' && !nativeBridge) return;
  if(location.protocol === 'https:' && new URL(location.href).searchParams.has('key')) history.replaceState(null,'',location.pathname);
  function sendNative(message) {
    if (!nativeBridge) return;
    try { window.ReactNativeWebView.postMessage(JSON.stringify(message)); } catch (_) {}
  }
  function imageAsDataUrl(src) {
    if(!src || src.indexOf('data:')===0) return Promise.resolve(src);
    return fetch(src,{credentials:'include',cache:'no-store'}).then(function(response){if(!response.ok)throw new Error('Imagem indisponível');return response.blob();}).then(function(blob){return new Promise(function(resolve,reject){var reader=new FileReader();reader.onload=function(){resolve(reader.result);};reader.onerror=reject;reader.readAsDataURL(blob);});}).catch(function(){return src;});
  }
  function preserveLocalActiveProfile(remoteStore) {
    var result=JSON.parse(JSON.stringify(remoteStore || {}));
    var localId='';
    try { localId=String(sessionStorage.getItem(LOGIN_SESSION_KEY)||''); } catch (_) {}
    if(!localId){
      try { var local=JSON.parse(localStorage.getItem(PROFILE_KEY)||'{}'); localId=String(local.activeProfileId||''); } catch (_) {}
    }
    if(localId && Array.isArray(result.profiles) && result.profiles.some(function(profile){return profile.id===localId;})) result.activeProfileId=localId;
    return result;
  }
  function applyRemoteProfileStore(remoteStore) {
    var localStore=preserveLocalActiveProfile(remoteStore);
    loading=true;
    originalSetItem.call(localStorage,PROFILE_KEY,JSON.stringify(localStore));
    loading=false;
    window.dispatchEvent(new CustomEvent('rb-profile-store-updated',{detail:localStore}));
  }
  if (nativeBridge) {
    window.print = async function () {
      var css = '';
      Array.prototype.forEach.call(document.styleSheets || [], function (sheet) {
        try { Array.prototype.forEach.call(sheet.cssRules || [], function (rule) { css += rule.cssText + '\n'; }); } catch (_) {}
      });
      var clone = document.documentElement.cloneNode(true);
      var originals=Array.prototype.slice.call(document.querySelectorAll('img'));
      var copies=Array.prototype.slice.call(clone.querySelectorAll('img'));
      await Promise.all(originals.map(function(img,index){return imageAsDataUrl(img.currentSrc||img.src).then(function(data){if(copies[index])copies[index].setAttribute('src',String(data));});}));
      Array.prototype.forEach.call(clone.querySelectorAll('script,link[rel="stylesheet"]'), function (node) { node.remove(); });
      var style = clone.ownerDocument.createElement('style');
      style.textContent = css;
      clone.querySelector('head').appendChild(style);
      sendNative({ type:'print-pdf', html:'<!doctype html>' + clone.outerHTML });
    };
    window.addEventListener('message', function (event) {
      try {
        var message = JSON.parse(event.data || '{}');
        if (message.type === 'apply-profile-store' && message.profileStore) {
          applyRemoteProfileStore(message.profileStore);
        }
      } catch (_) {}
    });
  }
  try {
    if (!nativeBridge) {
      var request = new XMLHttpRequest();
      request.open('GET', '/v1/sync', false);
      request.send();
      if (request.status >= 200 && request.status < 300) {
        var response = JSON.parse(request.responseText || '{}');
        if (response.snapshot && response.snapshot.profileStore) {
          originalSetItem.call(localStorage, PROFILE_KEY, JSON.stringify(preserveLocalActiveProfile(response.snapshot.profileStore)));
          lastSnapshotExportedAt = String(response.snapshot.exportedAt || response.snapshot.profileStore.updatedAt || '');
        }
      }
    }
  } catch (_) {}
  loading = false;
  Storage.prototype.setItem = function (key, value) {
    originalSetItem.call(this, key, value);
    if (loading || this !== localStorage || key !== PROFILE_KEY) return;
    try {
      var payload=JSON.stringify({ format:'rb-gestao-profiles-v1', profileStore:JSON.parse(value) });
      if (nativeBridge) {
        sendNative({ type:'profile-store-changed', payload:JSON.parse(payload) });
        return;
      }
      syncQueue=syncQueue.catch(function(){}).then(function(){
        return fetch('/v1/profile-store', { method:'POST', headers:{ 'Content-Type':'application/json' }, body:payload }).then(function(response){
          if(!response.ok) throw new Error('Falha ao sincronizar os dados.');
          return response.json();
        }).then(function(result){
          lastSnapshotExportedAt = String(result && result.exportedAt || lastSnapshotExportedAt);
          return result;
        });
      });
    } catch (_) {}
  };
  function pullLatestProfileStore() {
    if (nativeBridge || document.hidden) return Promise.resolve();
    return syncQueue.catch(function(){}).then(function(){
      return fetch('/v1/sync', { cache:'no-store', headers:{ 'Accept':'application/json' } }).then(function(response){
        if (!response.ok) throw new Error('Falha ao consultar os dados compartilhados.');
        return response.json();
      }).then(function(response){
        var snapshot=response && response.snapshot;
        if(!snapshot || !snapshot.profileStore) return;
        var remoteExportedAt=String(snapshot.exportedAt || snapshot.profileStore.updatedAt || '');
        if(remoteExportedAt && remoteExportedAt===lastSnapshotExportedAt) return;
        var remoteValue=JSON.stringify(preserveLocalActiveProfile(snapshot.profileStore));
        var localValue=localStorage.getItem(PROFILE_KEY) || '';
        lastSnapshotExportedAt=remoteExportedAt;
        if(remoteValue===localValue) return;
        applyRemoteProfileStore(snapshot.profileStore);
      });
    }).catch(function(){});
  }
  if(!nativeBridge){
    pollTimer=setInterval(pullLatestProfileStore,3000);
    window.addEventListener('focus',pullLatestProfileStore);
    document.addEventListener('visibilitychange',function(){if(!document.hidden)pullLatestProfileStore();});
    window.addEventListener('beforeunload',function(){if(pollTimer)clearInterval(pollTimer);});
  }
})();
