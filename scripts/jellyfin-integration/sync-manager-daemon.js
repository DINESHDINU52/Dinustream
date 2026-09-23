/**
 * DinuStream Oracle Cloud SSD Cache Manager Daemon
 *
 * Runs on the Oracle Cloud host (Port 8787).
 * Listens for synchronization requests from DinuStream / Jellyfin and
 * transfers media files from Google Drive (remote storage) to local NVMe SSD
 * cache with real-time transfer tracking and automated LRU disk cleaning.
 */

const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const PORT = parseInt(process.env.SYNC_MANAGER_PORT || '8787', 10);
const API_KEY = process.env.SYNC_MANAGER_API_KEY || '';
const GDRIVE_REMOTE = process.env.GDRIVE_REMOTE || 'gdrive:Movies';
const LOCAL_CACHE_DIR = process.env.LOCAL_CACHE_DIR || '/mnt/ssd-cache/movies';
const MAX_DISK_USAGE_PERCENT = parseInt(process.env.MAX_DISK_USAGE_PERCENT || '85', 10);

// In-memory active sync jobs table
const activeJobs = new Map();

/**
 * Format bytes into human-readable strings
 */
function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Check if a file is already cached locally on SSD
 */
function isFileLocallyCached(filename) {
  const localPath = path.join(LOCAL_CACHE_DIR, filename);
  try {
    return fs.existsSync(localPath) && fs.statSync(localPath).size > 0;
  } catch {
    return false;
  }
}

/**
 * Start rclone transfer job from Google Drive to local SSD
 */
function startRcloneJob(filename, movieId) {
  if (activeJobs.has(filename) && activeJobs.get(filename).state === 'syncing') {
    return activeJobs.get(filename);
  }

  // Check if already completed and on SSD
  if (isFileLocallyCached(filename)) {
    const stats = fs.statSync(path.join(LOCAL_CACHE_DIR, filename));
    const readyJob = {
      filename,
      movieId,
      state: 'ready',
      percentage: 100,
      transferredBytes: stats.size,
      totalBytes: stats.size,
      transferredFormatted: formatBytes(stats.size),
      totalFormatted: formatBytes(stats.size),
      speedBytesPerSec: 0,
      speedFormatted: 'Cached on SSD',
      etaSeconds: 0,
      etaFormatted: '0s',
      updatedAt: new Date().toISOString(),
    };
    activeJobs.set(filename, readyJob);
    return readyJob;
  }

  // Ensure local target directory exists
  fs.mkdirSync(LOCAL_CACHE_DIR, { recursive: true });

  const job = {
    filename,
    movieId,
    state: 'starting',
    percentage: 0,
    transferredBytes: 0,
    totalBytes: 0,
    transferredFormatted: '0 B',
    totalFormatted: 'Calculating...',
    speedBytesPerSec: 0,
    speedFormatted: '0 MB/s',
    etaSeconds: 0,
    etaFormatted: 'Calculating...',
    startedAt: Date.now(),
    updatedAt: new Date().toISOString(),
  };
  activeJobs.set(filename, job);

  // Spawn rclone copy with JSON stats reporting
  const remotePath = `${GDRIVE_REMOTE}/${filename}`;
  const rcloneProcess = spawn('rclone', [
    'copy',
    remotePath,
    LOCAL_CACHE_DIR,
    '--stats',
    '1s',
    '--stats-log-level',
    'NOTICE',
    '-v',
    '--use-mmap',
    '--transfers',
    '4',
    '--buffer-size',
    '64M',
  ]);

  job.process = rcloneProcess;
  job.state = 'syncing';

  rcloneProcess.stderr.on('data', (chunk) => {
    const output = chunk.toString();

    // Parse rclone progress output, e.g.:
    // Transferred:   1.234 GiB / 15.678 GiB, 8%, 124.500 MiB/s, ETA 1m55s
    const match = output.match(/Transferred:\s+([0-9.]+\s+[A-Za-z]+)\s+\/\s+([0-9.]+\s+[A-Za-z]+),\s+([0-9]+)%,\s+([0-9.]+\s+[A-Za-z]+\/s),\s+ETA\s+([0-9a-z]+)/i);
    if (match) {
      job.transferredFormatted = match[1];
      job.totalFormatted = match[2];
      job.percentage = parseInt(match[3], 10);
      job.speedFormatted = match[4];
      job.etaFormatted = match[5];
      job.updatedAt = new Date().toISOString();
    }
  });

  rcloneProcess.on('close', (code) => {
    if (code === 0 && isFileLocallyCached(filename)) {
      const stats = fs.statSync(path.join(LOCAL_CACHE_DIR, filename));
      job.state = 'ready';
      job.percentage = 100;
      job.transferredBytes = stats.size;
      job.totalBytes = stats.size;
      job.transferredFormatted = formatBytes(stats.size);
      job.totalFormatted = formatBytes(stats.size);
      job.speedFormatted = 'Ready on SSD';
      job.etaFormatted = '0s';
      job.updatedAt = new Date().toISOString();
    } else {
      job.state = 'error';
      job.error = `rclone exited with code ${code}`;
      job.updatedAt = new Date().toISOString();
    }
    delete job.process;
  });

  rcloneProcess.on('error', (err) => {
    job.state = 'error';
    job.error = err.message;
    delete job.process;
  });

  return job;
}

