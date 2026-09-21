(function () {
  'use strict';
  window.rbStartMobileSession = async function (token) {
    try {
      var result = await fetch('/v2/mobile/session', {
        method:'POST', credentials:'same-origin', headers:{ 'Content-Type':'application/json', Authorization:'Bearer ' + token }, body:'{}'
      });
      if (!result.ok) throw new Error('session_' + result.status);
      window.location.replace('/mobile');
    } catch (error) {
      if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify({type:'session-error', reason:String(error.message || 'unknown')}));
    }
  };
})();
