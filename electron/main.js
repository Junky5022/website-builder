import { app, BrowserWindow, ipcMain, shell } from 'electron';
import path from 'path';
import http from 'http';
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import pkg from 'electron-updater';
const { autoUpdater } = pkg;
const execAsync = promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
let mainWindow = null;

// Configure auto-updater
autoUpdater.autoDownload = false; // Let user choose when to download/update
autoUpdater.autoInstallOnAppQuit = true;

function setupAutoUpdater() {
  if (isDev) return;

  autoUpdater.on('update-available', (info) => {
    mainWindow?.webContents.send('update-available', {
      version: info.version,
      releaseDate: info.releaseDate,
    });
  });

  autoUpdater.on('update-not-available', (info) => {
    mainWindow?.webContents.send('update-not-available', info);
  });

  autoUpdater.on('download-progress', (progressObj) => {
    mainWindow?.webContents.send('download-progress', {
      percent: Math.round(progressObj.percent),
      transferred: progressObj.transferred,
      total: progressObj.total,
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    mainWindow?.webContents.send('update-downloaded', {
      version: info.version,
    });
  });

  autoUpdater.on('error', (err) => {
    console.error('AutoUpdater error:', err);
  });

  // Check for updates on startup
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch((err) => console.error('Check updates failed:', err));
  }, 3000);
}

// IPC Handlers
ipcMain.on('check-for-updates', () => {
  if (!isDev) {
    autoUpdater.checkForUpdates().catch((err) => console.error('Manual check failed:', err));
  }
});

ipcMain.on('download-update', () => {
  if (!isDev) {
    autoUpdater.downloadUpdate().catch((err) => console.error('Download update failed:', err));
  }
});

ipcMain.on('restart-and-install', () => {
  if (!isDev) {
    autoUpdater.quitAndInstall(false, true);
  }
});

// ─── Google OAuth & gcloud ADC Handlers ──────────────────────────────────────

