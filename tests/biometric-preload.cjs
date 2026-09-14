const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('ReactNativeWebView', {
  postMessage(message) {
    ipcRenderer.send('rb-biometric-test-message', String(message || ''));
  }
});
