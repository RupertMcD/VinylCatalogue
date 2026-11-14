// A short message that appears above the tab bar for a few seconds,
// for example "Added: Kind of Blue".

let toast = null;
let timer = null;

export function showToast(message) {
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    toast.setAttribute('role', 'status');
    document.body.append(toast);
  }
  clearTimeout(timer);
  toast.textContent = message;
  toast.classList.remove('toast--visible');
  // Restart the fade-in even if a message is already showing.
  void toast.offsetWidth;
  toast.classList.add('toast--visible');
  timer = setTimeout(() => toast.classList.remove('toast--visible'), 2800);
}
