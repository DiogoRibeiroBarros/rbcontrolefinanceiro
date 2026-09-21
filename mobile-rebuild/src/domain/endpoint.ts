export function normalizeDesktopAddress(value: string): string {
  const candidate = value.trim();
  let url: URL;
  try { url = new URL(candidate); }
  catch { throw new Error('Informe um link HTTPS válido do RB Gestão.'); }
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost','127.0.0.1'].includes(url.hostname))) {
    throw new Error('A conexão precisa usar HTTPS.');
  }
  if (url.username || url.password || url.search || url.hash) throw new Error('O link não pode conter usuário, senha ou parâmetros.');
  if (!['/', '/mobile', '/pair'].includes(url.pathname.replace(/\/$/, '') || '/')) throw new Error('Use o link principal, /mobile ou /pair.');
  return url.origin;
}
