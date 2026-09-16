'use strict';

const { execFile } = require('node:child_process');

function findExecutable() {
  return process.platform === 'win32' ? 'tailscale.exe' : 'tailscale';
}

function createRemoteAccessService({ port, onState, exec = execFile, timeoutMs = 5000 } = {}) {
  let stopped = false;
  function publish(value) { if (!stopped && onState) onState(value); return value; }
  function run(args) {
    return new Promise((resolve, reject) => {
      exec(findExecutable(), args, { windowsHide:true, timeout:timeoutMs, maxBuffer:1024 * 1024 }, (error, stdout) => {
        if (error) return reject(error);
        try { resolve(JSON.parse(String(stdout || '{}'))); } catch (_) { reject(new Error('Resposta inválida do Tailscale.')); }
      });
    });
  }
  async function refresh() {
    if (stopped) return { status:'offline', message:'Serviço encerrado.' };
    publish({ status:'checking', message:'Verificando a conexão segura…' });
    try {
      const status = await run(['status','--json']);
      const dnsName = String(status && status.Self && (status.Self.DNSName || status.Self.DNSNameFQDN) || '').replace(/\.$/,'');
      if (!dnsName) return publish({ status:'needs_login', message:'Autorize o Tailscale para disponibilizar o acesso remoto.' });
      const publicUrl = 'https://' + dnsName;
      return publish({ status:'online', publicUrl, port, message:'Conexão segura detectada automaticamente.' });
    } catch (error) {
      const text=String(error && error.message || '').toLowerCase();
      return publish({ status:text.includes('not found')||text.includes('não foi possível localizar')?'not_installed':'offline', message:'O Tailscale não está disponível ou ainda não foi autorizado.' });
    }
  }
  return { refresh, stop:() => { stopped=true; } };
}

module.exports = { createRemoteAccessService };
