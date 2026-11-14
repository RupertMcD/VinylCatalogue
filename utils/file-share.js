// Hands a file to the person: on iPhone through the share sheet (Save to
// Files, AirDrop, Mail…), elsewhere as a download.

// Returns 'shared', 'downloaded' or 'cancelled'.
// Call it straight from a tap: iOS only opens the share sheet then.
export async function shareOrDownloadFile(file) {
  if (navigator.canShare && navigator.share) {
    let canShare = false;
    try { canShare = navigator.canShare({ files: [file] }); } catch { canShare = false; }
    if (canShare) {
      try {
        await navigator.share({ files: [file], title: file.name });
        return 'shared';
      } catch (error) {
        if (error && error.name === 'AbortError') return 'cancelled';
        // Anything else: fall back to a download below.
      }
    }
  }

  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
  return 'downloaded';
}
