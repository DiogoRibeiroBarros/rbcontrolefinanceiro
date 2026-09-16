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
    check: () => ipcRenderer.invoke('updates:check'),
    force: () => ipcRenderer.invoke('updates:force'),
    onAvailable: callback => { const listener=(_event,info)=>callback(info); ipcRenderer.on('updates:available',listener); return ()=>ipcRenderer.removeListener('updates:available',listener); },
    onDownloaded: callback => { const listener=(_event,info)=>callback(info); ipcRenderer.on('updates:downloaded',listener); return ()=>ipcRenderer.removeListener('updates:downloaded',listener); }
  },
  sync: {
    status: () => ipcRenderer.invoke('sync:status'),
    configure: value => ipcRenderer.invoke('sync:configure', value),
    onIncoming: callback => {
      const listener = (_event, payload) => callback(payload);
      ipcRenderer.on('sync:incoming', listener);
      return () => ipcRenderer.removeListener('sync:incoming', listener);
    }
  }
});
