const { contextBridge, ipcRenderer } = require('electron');

// Expose IPC channels to renderer
contextBridge.exposeInMainWorld('api', {
  // Tasks
  getTasks: () => ipcRenderer.invoke('get-tasks'),
  createTask: (task) => ipcRenderer.invoke('create-task', task),
  updateTask: (id, task) => ipcRenderer.invoke('update-task', { id, task }),
  deleteTask: (id) => ipcRenderer.invoke('delete-task', id),
  
  // Sessions
  getSessions: () => ipcRenderer.invoke('get-sessions'),
  createSession: (session) => ipcRenderer.invoke('create-session', session),
  updateSession: (id, session) => ipcRenderer.invoke('update-session', { id, session }),
  
  // Statistics
  getStatistics: () => ipcRenderer.invoke('get-statistics'),
  
  // Settings
  getSettings: () => ipcRenderer.invoke('get-settings'),
  updateSettings: (settings) => ipcRenderer.invoke('update-settings', settings)
}); 