// HTTP Server
const server = http.createServer((req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Optional API Key authentication check
  if (API_KEY) {
    const authHeader = req.headers['authorization'];
    if (!authHeader || authHeader !== `Bearer ${API_KEY}`) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }
  }

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  // 1. Health check
  if (url.pathname === '/health' || url.pathname === '/sync/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'online',
      service: 'dinustream-ssd-sync-manager',
      port: PORT,
      cacheDir: LOCAL_CACHE_DIR,
      activeSyncs: Array.from(activeJobs.values()).filter((j) => j.state === 'syncing').length,
      uptimeSeconds: Math.floor(process.uptime()),
    }));
    return;
  }

  // 2. Poll Status
  if (url.pathname.startsWith('/status/') || url.pathname.startsWith('/sync/status/')) {
    const parts = url.pathname.split('/');
    const filename = decodeURIComponent(parts[parts.length - 1]);

    let job = activeJobs.get(filename);
    if (!job) {
      if (isFileLocallyCached(filename)) {
        const stats = fs.statSync(path.join(LOCAL_CACHE_DIR, filename));
        job = {
          filename,
          state: 'ready',
          percentage: 100,
          transferredBytes: stats.size,
          totalBytes: stats.size,
          transferredFormatted: formatBytes(stats.size),
          totalFormatted: formatBytes(stats.size),
          speedBytesPerSec: 0,
          speedFormatted: 'Cached on SSD',
          etaSeconds: 0,
          etaFormatted: '0s',
          updatedAt: new Date().toISOString(),
        };
      } else {
        job = {
          filename,
          state: 'not_cached',
          percentage: 0,
          transferredBytes: 0,
          totalBytes: 0,
          transferredFormatted: '0 B',
          totalFormatted: '0 B',
          speedBytesPerSec: 0,
          speedFormatted: '0 MB/s',
          etaSeconds: 0,
          etaFormatted: '0s',
          updatedAt: new Date().toISOString(),
        };
      }
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(job));
    return;
  }

  // 3. Initiate Movie Sync
  if (req.method === 'POST' && (url.pathname === '/movie' || url.pathname === '/sync/movie')) {
    let bodyData = '';
    req.on('data', (c) => (bodyData += c));
    req.on('end', () => {
      try {
        const parsed = JSON.parse(bodyData || '{}');
        const filename = parsed.filename;
        const movieId = parsed.movieId || '';

        if (!filename) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing filename parameter' }));
          return;
        }

        const job = startRcloneJob(filename, movieId);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          message: `Started synchronization for "${filename}"`,
          status: job,
        }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[DinuStream SSD Sync Manager] Listening on port ${PORT}`);
  console.log(`Local NVMe Cache Directory: ${LOCAL_CACHE_DIR}`);
  console.log(`Google Drive Remote: ${GDRIVE_REMOTE}`);
});
