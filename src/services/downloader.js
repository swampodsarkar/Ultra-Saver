const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs');
const { promisify } = require('util');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');

const execFilePromise = promisify(execFile);
const unlinkPromise = promisify(fs.unlink);
const accessPromise = promisify(fs.access);

const ytDlpPath = config.ytdlpPath;
const tempDir = path.resolve(config.tempDir);

if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

async function checkYtDlp() {
  try {
    await accessPromise(ytDlpPath, fs.constants.X_OK);
    return true;
  } catch {
    try {
      await execFilePromise(ytDlpPath, ['--version']);
      return true;
    } catch {
      try {
        await execFilePromise('yt-dlp', ['--version']);
        return true;
      } catch {
        return false;
      }
    }
  }
}

const baseArgs = [
  '--socket-timeout', '15',
  '--no-check-certificates',
  '--abort-on-error',
];

async function runYtDlp(args, timeout = 120000) {
  try {
    const { stdout } = await execFilePromise(ytDlpPath, [...baseArgs, ...args], {
      timeout,
      maxBuffer: 1024 * 1024 * 10,
    });
    return stdout;
  } catch (error) {
    // yt-dlp often exits non-zero but still produces valid output
    if (error.stdout && error.stdout.length > 0) {
      return error.stdout;
    }
    const msg = error.stderr ? error.stderr.trim().split('\n').filter(l => l).pop() : error.message;
    throw new Error(msg);
  }
}

const infoCache = new Map();
const CACHE_TTL = 300000;

async function fetchVideoInfo(url) {
  const cached = infoCache.get(url);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data;

  const args = [
    '--dump-json',
    '--no-download',
    '--no-warnings',
    '--no-playlist',
    '--skip-unavailable-fragments',
    '--extractor-retries', '1',
    '--youtube-skip-dash-manifest',
    '--restrict-filenames',
    url,
  ];

  try {
    const stdout = await runYtDlp(args, 20000);
    const data = JSON.parse(stdout.trim().split('\n')[0]);

    const result = {
      id: data.id,
      title: data.title || 'Unknown Title',
      thumbnail: data.thumbnail || null,
      duration: data.duration || 0,
      uploader: data.uploader || data.channel || 'Unknown',
      platform: data.extractor || data.extractor_key || 'Unknown',
      webpageUrl: data.webpage_url || url,
    };

    infoCache.set(url, { data: result, ts: Date.now() });
    if (infoCache.size > 100) infoCache.clear();

    return result;
  } catch (error) {
    throw new Error(`Failed to fetch video info: ${error.message}`);
  }
}

async function downloadVideo(url, quality) {
  const outputId = uuidv4();
  const outputTemplate = path.join(tempDir, `${outputId}_%(id)s.%(ext)s`);

  let formatArg;
  switch (quality) {
    case '360p':
      formatArg = 'bestvideo[height<=360]+bestaudio/best[height<=360]';
      break;
    case '720p':
      formatArg = 'bestvideo[height<=720]+bestaudio/best[height<=720]';
      break;
    case '1080p':
      formatArg = 'bestvideo[height<=1080]+bestaudio/best[height<=1080]';
      break;
    case 'mp3':
      formatArg = 'bestaudio/best';
      break;
    case 'best':
    default:
      formatArg = 'bestvideo+bestaudio/best';
      break;
  }

  const args = [
    '--no-warnings',
    '--restrict-filenames',
    '-o', outputTemplate,
    '-f', formatArg,
    '--merge-output-format', 'mp4',
    '--no-playlist',
    '--no-part',
    '--buffer-size', '4096',
    '--max-filesize', `${config.maxFileSize}`,
    url,
  ];

  try {
    await runYtDlp(args);

    const outputFile = findOutputFile(outputId);
    if (!outputFile) {
      throw new Error('Download completed but file not found');
    }

    const stats = fs.statSync(outputFile);
    const ext = path.extname(outputFile).toLowerCase();

    return {
      filePath: outputFile,
      size: stats.size,
      ext,
      outputId,
    };
  } catch (error) {
    throw new Error(`Download failed: ${error.message}`);
  }
}

