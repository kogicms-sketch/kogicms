import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'path'

// The built directory structure
//
// ├─┬ dist
// │ └── index.html
// ├── dist-electron
// │ ├── main.js
// │ └── preload.js
//
process.env.DIST = path.join(__dirname, '../dist')
process.env.VITE_PUBLIC = app.isPackaged ? process.env.DIST : path.join(__dirname, '../public')

let win: any | null

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']

function createWindow() {
    win = new BrowserWindow({
        icon: path.join(process.env.VITE_PUBLIC as string, 'favicon.ico'),
        width: 1280,
        height: 800,
        title: 'Campaign Command Center',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            // WARNING: webSecurity disabled for external API access (CORS). 
            // Only do this if you trust the content you are loading.
            webSecurity: false,
        },
    })

    // Security: Content Protection (Anti-Screenshot)
    // "dont allow to take the screen short"
    win.setContentProtection(true);

    // Security: Block Downloads by default
    const ses = win.webContents.session;
    let allowDownloads = false;

    ses.on('will-download', (event: any, item: any, webContents: any) => {
        if (!allowDownloads) {
            event.preventDefault();
            console.log('Download blocked by security policy');
            // Optional: Notify renderer
            win?.webContents.send('download-blocked');
        } else {
            // Reset after one download? Or keep it enabled? 
            // Ideally we enable it only for the duration of the user action.
            // For now, let's keep it enabled if Super Admin is logged in? 
            // Better: Reset it to false after the download item is created? 
            // Note: 'will-download' is emitted when download is about to start.
            console.log('Download allowed');
            // Auto-reset for safety
            // allowDownloads = false; // logic depends on UX.
        }
    });

    // IPC to toggle download permission (e.g. for Super Admin)
    ipcMain.handle('set-allow-downloads', (event: any, allowed: boolean) => {
        allowDownloads = allowed;
        console.log(`Downloads ${allowed ? 'enabled' : 'disabled'}`);
        return true;
    });

    // IPC to toggle content protection (if needed, e.g. for debugging or Super Admin)
    ipcMain.handle('set-content-protection', (event: any, enabled: boolean) => {
        win?.setContentProtection(enabled);
        return true;
    });

    // Test active push message to Renderer-process.
    win.webContents.on('did-finish-load', () => {
        win?.webContents.send('main-process-message', (new Date).toLocaleString())
    })

    if (VITE_DEV_SERVER_URL) {
        win.loadURL(VITE_DEV_SERVER_URL)
    } else {
        // win.loadFile('dist/index.html')
        win.loadFile(path.join(process.env.DIST as string, 'index.html'))
    }
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
        win = null
    }
})

app.on('activate', () => {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow()
    }
})

app.whenReady().then(createWindow)
