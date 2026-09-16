const { app, BrowserWindow } = require('electron');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const fsSync = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const tempBase = path.join(root, 'tmp');
fsSync.mkdirSync(tempBase, { recursive: true });
const temp = fsSync.mkdtempSync(path.join(tempBase, 'settings-updater-'));
app.setPath('userData', path.join(temp, 'user-data'));
const output = path.join(root, 'output', 'settings-preview');
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
let win;
const errors = [];
const report = { fixture: true, externalServicesUsed: false, screenshots: [], layouts: [], updateCases: [] };
const evaluate = expression => win.webContents.executeJavaScript(expression);

async function until(expression, description, timeout = 5000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await evaluate(expression)) return;
    await wait(30);
  }
  throw new Error(`Tempo esgotado: ${description}`);
}
async function click(selector) {
  await evaluate(`(() => {
    const target = document.querySelector(${JSON.stringify(selector)});
    if (!target) throw new Error('Elemento não encontrado: ' + ${JSON.stringify(selector)});
    if (target.disabled) throw new Error('Elemento desativado: ' + ${JSON.stringify(selector)});
    target.click();
  })()`);
  await wait(40);
}
async function navigate(screen) {
  await click(`#nav [data-screen="${screen}"]`);
  await until(`document.querySelector('#nav [data-screen="${screen}"]').classList.contains('active')`, `abrir ${screen}`);
}
async function selectSetting(id, value) {
  await evaluate(`(() => {
    const input = document.getElementById(${JSON.stringify(id)});
    if (!input) throw new Error('Preferência ausente: ' + ${JSON.stringify(id)});
    input.value = ${JSON.stringify(value)};
    input.dispatchEvent(new Event('change', { bubbles: true }));
  })()`);
  await wait(60);
}
async function screenshot(name) {
  await evaluate(`(() => {
    window.scrollTo(0, 0);
    document.querySelector('.main').scrollTop = 0;
    let label = document.getElementById('preview-fixture-label');
    if (!label) {
      label = document.createElement('div'); label.id = 'preview-fixture-label';
      label.style.cssText = 'position:fixed;bottom:8px;right:12px;z-index:99999;background:#0b0f14e8;border:1px solid #83b233;border-radius:8px;padding:6px 10px;color:#b7ff3c;font:12px Arial;pointer-events:none';
      document.body.appendChild(label);
    }
    label.textContent = 'PRÉVIA LOCAL • Dados e conexão de demonstração';
  })()`);
  await wait(80);
  const file = path.join(output, `${name}.png`);
  await fs.writeFile(file, (await win.webContents.capturePage()).toPNG());
  report.screenshots.push(file);
}

