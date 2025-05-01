// Clipboard UI logic for creating, updating, and deleting items
// This module exports: createClipboardItem, loadClipboardItems, loadClipboardItemsFromDB, saveClipboardItems

// Use the same logic as in script.js for full compatibility
const urlRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/i;

export function createClipboardItem(data, insertOnTop = true) {
    const MAX_LENGTH = 100;
    const item = document.createElement('div');
    item.className = 'clipboard-item' + (data.type === 'link' ? ' link-item' : '');
    if (data.id) item.dataset.id = data.id;

    // Create content wrapper
    const contentWrapper = document.createElement('div');
    contentWrapper.className = 'clipboard-item-content';
    let content = document.createElement('p');
    let isURL = false;
    let isImage = false;
    let text = data;
    if (typeof data === 'object' && data.type === 'image') {
        isImage = true;
    } else if (typeof data === 'object' && data.type === 'link') {
        isURL = true;
        text = data.content;
    } else if (typeof data === 'object' && data.type === 'text') {
        text = data.content;
    } else if (typeof data === 'string') {
        isURL = urlRegex.test(data.trim());
    }
    let expanded = false;
    // Create action buttons
    const actionButtons = document.createElement('div');
    actionButtons.className = 'action-buttons';
    const copyBtn = document.createElement('button');
    copyBtn.title = "Copy to clipboard";
    copyBtn.innerHTML = '📋';
    if (isImage) {
        copyBtn.addEventListener('click', () => {
            if (navigator.clipboard && window.ClipboardItem) {
                fetch(data.content)
                    .then(res => res.blob())
                    .then(blob => {
                        const item = new ClipboardItem({ [blob.type]: blob });
                        navigator.clipboard.write([item]);
                        import('./utils.js').then(({ showNotification }) => showNotification('Image copied to clipboard!'));
                    });
            } else {
                import('./utils.js').then(({ showNotification }) => showNotification('Image copy not supported in this browser.'));
            }
        });
    } else {
        copyBtn.addEventListener('click', () => copyToClipboard(text));
    }
    const deleteBtn = document.createElement('button');
    deleteBtn.title = "Delete";
    deleteBtn.innerHTML = '🗑️';
    deleteBtn.addEventListener('click', async () => {
        const isElectron = window.navigator.userAgent.toLowerCase().indexOf('electron') > -1;
        let ipcRenderer;
        if (isElectron) {
            try {
                ipcRenderer = window.require('electron').ipcRenderer;
            } catch {}
        }
        // Get the current collection name from a global or window variable
        let collectionName = null;
        if (window.currentCollection && window.currentCollection.name) {
            collectionName = window.currentCollection.name;
        } else if (window.localStorage) {
            collectionName = window.localStorage.getItem('currentCollection') || 'default_collection';
        }
        if (isElectron && ipcRenderer && item.dataset.id) {
            const res = await ipcRenderer.invoke('delete-clipboard-item', item.dataset.id, collectionName);
            if (res.success) {
                item.remove();
            } else {
                import('./utils.js').then(({ showNotification }) => showNotification('Failed to delete from DB: ' + res.error));
            }
        } else {
            item.remove();
            saveClipboardItems();
        }
    });
    // Expand/contract button for long text
    let expandBtn = null;
    if (!isImage && !isURL && typeof text === 'string' && text.length > MAX_LENGTH) {
        expandBtn = document.createElement('button');
        expandBtn.title = "Expand/Contract";
        expandBtn.innerHTML = '<span style="font-size:14px;">➕</span>';
        expandBtn.className = 'expand-contract-btn';
        expandBtn.addEventListener('click', function() {
            expanded = !expanded;
            if (expanded) {
                content.textContent = text;
                expandBtn.innerHTML = '<span style="font-size:14px;">➖</span>';
            } else {
                content.textContent = text.slice(0, MAX_LENGTH) + '...';
                expandBtn.innerHTML = '<span style="font-size:14px;">➕</span>';
            }
        });
    }
    actionButtons.appendChild(copyBtn);
    if (isURL) {
        const openBtn = document.createElement('button');
        openBtn.title = "Open link";
        openBtn.innerHTML = '🔗';
        openBtn.addEventListener('click', () => openURL(text));
        actionButtons.appendChild(openBtn);
    }
    if (expandBtn) actionButtons.appendChild(expandBtn);
    actionButtons.appendChild(deleteBtn);
    if (isImage) {
        const img = document.createElement('img');
        img.src = data.content;
        img.style.maxWidth = '100%';
        img.style.height = 'auto';
        img.alt = 'Clipboard Image';
        content.innerHTML = '';
        content.appendChild(img);
    } else if (isURL) {
        content.innerHTML = `<a href="#" class="clip-link" data-url="${text}">${text}</a>`;
        item.classList.add('link-item');
        content.querySelector('a').addEventListener('click', function(e) {
            e.preventDefault();
            openURL(this.getAttribute('data-url'));
        });
    } else if (typeof text === 'string' && text.length > MAX_LENGTH) {
        content.textContent = text.slice(0, MAX_LENGTH) + '...';
    } else {
        content.textContent = text;
    }
    contentWrapper.appendChild(content);
    item.appendChild(contentWrapper);
    item.appendChild(actionButtons);
    if (insertOnTop) {
        document.getElementById('clipboard-items').insertBefore(item, document.getElementById('clipboard-items').firstChild);
    } else {
        document.getElementById('clipboard-items').appendChild(item);
    }
}

