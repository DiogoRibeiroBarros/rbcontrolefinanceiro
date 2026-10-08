// Resize scroll containers and reveal only obscured inputs, without changing focus.
export const KEYBOARD_BRIDGE = String.raw`
(function () {
  if (window.rbKeyboardBridge) return;
  window.rbKeyboardBridge = true;
  function install() {
    var style = document.createElement('style');
    style.textContent = '.modal-backdrop{max-height:var(--rb-keyboard-viewport,100dvh);box-sizing:border-box}.modal{max-height:calc(var(--rb-keyboard-viewport,100dvh) - 32px)!important;overflow-y:auto!important;overscroll-behavior:contain}.main{height:var(--rb-keyboard-viewport,100dvh)!important}#content{height:calc(var(--rb-keyboard-viewport,100dvh) - 96px)!important}.profile-login-screen{min-height:0!important}input,textarea,[contenteditable=true]{scroll-margin-block:24px}';
    document.head.appendChild(style);
    function reveal() {
      var viewport = window.visualViewport;
      var height = viewport ? viewport.height : window.innerHeight;
      var top = viewport ? viewport.offsetTop : 0;
      document.documentElement.style.setProperty('--rb-keyboard-viewport', height + 'px');
      var field = document.activeElement;
      if (!field || !field.matches('input,textarea,[contenteditable="true"]')) return;
      var bounds = field.getBoundingClientRect();
      if (bounds.bottom > top + height - 20 || bounds.top < top + 12) field.scrollIntoView({block:'center',inline:'nearest',behavior:'auto'});
    }
    var timer;
    function update() {clearTimeout(timer);timer=setTimeout(reveal,80);}
    document.addEventListener('focusin',update);
    window.addEventListener('resize',update);
    window.visualViewport?.addEventListener('resize',update);
    window.visualViewport?.addEventListener('scroll',update);
    reveal();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();true;`;
