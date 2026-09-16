const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('rbDesktop', {
  backup: {
    snapshot: payload => ipcRenderer.send('backup:snapshot', payload),
    configure: settings => ipcRenderer.invoke('backup:configure', settings),
    status: () => ipcRenderer.invoke('backup:status'),
    chooseFolder: () => ipcRenderer.invoke('backup:choose-folder'),
    runNow: payload => ipcRenderer.invoke('backup:run-now', payload),
    onCompleted: callback => {
      const listener = (_event, result) => callback(result);
      ipcRenderer.on('backup:completed', listener);
      return () => ipcRenderer.removeListener('backup:completed', listener);
    }
  },
  updates: {
    status: () => ipcRenderer.invoke('updates:status'),
    check: () => ipcRenderer.invoke('updates:check'),
    force: () => ipcRenderer.invoke('updates:force'),
    download: version => ipcRenderer.invoke('updates:download', version),
    defer: version => ipcRenderer.invoke('updates:defer', version),
    install: () => ipcRenderer.invoke('updates:install'),
    onState: callback => { const listener=(_event,info)=>callback(info); ipcRenderer.on('updates:state',listener); return ()=>ipcRenderer.removeListener('updates:state',listener); },
    onPrompt: callback => { const listener=(_event,info)=>callback(info); ipcRenderer.on('updates:prompt',listener); return ()=>ipcRenderer.removeListener('updates:prompt',listener); }
  },
  sync: {
    status: () => ipcRenderer.invoke('sync:status'),
    refresh: () => ipcRenderer.invoke('sync:refresh'),
    rotateCode: () => ipcRenderer.invoke('sync:rotate-code'),
    decidePairing: (requestId, approved) => ipcRenderer.invoke('sync:decide-pairing', { requestId, approved }),
    setDeviceStatus: (deviceId, status) => ipcRenderer.invoke('sync:set-device-status', { deviceId, status }),
    onStatus: callback => { const listener=(_event,status)=>callback(status); ipcRenderer.on('sync:status-changed',listener); return ()=>ipcRenderer.removeListener('sync:status-changed',listener); },
    onIncoming: callback => {
      const listener = (_event, payload) => callback(payload);
      ipcRenderer.on('sync:incoming', listener);
      return () => ipcRenderer.removeListener('sync:incoming', listener);
    }
  }
});
