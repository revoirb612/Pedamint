const { app, BrowserWindow, globalShortcut, ipcMain } = require('electron');
const path = require('path');

function createWindow() {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        frame: false,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            enableRemoteModule: false
        },
        icon: 'assets/favicon.ico'
    });

    win.loadURL('https://www.pedamint.com');

    // IPC 이벤트 핸들러
    ipcMain.handle('reload', () => {
        win.reload();
    });

    ipcMain.handle('toggleDevTools', () => {
        win.webContents.toggleDevTools();
    });

    ipcMain.handle('closeWindow', () => {
        win.close();
    });
}

app.on('ready', createWindow);

app.on('will-quit', () => {
    globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});
