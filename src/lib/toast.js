// Premium Toast Notification Utility

export function showToast(message, type = 'success') {
  if (typeof document === 'undefined') return;

  // Create toast container if it doesn't exist
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  // Create toast element
  const toast = document.createElement('div');
  toast.className = `toast-message toast-${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${type === 'success' ? '✨' : type === 'error' ? '⚠️' : 'ℹ️'}</span>
    <span class="toast-text">${message}</span>
  `;

  container.appendChild(toast);

  // Trigger entering animation
  setTimeout(() => {
    toast.classList.add('toast-show');
  }, 10);

  // Dismiss and clean up after 3 seconds
  setTimeout(() => {
    toast.classList.remove('toast-show');
    toast.classList.add('toast-hide');
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 3500);
}