async function checkGlobalUpdates() {
  assert.equal(await evaluate(`Boolean(document.querySelector('#settings-page'))`), false, 'Configurações não pode ser aberta antes dos casos globais.');
  const names = ['dashboard', 'entries', 'accounts'];
  for (const [index, screen] of names.entries()) {
    if (index) await navigate(screen);
    const version = `2.4.${6 + index}`;
    await evaluate(`window.__rbTest.emitPrompt({ phase: 'available', currentVersion: '2.4.5', version: '${version}' })`);
    await until(`Boolean(document.querySelector('#global-update-root [data-update-action="defer"]'))`, `modal global em ${screen}`);
    assert.equal(await evaluate(`document.querySelector('#nav .nav-btn.active').dataset.screen`), screen, 'O aviso não pode mudar de página.');
    assert.equal(await evaluate(`Boolean(document.querySelector('#settings-page'))`), false, 'O updater não pode abrir Configurações.');
    assert.ok(await evaluate(`document.querySelector('#global-update-root').textContent.includes('${version}')`), 'O aviso deve informar a nova versão.');
    await evaluate(`window.__rbTest.emitPrompt({ phase: 'available', version: '${version}' })`);
    assert.equal(await evaluate(`document.querySelectorAll('#global-update-root [data-update-action="defer"]').length`), 1, 'Eventos repetidos não podem duplicar o modal.');
    if (screen === 'entries') await screenshot('05-atualizacao-global-transacoes');
    await click('#global-update-root [data-update-action="defer"]');
    await until(`!document.querySelector('#global-update-root [data-update-action="defer"]')`, 'fechar ao adiar');
    assert.equal(await evaluate(`document.querySelector('#nav .nav-btn.active').dataset.screen`), screen, 'Mais tarde deve manter a tela atual.');
    report.updateCases.push(`Aviso e adiamento em ${screen}, sem abrir Configurações`);
  }
  await navigate('entries');
  await evaluate(`window.__rbTest.emitPrompt({ phase: 'available', version: '2.4.9' })`);
  await click('#global-update-root [data-update-action="download"]');
  await until(`window.__rbTest.actions().filter(item => item.name === 'download').length === 1`, 'um único download após aceite');
  assert.equal(await evaluate(`document.querySelector('#nav .nav-btn.active').dataset.screen`), 'entries', 'Download deve manter Transações.');
  await evaluate(`window.__rbTest.emitState({ phase: 'downloading', version: '2.4.9', progress: { percent: 78, transferred: 78, total: 100, bytesPerSecond: 20 } })`);
  await until(`document.querySelector('#global-update-root').textContent.includes('78')`, 'progresso global de 78%');
  await evaluate(`window.__rbTest.emitState({ phase: 'downloaded', version: '2.4.9', progress: { percent: 100 } })`);
  await until(`Boolean(document.querySelector('#global-update-root [data-update-action="later"]'))`, 'opções de reinício');
  assert.ok(await evaluate(`Boolean(document.querySelector('#global-update-root [data-update-action="restart"]'))`), 'A conclusão precisa oferecer reinício.');
  await click('#global-update-root [data-update-action="later"]');
  assert.equal(await evaluate(`document.querySelector('#nav .nav-btn.active').dataset.screen`), 'entries', 'Reiniciar depois deve manter a tela atual.');
  assert.equal(await evaluate(`window.__rbTest.actions().filter(item => item.name === 'install').length`), 0, 'Reiniciar depois não pode instalar automaticamente.');
  assert.equal(await evaluate(`window.__rbTest.actions().filter(item => item.name === 'download').length`), 1, 'Eventos de progresso não devem reiniciar o download.');
  report.updateCases.push('Aceite, download único, progresso e reinício adiado em Transações');
  await evaluate(`window.__rbTest.emitState({ phase: 'idle', version: '', progress: null })`);
}