export function loadClipboardItems() {
    try {
        const items = JSON.parse(localStorage.getItem('clipboardCollectionItems') || '[]');
        // Show latest first (LIFO)
        items.reverse().forEach(item => createClipboardItem(item));
    } catch (error) {
        localStorage.removeItem('clipboardCollectionItems');
    }
}

export function saveClipboardItems() {
    const items = [];
    document.querySelectorAll('.clipboard-item').forEach(item => {
        const img = item.querySelector('img');
        if (img) {
            items.push({ type: 'image', content: img.src });
        } else {
            const link = item.querySelector('.clip-link');
            if (link) {
                items.push({ type: 'link', content: link.getAttribute('data-url') });
            } else {
                items.push({ type: 'text', content: item.querySelector('p').textContent });
            }
        }
    });
    localStorage.setItem('clipboardCollectionItems', JSON.stringify(items));
}

export function loadClipboardItemsFromDB(collectionName) {
    const isElectron = window.navigator.userAgent.toLowerCase().indexOf('electron') > -1;
    let ipcRenderer;
    if (isElectron) {
        try {
            ipcRenderer = window.require('electron').ipcRenderer;
        } catch {}
    }
    // Clear current items
    const clipboardItems = document.getElementById('clipboard-items');
    if (clipboardItems) clipboardItems.innerHTML = '';
    if (isElectron && ipcRenderer && collectionName) {
        ipcRenderer.invoke('get-clipboard-items', collectionName).then(res => {
            if (res.success) {
                res.items.sort((a, b) => b.id - a.id).forEach(item => {
                    if (item.type === 'image') {
                        createClipboardItem({ 
                            id: item.id, 
                            type: 'image', 
                            content: item.content 
                        }, false);
                    } else if (item.type === 'link') {
                        createClipboardItem({ 
                            id: item.id, 
                            type: 'link', 
                            content: item.content 
                        }, false);
                    } else if (item.type === 'text') {
                        createClipboardItem({ 
                            id: item.id, 
                            type: 'text', 
                            content: item.content 
                        }, false);
                    }
                });
            } else {
                import('./utils.js').then(({ showNotification }) => showNotification('DB error: ' + res.error));
            }
        });
    }
}

function openURL(url) {
    const isElectron = window.navigator.userAgent.toLowerCase().indexOf('electron') > -1;
    let ipcRenderer;
    if (isElectron) {
        try {
            ipcRenderer = window.require('electron').ipcRenderer;
        } catch {}
    }
    if (isElectron && ipcRenderer) {
        ipcRenderer.send('open-url', url);
        import('./utils.js').then(({ showNotification }) => showNotification('Opening link in browser...'));
    } else {
        window.open(url, '_blank');
    }
}

function copyToClipboard(text) {
    const isElectron = window.navigator.userAgent.toLowerCase().indexOf('electron') > -1;
    let ipcRenderer;
    if (isElectron) {
        try {
            ipcRenderer = window.require('electron').ipcRenderer;
        } catch {}
    }
    if (isElectron && ipcRenderer) {
        ipcRenderer.send('copy-to-clipboard', text);
        import('./utils.js').then(({ showNotification }) => showNotification('Copied to clipboard!'));
    } else {
        navigator.clipboard.writeText(text).then(() => {
            import('./utils.js').then(({ showNotification }) => showNotification('Copied to clipboard!'));
        }).catch(err => {
            import('./utils.js').then(({ showNotification }) => showNotification('Failed to copy. Please try again.'));
        });
    }
}