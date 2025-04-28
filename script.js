document.addEventListener('DOMContentLoaded', function() {
    // Check if running in Electron
    const isElectron = window.navigator.userAgent.toLowerCase().indexOf('electron') > -1;
    
    // Import electron modules if available
    let ipcRenderer;
    if (isElectron) {
        try {
            ipcRenderer = window.require('electron').ipcRenderer;
        } catch (error) {
            console.warn('Unable to require electron modules:', error);
        }
    }

    // Get DOM elements
    const clipboardOverlay = document.getElementById('clipboard-overlay');
    const overlayHeader = document.querySelector('.overlay-header');
    const minimizeBtn = document.getElementById('minimize-btn');
    const closeBtn = document.getElementById('close-btn');
    const restoreBtn = document.getElementById('restore-btn');
    const clipboardItems = document.getElementById('clipboard-items');
    const newClipTextarea = document.getElementById('new-clip');
    const addBtn = document.getElementById('add-btn');

    // Local storage key
    const STORAGE_KEY = 'clipboardCollectionItems';
    const urlRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/i;

    // Initialize with stored clipboard items
    if (isElectron && ipcRenderer) {
        loadClipboardItemsFromDB();
    } else {
        loadClipboardItems();
    }

    // Drag functionality - only used in browser mode
    // In Electron, we use the -webkit-app-region CSS property
    if (!isElectron) {
        let isDragging = false;
        let currentX;
        let currentY;
        let initialX;
        let initialY;
        let xOffset = 0;
        let yOffset = 0;
        
        overlayHeader.addEventListener('mousedown', dragStart);
        document.addEventListener('mouseup', dragEnd);
        document.addEventListener('mousemove', drag);
        
        function dragStart(e) {
            initialX = e.clientX - xOffset;
            initialY = e.clientY - yOffset;

            if (e.target === overlayHeader || e.target.parentNode === overlayHeader) {
                isDragging = true;
            }
        }

        function dragEnd() {
            initialX = currentX;
            initialY = currentY;
            isDragging = false;
        }

        function drag(e) {
            if (isDragging) {
                e.preventDefault();
                
                currentX = e.clientX - initialX;
                currentY = e.clientY - initialY;

                xOffset = currentX;
                yOffset = currentY;

                setTranslate(currentX, currentY, clipboardOverlay);
            }
        }

        function setTranslate(xPos, yPos, el) {
            el.style.transform = `translate3d(${xPos}px, ${yPos}px, 0)`;
        }
    }

    // Button event listeners
    minimizeBtn.addEventListener('click', () => {
        if (isElectron && ipcRenderer) {
            ipcRenderer.send('minimize-window');
        } else {
            minimizeOverlay();
        }
    });
    
    closeBtn.addEventListener('click', () => {
        if (isElectron && ipcRenderer) {
            ipcRenderer.send('hide-window');
        } else {
            closeOverlay();
        }
    });
    
    restoreBtn.addEventListener('click', restoreOverlay);
    addBtn.addEventListener('click', addClipboardItem);

    // Add item when pressing Ctrl+Enter in textarea
    newClipTextarea.addEventListener('keydown', function(e) {
        if (e.ctrlKey && e.key === 'Enter') {
            addClipboardItem();
        }
    });

    // Handle image paste
    newClipTextarea.addEventListener('paste', function(e) {
        if (e.clipboardData && e.clipboardData.items) {
            for (let i = 0; i < e.clipboardData.items.length; i++) {
                const item = e.clipboardData.items[i];
                if (item.type.indexOf('image') !== -1) {
                    const file = item.getAsFile();
                    const reader = new FileReader();
                    reader.onload = function(event) {
                        const imageDataUrl = event.target.result;
                        if (isElectron && ipcRenderer) {
                            // Extract base64 part for DB
                            const base64 = imageDataUrl.split(',')[1];
                            ipcRenderer.invoke('save-clipboard-item', { type: 'image', content: imageDataUrl, imageData: base64 }).then(res => {
                                if (res.success) {
                                    createClipboardItem({ type: 'image', content: imageDataUrl });
                                    showNotification('Image saved to database!');
                                } else {
                                    showNotification('DB error: ' + res.error);
                                }
                            });
                        } else {
                            createClipboardItem({ type: 'image', content: imageDataUrl });
                            saveClipboardItems();
                        }
                    };
                    reader.readAsDataURL(file);
                    e.preventDefault();
                    break;
                }
            }
        }
    });

    // Browser-only functions
    function minimizeOverlay() {
        clipboardOverlay.classList.add('minimized');
        restoreBtn.classList.remove('hidden');
    }

    function closeOverlay() {
        clipboardOverlay.classList.add('hidden');
    }

    function restoreOverlay() {
        clipboardOverlay.classList.remove('minimized', 'hidden');
        restoreBtn.classList.add('hidden');
    }

    function addClipboardItem() {
        const clipText = newClipTextarea.value.trim();
        if (clipText) {
            if (isElectron && ipcRenderer) {
                // Save to DB via IPC
                ipcRenderer.invoke('save-clipboard-item', { type: urlRegex.test(clipText) ? 'link' : 'text', content: clipText }).then(res => {
                    if (res.success) {
                        createClipboardItem(clipText);
                        newClipTextarea.value = '';
                        showNotification('Saved to database!');
                    } else {
                        showNotification('DB error: ' + res.error);
                    }
                });
            } else {
                createClipboardItem(clipText);
                saveClipboardItems();
                newClipTextarea.value = '';
            }
        }
    }

    function createClipboardItem(data) {
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
                            showNotification('Image copied to clipboard!');
                        });
                } else {
                    showNotification('Image copy not supported in this browser.');
                }
            });
        } else {
            copyBtn.addEventListener('click', () => copyToClipboard(text));
        }
        const deleteBtn = document.createElement('button');
        deleteBtn.title = "Delete";
        deleteBtn.innerHTML = '🗑️';
        deleteBtn.addEventListener('click', async () => {
            if (isElectron && ipcRenderer && item.dataset.id) {
                const res = await ipcRenderer.invoke('delete-clipboard-item', item.dataset.id);
                if (res.success) {
                    item.remove();
                } else {
                    showNotification('Failed to delete from DB: ' + res.error);
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
        clipboardItems.insertBefore(item, clipboardItems.firstChild);
    }

    function openURL(url) {
        if (isElectron && ipcRenderer) {
            // Use Electron's shell.openExternal through IPC
            ipcRenderer.send('open-url', url);
            showNotification('Opening link in browser...');
        } else {
            // Fallback for browser environment
            window.open(url, '_blank');
        }
    }

    function copyToClipboard(text) {
        if (isElectron && ipcRenderer) {
            ipcRenderer.send('copy-to-clipboard', text);
            showNotification('Copied to clipboard!');
        } else {
            navigator.clipboard.writeText(text).then(() => {
                showNotification('Copied to clipboard!');
            }).catch(err => {
                showNotification('Failed to copy. Please try again.');
                console.error('Failed to copy text: ', err);
            });
        }
    }

    // Rest of the functions remain the same
    function showNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        notification.style.position = 'fixed';
        notification.style.bottom = '10px';
        notification.style.left = '50%';
        notification.style.transform = 'translateX(-50%)';
        notification.style.backgroundColor = '#4a86e8';
        notification.style.color = 'white';
        notification.style.padding = '8px 16px';
        notification.style.borderRadius = '4px';
        notification.style.zIndex = '2000';
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.3s ease-in-out';
        
        document.body.appendChild(notification);
        
        // Fade in
        setTimeout(() => {
            notification.style.opacity = '1';
        }, 10);
        
        // Remove after delay
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 2000);
    }

    function saveClipboardItems() {
        if (isElectron && ipcRenderer) {
            // No-op: handled by DB
            return;
        }
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
        localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    }
    function loadClipboardItems() {
        try {
            const items = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
            items.forEach(item => createClipboardItem(item));
        } catch (error) {
            console.error('Error loading clipboard items:', error);
            localStorage.removeItem(STORAGE_KEY);
        }
    }

    function loadClipboardItemsFromDB() {
        if (isElectron && ipcRenderer) {
            ipcRenderer.invoke('get-clipboard-items').then(res => {
                if (res.success) {
                    res.items.forEach(item => {
                        if (item.type === 'image' && item.image_data) {
                            // Use the image_data as a data URL
                            createClipboardItem({ id: item.id, type: 'image', content: `data:image/png;base64,${item.image_data}` });
                        } else if (item.type === 'link') {
                            createClipboardItem({ id: item.id, type: 'link', content: item.content });
                        } else if (item.type === 'text') {
                            createClipboardItem({ id: item.id, type: 'text', content: item.content });
                        }
                    });
                } else {
                    showNotification('DB error: ' + res.error);
                }
            });
        }
    }
});