async function inspectLayout(tab, viewport) {
  const metrics = await evaluate(`(() => {
    const page = document.querySelector('#settings-page');
    const tabs = page && page.querySelector('.settings-tabs');
    const content = page && page.querySelector('.settings-content');
    const panelSelectors = ['.update-settings-card', '.remote-access-card', '.appearance-settings-card', '.backup-settings-card', '.permissions-settings-card'];
    const bounds = el => { const r = el.getBoundingClientRect(); return { left:r.left, right:r.right, top:r.top, bottom:r.bottom, width:r.width }; };
    return {
      page: page && bounds(page), tabs: tabs && bounds(tabs), content: content && bounds(content),
      tabIds: tabs ? Array.from(tabs.querySelectorAll('[data-action="settings-tab"]')).map(el => el.dataset.tab) : [],
      selected: tabs && tabs.querySelector('.active') && tabs.querySelector('.active').dataset.tab,
      panels: panelSelectors.flatMap(selector => Array.from(document.querySelectorAll(selector)).map(el => ({ selector, ...bounds(el), visible:getComputedStyle(el).display !== 'none', inside: Boolean(el.closest('.settings-content')) }))),
      innerWidth:window.innerWidth, media:matchMedia('(max-width: 760px)').matches, classes:document.getElementById('app-shell').className, grid:getComputedStyle(document.getElementById('app-shell')).gridTemplateColumns,
      horizontalOverflow: document.documentElement.scrollWidth - window.innerWidth,
      contentOverflow: content ? content.scrollWidth - content.clientWidth : -1,
      controlOverflow: content ? Array.from(content.querySelectorAll('input, select, button')).filter(el => { const r=el.getBoundingClientRect(), p=content.getBoundingClientRect(); return r.width > 0 && (r.left < p.left-1 || r.right > p.right+1); }).map(el => el.id || el.dataset.action || el.tagName) : [],
      floatingUpdates: Boolean(document.querySelector('.update-settings-card:not(#settings-page .update-settings-card)'))
    };
  })()`);
  const suffix = `${tab} ${viewport.join('x')}`;
  assert.ok(metrics.page && metrics.tabs && metrics.content, `Estrutura nomeada de configurações ausente: ${suffix}`);
  assert.deepEqual(metrics.tabIds, ['system', 'appearance', 'backup', 'registrations'], `Abas inválidas: ${suffix}`);
  assert.equal(metrics.selected, tab, `Aba ativa incorreta: ${suffix}`);
  const expected = { system: ['.update-settings-card', '.remote-access-card'], appearance: ['.appearance-settings-card'], backup: ['.backup-settings-card'], registrations: ['.permissions-settings-card'] }[tab];
  assert.deepEqual(metrics.panels.map(panel => panel.selector), expected, `Outros painéis existem no DOM (não basta escondê-los): ${suffix}`);
  assert.ok(metrics.tabs.bottom <= metrics.content.top + 1, `Existe conteúdo acima/sobre as abas: ${suffix}`);
  assert.ok(Math.abs(metrics.tabs.left - metrics.content.left) <= 2, `Abas e conteúdo desalinhados: ${suffix}`);
  for (const panel of metrics.panels) {
    assert.ok(panel.inside && panel.visible, `Painel fora do conteúdo ou invisível: ${suffix}`);
    assert.ok(panel.width >= metrics.content.width - 4, `Painel comprimido (${panel.width}/${metrics.content.width}): ${suffix}`);
  }
  assert.ok(metrics.horizontalOverflow <= 1, `Overflow horizontal da página (${metrics.horizontalOverflow}px): ${suffix}`);
  assert.ok(metrics.contentOverflow <= 1, `Overflow no painel (${metrics.contentOverflow}px): ${suffix} ${JSON.stringify(metrics)}`);
  assert.deepEqual(metrics.controlOverflow, [], `Controles fora do painel: ${suffix}`);
  assert.equal(metrics.floatingUpdates, false, `Atualizações soltas fora das Configurações: ${suffix}`);
  report.layouts.push({ viewport, tab, width: metrics.content.width, panels: expected });
}

