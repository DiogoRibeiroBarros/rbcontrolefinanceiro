import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {KEYBOARD_BRIDGE} from '../src/platform/keyboardBridge';

test('teclado revela campo encoberto, preserva foco e restaura altura ao fechar',()=>{
  const events:Record<string,()=>void>={},variables:Record<string,string>={},styles:any[]=[];let scrolls=0,bottom=700;
  const field={matches:()=>true,getBoundingClientRect:()=>({top:bottom-50,bottom}),scrollIntoView:()=>{scrolls++;}};
  const viewport={height:800,offsetTop:0,addEventListener:(name:string,fn:()=>void)=>{events['viewport-'+name]=fn;}};
  const window:any={innerHeight:800,visualViewport:viewport,addEventListener:(name:string,fn:()=>void)=>{events[name]=fn;}};
  const document={readyState:'complete',head:{appendChild:(style:any)=>styles.push(style)},createElement:()=>({textContent:''}),documentElement:{style:{setProperty:(key:string,value:string)=>{variables[key]=value;}}},activeElement:field,addEventListener:(name:string,fn:()=>void)=>{events[name]=fn;}};
  const context=vm.createContext({window,document,setTimeout:(fn:()=>void)=>{fn();return 1;},clearTimeout(){}});
  vm.runInContext(KEYBOARD_BRIDGE,context);assert.equal(scrolls,0);
  viewport.height=320;events['viewport-resize']();assert.equal(scrolls,1);assert.equal(variables['--rb-keyboard-viewport'],'320px');
  bottom=180;events.focusin();assert.equal(scrolls,1,'Campo visível não deve pular.');
  viewport.height=800;events['viewport-resize']();assert.equal(variables['--rb-keyboard-viewport'],'800px');
  assert.equal(document.activeElement,field);vm.runInContext(KEYBOARD_BRIDGE,context);assert.equal(styles.length,1);
  assert.match(styles[0].textContent,/overflow-y:auto/);
});

test('formulários nativos têm rolagem, área segura e redimensionamento Android',()=>{
  const app=readFileSync(new URL('../App.tsx',import.meta.url),'utf8'),panel=readFileSync(new URL('../src/CommercialPanel.tsx',import.meta.url),'utf8');
  const config=JSON.parse(readFileSync(new URL('../app.json',import.meta.url),'utf8'));
  assert.equal(config.expo.android.softwareKeyboardLayoutMode,'resize');
  assert.match(app,/KeyboardAvoidingView/);assert.match(app,/keyboardVerticalOffset=\{insets.top\}/);
  assert.match(app,/keyboardShouldPersistTaps="handled"/);assert.match(panel,/<ScrollView keyboardShouldPersistTaps="handled"/);
});
