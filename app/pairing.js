(function () {
  'use strict';
  var form = document.getElementById('pair-form');
  var status = document.getElementById('pair-status');
  var connect = document.getElementById('connect');
  var retry = document.getElementById('retry');
  var timer = null;
  var pending = null;
  var deadline = 0;
  function stop(message) {
    if (timer) clearTimeout(timer);
    timer = null;
    pending = null;
    status.textContent = message;
    retry.hidden = false;
    connect.disabled = false;
  }
  async function send(endpoint, payload) {
    var controller = new AbortController();
    var timeout = setTimeout(function () { controller.abort(); }, 12000);
    try {
      var response = await fetch(endpoint, { method: 'POST', credentials: 'same-origin', signal: controller.signal, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      var body = await response.json();
      if (!response.ok) throw new Error(body.message || 'Falha na conexão.');
      return body;
    } finally { clearTimeout(timeout); }
  }
  async function poll() {
    if (!pending) return;
    if (Date.now() > deadline) return stop('A aprovação expirou. Confira se o RB Gestão está aberto no computador e tente novamente.');
    try {
      var result = await send('/v1/pairing/complete', pending);
      if (result.status === 'paired') {
        status.textContent = 'Dispositivo vinculado. Abrindo o RB Gestão…';
        window.location.replace('/mobile');
        return;
      }
      timer = setTimeout(poll, 2000);
    } catch (error) {
      stop(error.name === 'AbortError' ? 'O computador não respondeu. Verifique a conexão e tente novamente.' : error.message);
    }
  }
  // The form has an inline fallback (onsubmit=false) so an Android WebView
  // can never navigate to the JSON response when this script is still loading.
  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    if (connect.disabled) return;
    connect.disabled = true;
    retry.hidden = true;
    status.textContent = 'Solicitando vínculo…';
    try {
      var result = await send('/v1/pairing/request', { code: document.getElementById('pair-code').value, name: document.getElementById('device-name').value });
      pending = { requestId: result.requestId, requestSecret: result.requestSecret };
      deadline = Date.now() + result.expiresIn * 1000;
      status.textContent = 'Confirme este dispositivo na janela do RB Gestão no computador. Esta solicitação expira em 5 minutos.';
      timer = setTimeout(poll, 1500);
    } catch (error) {
      stop(error.name === 'AbortError' ? 'Sem resposta do computador. Verifique a conexão.' : error.message);
    }
  });
  retry.addEventListener('click', function () { retry.hidden = true; document.getElementById('pair-code').focus(); });
  window.addEventListener('pagehide', function () { if (timer) clearTimeout(timer); pending = null; });
})();