async function checkSettings() {
  await navigate('settings');
  const tabs = ['system', 'appearance', 'backup', 'registrations'];
  for (const viewport of [[1920,1080],[1366,768],[900,720],[768,1024]]) {
    win.setContentSize(...viewport);
    await wait(100);
    await evaluate('window.dispatchEvent(new Event("resize"))');
    for (const tab of tabs) {
      await click(`[data-action="settings-tab"][data-tab="${tab}"]`);
      await inspectLayout(tab, viewport);
    }
  }
  win.setContentSize(1366, 1000);
  await click('[data-tab="appearance"][data-action="settings-tab"]');
  await selectSetting('settings-theme', 'light');
  await selectSetting('settings-start-month', 'current');
  await click('[data-tab="backup"][data-action="settings-tab"]');
  await click('[data-tab="appearance"][data-action="settings-tab"]');
  assert.equal(await evaluate(`document.querySelector('#settings-theme').value`), 'light', 'Trocar a aba perdeu o tema.');
  assert.equal(await evaluate(`document.querySelector('#settings-start-month').value`), 'current', 'Trocar a aba perdeu a competência.');
  await win.reload();
  await until(`Boolean(document.querySelector('#settings-page'))`, 'restaurar tela após reload');
  await click('[data-tab="appearance"][data-action="settings-tab"]');
  assert.equal(await evaluate(`document.querySelector('#settings-theme').value`), 'light', 'Reabrir perdeu o tema.');
  assert.equal(await evaluate(`document.body.dataset.theme`), 'light', 'Tema selecionado não foi aplicado.');
  assert.equal(await evaluate(`document.querySelector('#settings-start-month').value`), 'current', 'Reabrir perdeu a competência.');
  await selectSetting('settings-theme', 'dark');
  await selectSetting('settings-start-month', 'next');
  await click('[data-tab="backup"][data-action="settings-tab"]');
  await selectSetting('settings-backup-mode', 'daily-and-close');
  await selectSetting('settings-backup-time', '20:00');
  for (const action of ['choose-backup-folder','run-auto-backup','export-backup','import-backup','reset-data']) {
    assert.ok(await evaluate(`Boolean(document.querySelector('[data-action="${action}"]'))`), `Função de backup removida: ${action}`);
  }
  for (const [index, tab] of tabs.entries()) {
    await click(`[data-action="settings-tab"][data-tab="${tab}"]`);
    if (tab === 'system') {
      await until(`document.querySelector('.remote-access-card').textContent.includes('483921')`, 'status do pareamento local');
      assert.ok(await evaluate(`document.querySelector('.remote-access-card').textContent.includes('483921')`), 'Código curto não aparece.');
      assert.ok(await evaluate(`Array.from(document.querySelectorAll('.remote-access-card input')).some(input => input.value.includes('preview.rb-gestao.invalid'))`), 'Link automático não aparece.');
      assert.equal(await evaluate(`Boolean(document.querySelector('#sync-public-url'))`), false, 'Configuração principal ainda exige URL manual.');
      assert.equal(await evaluate(`document.querySelector('.update-settings-card').compareDocumentPosition(document.querySelector('.remote-access-card')) & Node.DOCUMENT_POSITION_FOLLOWING`), 4, 'Atualizações deve vir antes de Acesso remoto.');
    }
    if (tab === 'registrations') {
      assert.ok(await evaluate(`Boolean(document.querySelector('#permissions-profile-select'))`), 'Seletor de perfis removido.');
      assert.ok(await evaluate(`document.querySelectorAll('.permission-module-card').length >= 10`), 'Módulos de permissão removidos.');
    }
    await screenshot(`${String(index+1).padStart(2,'0')}-${tab}`);
  }
  assert.deepEqual(await evaluate(`window.__rbTest.listeners()`), { state: 1, prompt: 1 }, 'Listeners do updater foram duplicados ou ausentes.');
}

app.whenReady().then(async () => {
  await fs.mkdir(output, { recursive: true });
  win = new BrowserWindow({ width:1366, height:1000, show:false, webPreferences:{ contextIsolation:true, preload:path.join(__dirname,'fixtures','settings-updater-preload.cjs') } });
  await win.webContents.session.clearCache();
  win.webContents.on('console-message', (_event, level, message) => { if (level >= 3) errors.push(message); });
  await win.loadFile(path.join(root, 'app', 'index.html'));
  await until(`Boolean(document.querySelector('#profile-login-form'))`, 'login isolado');
  await evaluate(`document.querySelector('#profile-login-form').requestSubmit()`);
  await until(`!document.querySelector('#profile-login-form')`, 'concluir login');
  await evaluate(`(() => {
    const key='rb_gestao_financeira_profiles_v1'; const store=JSON.parse(localStorage.getItem(key));
    store.profiles[0].name='Administrador — Prévia';
    store.profiles.push({ ...store.profiles[0], id:'preview-user', name:'Usuário de demonstração', role:'user' });
    localStorage.setItem(key, JSON.stringify(store));
    window.dispatchEvent(new CustomEvent('rb-profile-store-updated', { detail:store }));
  })()`);
  await checkGlobalUpdates();
  await checkSettings();
  assert.deepEqual(errors, [], `Erros no renderer: ${errors.join('\n')}`);
  await fs.writeFile(path.join(output,'validation.json'), JSON.stringify(report,null,2));
  win.destroy();
  if (!temp.startsWith(tempBase + path.sep)) throw new Error('Diretório temporário inválido.');
  await fs.rm(temp, { recursive:true, force:true });
  console.log('Configurações: quatro abas exclusivas, 20 layouts, preferências persistentes e updater global em três módulos validados. Prévias em output/settings-preview.');
  app.quit();
}).catch(async error => {
  console.error(error);
  if (win && !win.isDestroyed()) {
    try { await fs.writeFile(path.join(output,'failure.png'), (await win.webContents.capturePage()).toPNG()); } catch (_) {}
    win.destroy();
  }
  app.exit(1);
});
