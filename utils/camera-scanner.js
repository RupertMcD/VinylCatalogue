// Runs the camera and keeps looking for a barcode in the middle of the
// picture. Calls onFound(digits) once, then stops.

import { readBarcodeFrom, loadBarcodeReader } from './barcode-reader.js';

const SCAN_EVERY_MS = 200;

function friendlyCameraError(error) {
  const name = error && error.name;
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return "The app isn't allowed to use the camera. You can type the barcode below, or allow the camera and try again.";
  }
  if (name === 'NotFoundError' || name === 'OverconstrainedError') {
    return "No camera was found. You can type the barcode below.";
  }
  if (name === 'NotReadableError' || name === 'AbortError') {
    return 'The camera is busy. Close other apps using it, then try again.';
  }
  return error && error.message ? error.message : "The camera couldn't start. You can type the barcode below.";
}

export function cameraIsAvailable() {
  return Boolean(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

// iOS only shows a live camera view in a page when the video is muted and
// plays "inline" (inside the page, not full screen). Set both in code, as
// the HTML attributes alone aren't always enough.
function prepareVideo(video) {
  video.muted = true;
  video.defaultMuted = true;
  video.playsInline = true;
  video.autoplay = true;
  video.setAttribute('playsinline', '');
  video.setAttribute('webkit-playsinline', '');
  video.setAttribute('muted', '');
}

function waitForPicture(video) {
  if (video.readyState >= 1) return Promise.resolve();
  return new Promise((resolve) => {
    const done = () => { clearTimeout(timer); resolve(); };
    const timer = setTimeout(done, 3000);
    video.addEventListener('loadedmetadata', done, { once: true });
  });
}

// Copies the camera picture onto a canvas on screen, filling it like
// "object-fit: cover". Home-screen apps on iOS can leave a live camera
// <video> black even while it's working, so the preview is drawn here.
function drawPreview(video, preview) {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh) return;
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.round(preview.clientWidth * ratio);
  const height = Math.round(preview.clientHeight * ratio);
  if (!width || !height) return;
  if (preview.width !== width || preview.height !== height) {
    preview.width = width;
    preview.height = height;
  }
  const scale = Math.max(width / vw, height / vh);
  const sw = width / scale;
  const sh = height / scale;
  preview.getContext('2d').drawImage(video, (vw - sw) / 2, (vh - sh) / 2, sw, sh, 0, 0, width, height);
}

// Returns { stop }. onError(message) is called with a friendly message.
// onNeedsTap() is called if iOS wants a tap before showing the camera.
// `preview` is an optional canvas the camera picture is drawn onto.
export function startCameraScanner(video, { preview, onFound, onError, onStarted, onNeedsTap }) {
  let stream = null;
  let stopped = false;
  let timer = null;
  let frame = null;
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d', { willReadFrequently: true });

  function previewLoop() {
    if (stopped || !preview) return;
    try { drawPreview(video, preview); } catch { /* try again next frame */ }
    frame = requestAnimationFrame(previewLoop);
  }

  function stop() {
    stopped = true;
    clearTimeout(timer);
    if (frame) cancelAnimationFrame(frame);
    if (stream) stream.getTracks().forEach((track) => track.stop());
    stream = null;
    video.srcObject = null;
  }

  // Reads the middle band of the picture, where the guide frame is.
  async function scanOnce() {
    if (stopped) return;
    if (video.paused) video.play().catch(() => {});
    try {
      const width = video.videoWidth;
      const height = video.videoHeight;
      if (width && height) {
        const cropWidth = Math.round(width * 0.9);
        const cropHeight = Math.round(Math.min(height * 0.5, cropWidth * 0.6));
        const scale = Math.min(1, 1280 / cropWidth);
        canvas.width = Math.round(cropWidth * scale);
        canvas.height = Math.round(cropHeight * scale);
        context.drawImage(
          video,
          (width - cropWidth) / 2, (height - cropHeight) / 2, cropWidth, cropHeight,
          0, 0, canvas.width, canvas.height,
        );
        const digits = await readBarcodeFrom(context.getImageData(0, 0, canvas.width, canvas.height));
        if (digits && !stopped) {
          stop();
          onFound(digits);
          return;
        }
      }
    } catch (error) {
      if (!stopped) {
        stop();
        onError(error.message || "The barcode scanner stopped. You can type the barcode below.");
        return;
      }
    }
    if (!stopped) timer = setTimeout(scanOnce, SCAN_EVERY_MS);
  }

  (async () => {
    if (!cameraIsAvailable()) {
      onError("The camera can't be used here. You can type the barcode below.");
      return;
    }
    try {
      // Load the scanner and open the camera at the same time.
      const [newStream] = await Promise.all([
        navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
        }),
        loadBarcodeReader(),
      ]);
      if (stopped) {
        newStream.getTracks().forEach((track) => track.stop());
        return;
      }
      stream = newStream;
      prepareVideo(video);
      video.srcObject = stream;
      await waitForPicture(video);
      try {
        await video.play();
        if (onStarted) onStarted();
      } catch {
        // iOS sometimes wants a tap first. Scanning still works meanwhile.
        if (onNeedsTap) onNeedsTap();
      }
      if (!stopped) {
        previewLoop();
        scanOnce();
      }
    } catch (error) {
      if (!stopped) {
        stop();
        onError(friendlyCameraError(error));
      }
    }
  })();

  return { stop };
}
