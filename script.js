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
    loadClipboardItems();

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
            createClipboardItem(clipText);
            saveClipboardItems();
            newClipTextarea.value = '';
        }
    }

    function createClipboardItem(text) {
        // Create clipboard item container
        const item = document.createElement('div');
        item.className = 'clipboard-item';
        
        // Create clipboard content
        const content = document.createElement('p');
        
        // Check if the text is a URL
        const isURL = urlRegex.test(text.trim());
        
        if (isURL) {
            // Create a clickable link for URLs
            content.innerHTML = `<a href="#" class="clip-link" data-url="${text}">
                <span class="material-icons-outlined" style="font-size: 14px; vertical-align: middle; margin-right: 4px;">link</span>
                ${text}
            </a>`;
            item.classList.add('link-item');
            
            // Add event listener to open the URL
            content.querySelector('a').addEventListener('click', function(e) {
                e.preventDefault();
                openURL(this.getAttribute('data-url'));
            });
        } else {
            // Regular text content
            content.textContent = text;
        }
        
        // Create action buttons
        const actionButtons = document.createElement('div');
        actionButtons.className = 'action-buttons';
        
        const copyBtn = document.createElement('button');
        copyBtn.title = "Copy to clipboard";
        copyBtn.innerHTML = '📋';
        copyBtn.addEventListener('click', () => copyToClipboard(text));
        
        const deleteBtn = document.createElement('button');
        deleteBtn.title = "Delete";
        deleteBtn.innerHTML = '🗑️';
        deleteBtn.addEventListener('click', () => {
            item.remove();
            saveClipboardItems();
        });
        
        // Append elements
        actionButtons.appendChild(copyBtn);
        
        // Add open link button for URLs
        if (isURL) {
            const openBtn = document.createElement('button');
            openBtn.title = "Open link";
            openBtn.innerHTML = '🔗';
            openBtn.addEventListener('click', () => openURL(text));
            actionButtons.appendChild(openBtn);
        }
        
        actionButtons.appendChild(deleteBtn);
        
        item.appendChild(content);
        item.appendChild(actionButtons);
        
        // Add item to the list (prepend to show newest items at the top)
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
        const items = [];
        document.querySelectorAll('.clipboard-item p').forEach(item => {
            const link = item.querySelector('.clip-link');
            if (link) {
                items.push(link.getAttribute('data-url'));
            } else {
                items.push(item.textContent);
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
});