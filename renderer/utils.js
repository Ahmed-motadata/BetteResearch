// Utility functions for notifications and helpers
export function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    notification.style.position = 'fixed';
    notification.style.bottom = '10px';
    notification.style.left = '50%';
    notification.style.transform = 'translateX(-50%)';
    notification.style.backgroundColor = 'rgba(60, 60, 60, 0.75)';
    notification.style.color = '#f5f5f5';
    notification.style.padding = '3px 12px';
    notification.style.fontSize = '12px';
    notification.style.borderRadius = '6px';
    notification.style.boxShadow = 'none';
    notification.style.opacity = '0';
    notification.style.transition = 'opacity 0.25s';
    document.body.appendChild(notification);
    setTimeout(() => { notification.style.opacity = '1'; }, 10);
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => { document.body.removeChild(notification); }, 300);
    }, 2000);
}