async function downloadAudio(url) {
  const outputId = uuidv4();
  const outputTemplate = path.join(tempDir, `${outputId}_%(id)s.%(ext)s`);

  const args = [
    '--no-warnings',
    '--restrict-filenames',
    '-o', outputTemplate,
    '-f', 'bestaudio/best',
    '--extract-audio',
    '--audio-format', 'mp3',
    '--audio-quality', '0',
    '--no-playlist',
    '--no-part',
    '--max-filesize', `${config.maxFileSize}`,
    url,
  ];

  try {
    await runYtDlp(args);

    const outputFile = findOutputFile(outputId, '.mp3');
    if (!outputFile) {
      throw new Error('Audio download completed but file not found');
    }

    const stats = fs.statSync(outputFile);

    return {
      filePath: outputFile,
      size: stats.size,
      ext: '.mp3',
      outputId,
    };
  } catch (error) {
    throw new Error(`Audio download failed: ${error.message}`);
  }
}

function findOutputFile(outputId, preferredExt) {
  if (!fs.existsSync(tempDir)) return null;
  const files = fs.readdirSync(tempDir);
  const matching = files.filter(f => f.startsWith(outputId));
  if (matching.length === 0) return null;

  if (preferredExt) {
    const preferred = matching.find(f => f.endsWith(preferredExt));
    if (preferred) return path.join(tempDir, preferred);
  }

  // prefer mp4, then other video, then any
  const mp4 = matching.find(f => f.endsWith('.mp4'));
  if (mp4) return path.join(tempDir, mp4);
  const video = matching.find(f => /\.(mp4|webm|mkv|mov|avi)$/i.test(f));
  if (video) return path.join(tempDir, video);

  return path.join(tempDir, matching[0]);
}

async function sendWithProgress(ctx, chatId, filePath, caption, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const ext = path.extname(filePath).toLowerCase();
      const fileSize = fs.statSync(filePath).size;

      if (fileSize > config.maxFileSize) {
        return { error: 'file_too_large', size: fileSize };
      }

      if (ext === '.mp3') {
        await ctx.telegram.sendAudio(chatId, { source: filePath }, { caption, parse_mode: 'HTML' });
      } else if (ext === '.mp4' || ext === '.webm' || ext === '.mov') {
        await ctx.telegram.sendVideo(chatId, { source: filePath }, {
          caption,
          parse_mode: 'HTML',
          supports_streaming: true,
        });
      } else {
        await ctx.telegram.sendDocument(chatId, { source: filePath }, { caption, parse_mode: 'HTML' });
      }

      return { success: true };
    } catch (error) {
      if (error.description?.includes('file is too big')) {
        return { error: 'file_too_large', size: fs.statSync(filePath).size };
      }
      if (attempt === retries) {
        return { error: error.message };
      }
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
}

async function cleanupFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      await unlinkPromise(filePath);
    }

    const dir = path.dirname(filePath);
    const base = path.basename(filePath, path.extname(filePath));
    const files = fs.readdirSync(dir).filter((f) => f.startsWith(base));
    for (const f of files) {
      try {
        fs.unlinkSync(path.join(dir, f));
      } catch {}
    }
  } catch {}
}

async function cleanupOldFiles(maxAge = 3600000) {
  try {
    const files = fs.readdirSync(tempDir);
    const now = Date.now();
    for (const file of files) {
      const filePath = path.join(tempDir, file);
      try {
        const stats = fs.statSync(filePath);
        if (now - stats.mtimeMs > maxAge) {
          fs.unlinkSync(filePath);
        }
      } catch {}
    }
  } catch {}
}

setInterval(() => cleanupOldFiles(), 1800000);

module.exports = {
  checkYtDlp,
  fetchVideoInfo,
  downloadVideo,
  downloadAudio,
  sendWithProgress,
  cleanupFile,
  cleanupOldFiles,
};
