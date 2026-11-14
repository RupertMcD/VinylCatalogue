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

// Returns { stop }. onError(message) is called with a friendly message.
export function startCameraScanner(video, { onFound, onError, onStarted }) {
  let stream = null;
  let stopped = false;
  let timer = null;
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d', { willReadFrequently: true });

  function stop() {
    stopped = true;
    clearTimeout(timer);
    if (stream) stream.getTracks().forEach((track) => track.stop());
    stream = null;
    video.srcObject = null;
  }

  // Reads the middle band of the picture, where the guide frame is.
  async function scanOnce() {
    if (stopped) return;
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
      video.srcObject = stream;
      await video.play().catch(() => {});
      if (onStarted) onStarted();
      scanOnce();
    } catch (error) {
      if (!stopped) {
        stop();
        onError(friendlyCameraError(error));
      }
    }
  })();

  return { stop };
}
