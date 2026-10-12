const fs = require('fs');
const path = require('path');

let cachedDemoUrl = null;

function getLatestIncidentClipOnDisk() {
  try {
    const clipsDir = path.join(__dirname, '..', '..', 'public', 'clips');
    if (!fs.existsSync(clipsDir)) return null;
    const files = fs.readdirSync(clipsDir)
      .filter(f => f.startsWith('incident_') && f.endsWith('.mp4') && !f.includes('demo'))
      .map(f => ({
        name: f,
        time: fs.statSync(path.join(clipsDir, f)).mtimeMs
      }))
      .sort((a, b) => b.time - a.time);

    if (files.length > 0) {
      console.log(`🎬 [REAL-TIME CLIP RETRIEVED FROM DISK] Found latest recorded incident clip: ${files[0].name}`);
      return `http://localhost:5000/clips/${files[0].name}`;
    }
  } catch (err) {
    console.warn(`[DISK CLIP SEARCH ERROR]`, err.message);
  }
  return null;
}

/**
 * Uploads a local MP4 video file to a free-tier temporary cloud host (Uguu / tmpfiles.org)
 * so that incident clips can be opened and played on mobile devices without localhost networking restrictions.
 * 
 * @param {string} filePathOrUrl - Local path or localhost URL to upload
 * @returns {Promise<string>} Public HTTPS video URL, or original path if offline
 */
async function uploadVideoToCloud(filePathOrUrl) {
  if (!filePathOrUrl) return '';

  // Check if we were passed a demo clip or fallback, but a REAL incident clip exists on disk
  if (typeof filePathOrUrl === 'string' && (filePathOrUrl.includes('demo_incident') || filePathOrUrl.includes('SFsrMRXG'))) {
    const realDiskClip = getLatestIncidentClipOnDisk();
    if (realDiskClip) {
      console.log(`🔄 [UPGRADING CLIP] Upgrading from demo clip fallback to REAL-TIME incident clip: ${realDiskClip}`);
      filePathOrUrl = realDiskClip;
    }
  }

  // If already an external public HTTPS URL (not localhost / 127.0.0.1 and not demo clip), use as-is
  if (
    typeof filePathOrUrl === 'string' &&
    filePathOrUrl.startsWith('http') &&
    !filePathOrUrl.includes('localhost') &&
    !filePathOrUrl.includes('127.0.0.1') &&
    !filePathOrUrl.includes('demo_incident') &&
    !filePathOrUrl.includes('SFsrMRXG')
  ) {
    return filePathOrUrl;
  }

  // Determine actual local file on disk
  let localPath = filePathOrUrl;
  if (typeof filePathOrUrl === 'string' && filePathOrUrl.includes('/clips/')) {
    const filename = filePathOrUrl.split('/clips/').pop().split('?')[0];
    localPath = path.join(__dirname, '..', '..', 'public', 'clips', filename);
  }

  if (!fs.existsSync(localPath)) {
    console.warn(`[CLOUD UPLOADER] Local clip file not found: ${localPath}`);
    return filePathOrUrl;
  }

  const filename = path.basename(localPath);

  // Return cached demo cloud URL if already uploaded
  if (filename === 'demo_incident.mp4' && cachedDemoUrl) {
    return cachedDemoUrl;
  }

  // 1. Primary Cloud Provider: Uguu.se (100% free, no API key, direct .mp4 streaming)
  try {
    const fileBuffer = fs.readFileSync(localPath);
    const blob = new Blob([fileBuffer], { type: 'video/mp4' });
    const formData = new FormData();
    formData.append('files[]', blob, filename);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 18000);

    const res = await fetch('https://uguu.se/upload.php', {
      method: 'POST',
      body: formData,
      headers: { 'User-Agent': 'DivyaDrishti/1.0' },
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (data && data.success && data.files && data.files[0] && data.files[0].url) {
        const cloudUrl = data.files[0].url;
        console.log(`☁️ [CLOUD VIDEO HOSTED] Uploaded ${filename} -> ${cloudUrl}`);
        if (filename === 'demo_incident.mp4') cachedDemoUrl = cloudUrl;
        return cloudUrl;
      }
    }
  } catch (err) {
    console.warn(`[CLOUD UPLOADER] Uguu upload notice (${err.message}), trying secondary host...`);
  }

  // 2. Secondary Fallback Provider: tmpfiles.org
  try {
    const fileBuffer = fs.readFileSync(localPath);
    const blob = new Blob([fileBuffer], { type: 'video/mp4' });
    const formData = new FormData();
    formData.append('file', blob, filename);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 18000);

    const res = await fetch('https://tmpfiles.org/api/v1/upload', {
      method: 'POST',
      body: formData,
      headers: { 'User-Agent': 'DivyaDrishti/1.0' },
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      const rawUrl = data?.data?.url;
      if (rawUrl) {
        // Convert to direct streamable link
        const cloudUrl = rawUrl.replace('tmpfiles.org/', 'tmpfiles.org/dl/');
        console.log(`☁️ [CLOUD VIDEO HOSTED] Uploaded ${filename} -> ${cloudUrl}`);
        if (filename === 'demo_incident.mp4') cachedDemoUrl = cloudUrl;
        return cloudUrl;
      }
    }
  } catch (err2) {
    console.warn(`[CLOUD UPLOADER] Secondary cloud upload failed: ${err2.message}`);
  }

  return filePathOrUrl;
}

module.exports = { uploadVideoToCloud, getLatestIncidentClipOnDisk };
