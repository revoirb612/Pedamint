const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    reload: () => ipcRenderer.invoke('reload'),
    toggleDevTools: () => ipcRenderer.invoke('toggleDevTools'),
    closeWindow: () => ipcRenderer.invoke('closeWindow')
});

window.addEventListener('DOMContentLoaded', () => {
    const titlebar = document.createElement('div');
    titlebar.id = 'titlebar';
    titlebar.innerHTML = `
        <style>
            html, body {
                margin: 0;
                padding: 0;
            }
            #titlebar {
                display: flex;
                align-items: center;
                justify-content: space-between;
                background-color: #1e1e1e;
                color: #ffffff;
                height: 30px;
                padding: 0 10px;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                font-size: 12px;
                -webkit-app-region: drag;
            }
            #titlebar button {
                background: none;
                border: none;
                color: #ffffff;
                cursor: pointer;
                -webkit-app-region: no-drag;
            }
            #titlebar button:hover {
                background-color: #3c3c3c;
            }
        </style>
        <div>My App</div>
        <div id="menu">
            <button onclick="window.electronAPI.reload()">↻</button>
            <button onclick="window.electronAPI.toggleDevTools()">⚙️</button>
            <button onclick="window.electronAPI.closeWindow()">✖️</button>
        </div>
    `;
    document.body.prepend(titlebar);
}); 