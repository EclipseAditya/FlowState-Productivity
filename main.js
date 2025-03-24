const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const axios = require('axios');

// Disable GPU acceleration to avoid issues in VM environments
app.disableHardwareAcceleration();

// Base URL for API
const BASE_URL = 'http://localhost:8000';

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'frontend', 'index.html'));
  
  // Open DevTools in development mode
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }
}

app.whenReady().then(() => {
  createWindow();
  
  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});

// API Handlers
// Tasks
ipcMain.handle('get-tasks', async () => {
  try {
    const response = await axios.get(`${BASE_URL}/tasks/`);
    return response.data;
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return [];
  }
});

ipcMain.handle('create-task', async (event, task) => {
  try {
    const response = await axios.post(`${BASE_URL}/tasks/`, task);
    return response.data;
  } catch (error) {
    console.error('Error creating task:', error);
    throw new Error(error.response?.data?.detail || 'Failed to create task');
  }
});

ipcMain.handle('update-task', async (event, { id, task }) => {
  try {
    const response = await axios.put(`${BASE_URL}/tasks/${id}`, task);
    return response.data;
  } catch (error) {
    console.error('Error updating task:', error);
    throw new Error(error.response?.data?.detail || 'Failed to update task');
  }
});

ipcMain.handle('delete-task', async (event, id) => {
  try {
    await axios.delete(`${BASE_URL}/tasks/${id}`);
    return true;
  } catch (error) {
    console.error('Error deleting task:', error);
    throw new Error(error.response?.data?.detail || 'Failed to delete task');
  }
});

// Sessions
ipcMain.handle('get-sessions', async () => {
  try {
    const response = await axios.get(`${BASE_URL}/sessions/`);
    return response.data;
  } catch (error) {
    console.error('Error fetching sessions:', error);
    return [];
  }
});

ipcMain.handle('create-session', async (event, session) => {
  try {
    const response = await axios.post(`${BASE_URL}/sessions/`, session);
    return response.data;
  } catch (error) {
    console.error('Error creating session:', error);
    throw new Error(error.response?.data?.detail || 'Failed to create session');
  }
});

ipcMain.handle('update-session', async (event, { id, session }) => {
  try {
    const response = await axios.put(`${BASE_URL}/sessions/${id}`, session);
    return response.data;
  } catch (error) {
    console.error('Error updating session:', error);
    throw new Error(error.response?.data?.detail || 'Failed to update session');
  }
});

// Statistics
ipcMain.handle('get-statistics', async () => {
  try {
    const response = await axios.get(`${BASE_URL}/statistics/`);
    return response.data;
  } catch (error) {
    console.error('Error fetching statistics:', error);
    return {};
  }
});

// Settings
ipcMain.handle('get-settings', async () => {
  try {
    const response = await axios.get(`${BASE_URL}/settings/`);
    return response.data;
  } catch (error) {
    console.error('Error fetching settings:', error);
    return {};
  }
});

ipcMain.handle('update-settings', async (event, settings) => {
  try {
    const response = await axios.post(`${BASE_URL}/settings/`, settings);
    return response.data;
  } catch (error) {
    console.error('Error updating settings:', error);
    throw new Error(error.response?.data?.detail || 'Failed to update settings');
  }
}); 