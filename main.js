const { app, BrowserWindow, globalShortcut } = require('electron');

function createWindow() {
    const win = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: false
        },
        icon: 'assets/favicon.ico'
    });

    win.loadURL('https://www.pedamint.com');

    const webContents = win.webContents;

    // Alt + Left Arrow 키로 뒤로가기
    globalShortcut.register('Alt+Left', () => {
        if (webContents.navigationHistory.canGoBack()) {
            webContents.navigationHistory.goBack();
        }
    });
}

app.on('ready', createWindow);

app.on('will-quit', () => {
    // 모든 단축키 등록 해제
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
