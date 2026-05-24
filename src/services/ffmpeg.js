const { exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const fs = require('fs');

const execPromise = promisify(exec);

async function checkFfmpeg() {
  try {
    const { stdout } = await execPromise('ffmpeg -version');
    return true;
  } catch {
    return false;
  }
}

async function compressVideo(inputPath, maxSizeMB = 45) {
  const ext = path.extname(inputPath);
  const outputPath = inputPath.replace(ext, `_compressed${ext}`);
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  const targetBitrate = Math.floor((maxSizeBytes * 8) / 60);

  try {
    await execPromise(
      `ffmpeg -i "${inputPath}" -c:v libx264 -preset fast -b:v ${targetBitrate}k -c:a aac -b:a 128k -movflags +faststart -y "${outputPath}"`,
      { timeout: 120000 }
    );

    if (fs.existsSync(outputPath)) {
      try { fs.unlinkSync(inputPath); } catch {}
      return outputPath;
    }
    return inputPath;
  } catch {
    return inputPath;
  }
}

async function convertToMp4(inputPath) {
  const outputPath = inputPath.replace(/\.[^.]+$/, '.mp4');

  try {
    await execPromise(
      `ffmpeg -i "${inputPath}" -c:v libx264 -preset fast -c:a aac -movflags +faststart -y "${outputPath}"`,
      { timeout: 120000 }
    );

    if (fs.existsSync(outputPath)) {
      try { fs.unlinkSync(inputPath); } catch {}
      return outputPath;
    }
    return inputPath;
  } catch {
    return inputPath;
  }
}

async function trimVideo(inputPath, startTime, duration) {
  const ext = path.extname(inputPath);
  const outputPath = inputPath.replace(ext, `_trimmed${ext}`);

  try {
    await execPromise(
      `ffmpeg -i "${inputPath}" -ss ${startTime} -t ${duration} -c:v libx264 -preset fast -c:a aac -movflags +faststart -y "${outputPath}"`,
      { timeout: 60000 }
    );

    if (fs.existsSync(outputPath)) {
      try { fs.unlinkSync(inputPath); } catch {}
      return outputPath;
    }
    return inputPath;
  } catch {
    return inputPath;
  }
}

module.exports = { checkFfmpeg, compressVideo, convertToMp4, trimVideo };
