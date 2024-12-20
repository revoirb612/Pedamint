const { app, BrowserWindow, globalShortcut } = require('electron');

function createWindow() {
    const win = new BrowserWindow({
        width: 1200,
        height: 1200/1.5,
        webPreferences: {
            nodeIntegration: false
        },
        icon: 'assets/favicon.ico',
        frame: false
    });

    win.loadURL('https://www.pedamint.com');

    const webContents = win.webContents;

    // Alt + Left Arrow 키로 뒤로가기
    globalShortcut.register('Alt+Left', () => {
        if (webContents.navigationHistory.canGoBack()) {
            webContents.navigationHistory.goBack();
        }
    });

    let escPressCount = 0; // esc 키 눌림 횟수 추적

    // esc 키로 창 최소화 (두 번 눌러야 최소화)
    globalShortcut.register('Esc', () => {
        escPressCount++;
        if (escPressCount === 2) {
            win.minimize();
            escPressCount = 0; // 카운트 초기화
        }
        setTimeout(() => {
            escPressCount = 0; // 일정 시간 후 카운트 초기화
        }, 500); // 500ms 이내에 두 번 눌러야 함
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
