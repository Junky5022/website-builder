import { useEffect, useState } from 'react';
import { ArrowUpCircle, CheckCircle, RefreshCw, X, Download } from 'lucide-react';

interface UpdateInfo {
  version: string;
  releaseDate?: string;
}

interface DownloadProgress {
  percent: number;
  transferred: number;
  total: number;
}

export default function UpdateNotification() {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);
  const [updateDownloaded, setUpdateDownloaded] = useState<UpdateInfo | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Only active in Electron desktop app
    const electronAPI = (window as any).electronAPI;
    if (!electronAPI) return;

    const cleanupAvailable = electronAPI.onUpdateAvailable((info: UpdateInfo) => {
      setUpdateInfo(info);
      setDismissed(false);
    });

    const cleanupProgress = electronAPI.onDownloadProgress((progress: DownloadProgress) => {
      setDownloadProgress(progress);
    });

    const cleanupDownloaded = electronAPI.onUpdateDownloaded((info: UpdateInfo) => {
      setUpdateDownloaded(info);
      setDownloadProgress(null);
    });

    return () => {
      cleanupAvailable?.();
      cleanupProgress?.();
      cleanupDownloaded?.();
    };
  }, []);

  if (dismissed) return null;
  if (!updateInfo && !updateDownloaded) return null;

  const electronAPI = (window as any).electronAPI;

  const handleStartDownload = () => {
    electronAPI?.downloadUpdate();
    setDownloadProgress({ percent: 0, transferred: 0, total: 1 });
  };

  const handleRestartAndInstall = () => {
    electronAPI?.restartAndInstall();
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full bg-slate-900/95 backdrop-blur-xl border-2 border-indigo-500 rounded-2xl shadow-2xl p-4 text-white animate-in slide-in-from-bottom duration-300">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-600/30 border border-indigo-500/50 rounded-xl text-indigo-400">
            {updateDownloaded ? (
              <CheckCircle className="w-5 h-5 text-emerald-400" />
            ) : (
              <ArrowUpCircle className="w-5 h-5 text-indigo-400" />
            )}
          </div>
          <div>
            <h4 className="font-bold text-sm text-white">
              {updateDownloaded
                ? 'Update Ready to Install!'
                : `Update v${updateInfo?.version} Available`}
            </h4>
            <p className="text-xs text-slate-300 mt-0.5">
              {updateDownloaded
                ? 'Restart now to apply the newest version.'
                : 'A new version has been released on GitHub.'}
            </p>
          </div>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {downloadProgress && (
        <div className="mt-3">
          <div className="flex justify-between text-xs text-indigo-200 mb-1 font-mono">
            <span>Downloading update...</span>
            <span>{downloadProgress.percent}%</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-700">
            <div
              className="bg-indigo-500 h-2 rounded-full transition-all duration-200"
              style={{ width: `${downloadProgress.percent}%` }}
            />
          </div>
        </div>
      )}

      <div className="mt-3 flex gap-2">
        {updateDownloaded ? (
          <button
            onClick={handleRestartAndInstall}
            className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-900/40"
          >
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            Restart & Update
          </button>
        ) : downloadProgress ? (
          <button
            disabled
            className="flex-1 bg-slate-800 text-slate-400 text-xs py-2 px-3 rounded-xl cursor-wait flex items-center justify-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
            Downloading...
          </button>
        ) : (
          <button
            onClick={handleStartDownload}
            className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs py-2 px-3 rounded-xl transition flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-900/40"
          >
            <Download className="w-3.5 h-3.5" />
            Download & Update
          </button>
        )}
        <button
          onClick={() => setDismissed(true)}
          className="px-3 py-2 text-xs text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
        >
          Later
        </button>
      </div>
    </div>
  );
}
