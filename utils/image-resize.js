// Shrinks a photo picked on the device so it doesn't fill up storage.
// Returns the picture as text (a "data URL") that can be saved with the record.

export function resizeImageFile(file, maxSize = 600, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const failed = new Error("That photo couldn't be opened. Try a different one.");
    if (!file || !file.type.startsWith('image/')) {
      reject(failed);
      return;
    }

    const url = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(image.naturalWidth * scale);
      canvas.height = Math.round(image.naturalHeight * scale);
      canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(failed);
    };

    image.src = url;
  });
}