// 1. Check / fetch token from local Google Cloud ADC or gcloud CLI
ipcMain.handle('get-gcloud-token', async () => {
  // First check application_default_credentials.json file
  const adcPath =
    process.platform === 'win32'
      ? path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), 'gcloud', 'application_default_credentials.json')
      : path.join(os.homedir(), '.config', 'gcloud', 'application_default_credentials.json');

  if (fs.existsSync(adcPath)) {
    try {
      const raw = JSON.parse(fs.readFileSync(adcPath, 'utf8'));
      if (raw.client_id && raw.client_secret && raw.refresh_token) {
        const body = new URLSearchParams({
          client_id: raw.client_id,
          client_secret: raw.client_secret,
          refresh_token: raw.refresh_token,
          grant_type: 'refresh_token',
        });
        const res = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: body.toString(),
        });
        if (res.ok) {
          const data = await res.json();
          let email = '';
          let name = '';
          let picture = '';
          try {
            const uRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${data.access_token}` },
            });
            if (uRes.ok) {
              const uData = await uRes.json();
              email = uData.email || '';
              name = uData.name || '';
              picture = uData.picture || '';
            }
          } catch {}

          return {
            accessToken: data.access_token,
            refreshToken: raw.refresh_token,
            clientId: raw.client_id,
            clientSecret: raw.client_secret,
            projectId: raw.quota_project_id || '',
            expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
            email,
            name,
            picture,
            source: 'adc',
          };
        }
      }
    } catch (err) {
      console.warn('Failed reading ADC file:', err);
    }
  }

  // Fallback: try running `gcloud auth application-default print-access-token` or `gcloud auth print-access-token`
  for (const cmd of [
    'gcloud auth application-default print-access-token',
    'gcloud auth print-access-token',
  ]) {
    try {
      const { stdout } = await execAsync(cmd, { timeout: 8000 });
      const token = stdout.trim();
      if (token && token.length > 20) {
        let projectId = '';
        try {
          const { stdout: projOut } = await execAsync('gcloud config get-value project', { timeout: 5000 });
          const p = projOut.trim();
          if (p && p !== '(unset)') projectId = p;
        } catch {}

        return {
          accessToken: token,
          projectId,
          expiresAt: Date.now() + 50 * 60 * 1000,
          source: 'adc',
        };
      }
    } catch {
      // ignore if gcloud is not installed or not logged in
    }
  }

  return null;
});

// 2. Interactive Google OAuth Desktop Loopback Flow (PKCE)
ipcMain.handle('start-google-oauth', async (_event, { clientId, clientSecret, projectId }) => {
  if (!clientId) {
    throw new Error('OAuth Client ID is required.');
  }

  // Generate PKCE verifier & challenge
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');

  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      try {
        const reqUrl = new URL(req.url || '/', `http://127.0.0.1`);
        const code = reqUrl.searchParams.get('code');
        const error = reqUrl.searchParams.get('error');

        if (error) {
          res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(`<html><body style="font-family:system-ui;background:#0f172a;color:#f8fafc;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;"><div style="text-align:center;"><h2>Sign-in Cancelled (${error})</h2><p>You can close this browser tab.</p></div></body></html>`);
          server.close();
          reject(new Error(`Google OAuth error: ${error}`));
          return;
        }

        if (!code) {
          res.writeHead(200);
          res.end('Waiting for OAuth code...');
          return;
        }

        const addr = server.address();
        const port = typeof addr === 'object' && addr ? addr.port : 0;
        const redirectUri = `http://127.0.0.1:${port}`;

        const tokenParams = new URLSearchParams({
          code,
          client_id: clientId,
          redirect_uri: redirectUri,
          grant_type: 'authorization_code',
          code_verifier: codeVerifier,
        });
        if (clientSecret) {
          tokenParams.set('client_secret', clientSecret);
        }

        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: tokenParams.toString(),
        });

        const tokenData = await tokenRes.json();
        if (!tokenRes.ok || !tokenData.access_token) {
          throw new Error(tokenData.error_description || tokenData.error || 'Failed to exchange authorization code for token.');
        }

        let email = '';
        let name = '';
        let picture = '';
        try {
          const uRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${tokenData.access_token}` },
          });
          if (uRes.ok) {
            const uData = await uRes.json();
            email = uData.email || '';
            name = uData.name || '';
            picture = uData.picture || '';
          }
        } catch {}

        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(`<html><body style="font-family:system-ui;background:#0f172a;color:#f8fafc;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;"><div style="text-align:center;background:#1e293b;padding:32px;border-radius:16px;border:1px solid #334155;"><h2 style="color:#818cf8;margin-top:0;">✨ Signed in to Vibe Design Studio!</h2><p>You may now close this window and return to the app.</p></div></body></html>`);

        server.close();
        if (mainWindow) {
          if (mainWindow.isMinimized()) mainWindow.restore();
          mainWindow.focus();
        }

        resolve({
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
          expiresAt: Date.now() + (tokenData.expires_in || 3600) * 1000,
          clientId,
          clientSecret,
          projectId: projectId || '',
          email,
          name,
          picture,
          source: 'google-oauth',
        });
      } catch (err) {
        server.close();
        reject(err);
      }
    });

    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      const port = typeof addr === 'object' && addr ? addr.port : 0;
      const redirectUri = `http://127.0.0.1:${port}`;

      const scopes = [
        'openid',
        'email',
        'profile',
        'https://www.googleapis.com/auth/cloud-platform',
      ].join(' ');

      const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      authUrl.searchParams.set('client_id', clientId);
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('scope', scopes);
      authUrl.searchParams.set('access_type', 'offline');
      authUrl.searchParams.set('prompt', 'consent');
      authUrl.searchParams.set('code_challenge', codeChallenge);
      authUrl.searchParams.set('code_challenge_method', 'S256');

      shell.openExternal(authUrl.toString());
    });

    // Timeout after 3 minutes
    setTimeout(() => {
      try {
        server.close();
      } catch {}
      reject(new Error('Google sign-in timed out.'));
    }, 180_000);
  });
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'Vibe Design Studio',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
      preload: path.join(__dirname, 'preload.cjs'),
    },
    autoHideMenuBar: true,
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();
  setupAutoUpdater();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
