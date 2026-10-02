const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let serverProcess;

function startBackendServer() {
  const isDev = process.env.NODE_ENV !== 'production';
  console.log('[Electron] Iniciando servidor backend local...');

  // Spawn node process running server
  serverProcess = spawn('npx.cmd', ['tsx', path.join(__dirname, '../server/index.ts')], {
    stdio: 'inherit',
    shell: true,
  });

  serverProcess.on('error', (err) => {
    console.error('[Electron] Error al iniciar backend:', err);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 850,
    minWidth: 1024,
    minHeight: 700,
    title: 'Tienda Creativa - Gestión de Ventas y Emprendimientos',
    backgroundColor: '#f1f5f9',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
    icon: path.join(__dirname, '../public/favicon.ico'),
  });

  const isDev = !app.isPackaged;
  if (isDev) {
    // In dev mode, wait for Vite to be ready and load dev server
    setTimeout(() => {
      mainWindow.loadURL('http://localhost:5173').catch(() => {
        // Retry once if vite is starting up
        setTimeout(() => mainWindow.loadURL('http://localhost:5173'), 2000);
      });
    }, 1500);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  startBackendServer();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (serverProcess) {
    serverProcess.kill();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('quit', () => {
  if (serverProcess) {
    serverProcess.kill();
  }
});
