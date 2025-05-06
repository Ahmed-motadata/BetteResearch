import { createClipboardItem, loadClipboardItems, loadClipboardItemsFromDB, saveClipboardItems } from './clipboard.js';
import { showNotification } from '../renderer/utils.js';




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

    // Add after getting newClipTextarea
    const newClipTitle = document.createElement('input');
    newClipTitle.type = 'text';
    newClipTitle.placeholder = 'Add title (optional)';
    newClipTitle.className = 'clip-title-input';
    newClipTitle.style.display = 'block';
    newClipTitle.style.width = '100%';
    newClipTitle.style.marginBottom = '4px';
    newClipTitle.style.fontSize = '13px';
    newClipTitle.style.border = '1px solid #e0e0e0';
    newClipTitle.style.borderRadius = '4px';
    newClipTitle.style.padding = '3px 8px';
    newClipTitle.style.background = '#fafbfc';
    newClipTitle.style.color = '#444';
    newClipTextarea.parentNode.insertBefore(newClipTitle, newClipTextarea);

    // Local storage key
    const STORAGE_KEY = 'clipboardCollectionItems';
    const urlRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/i;

    // Initialize with stored clipboard items
    if (isElectron && ipcRenderer) {
        // loadClipboardItemsFromDB(); // REMOVE this line, let loadCollections handle initial load
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
        // Removed Ctrl+Shift+Spacebar shortcut
    });

    // Handle image paste
    newClipTextarea.addEventListener('paste', function(e) {
        console.log('Paste event detected');
        if (e.clipboardData && e.clipboardData.items) {
            for (let i = 0; i < e.clipboardData.items.length; i++) {
                const item = e.clipboardData.items[i];
                console.log('Clipboard item type:', item.type);
                if (item.type.indexOf('image') !== -1) {
                    const file = item.getAsFile();
                    const reader = new FileReader();
                    reader.onload = function(event) {
                        const imageDataUrl = event.target.result;
                        // Always use the currently open collection (do not fallback to default_collection)
                        if (isElectron && ipcRenderer && currentCollection && currentCollection.name) {
                            // Extract base64 part for DB
                            const base64 = imageDataUrl.split(',')[1];
                            // Get the current title input value (if any)
                            const currentTitleInput = document.querySelector('.clip-title-input');
                            const clipTitle = currentTitleInput ? currentTitleInput.value.trim() : '';
                            ipcRenderer.invoke('save-clipboard-item', {
                                type: 'image',
                                content: imageDataUrl,
                                imageData: base64,
                                title: clipTitle || undefined,
                                collectionName: currentCollection.name
                            }).then(res => {
                                if (res.success) {
                                    // Always reload the list from DB to show the new image with title bar
                                    newClipTextarea.value = '';
                                    if (currentTitleInput) currentTitleInput.value = '';
                                    loadClipboardItemsFromDB(currentCollection.name);
                                    showNotification('Image saved to clipboard!');
                                } else {
                                    console.error('Failed to save image:', res.error);
                                    showNotification('DB error: ' + res.error);
                                }
                            }).catch(err => {
                                console.error('Error saving image:', err);
                                showNotification('Error saving image: ' + (err.message || 'Unknown error'));
                            });
                        } else {
                            // For browser mode, use the same logic and pass the title
                            const currentTitleInput = document.querySelector('.clip-title-input');
                            const clipTitle = currentTitleInput ? currentTitleInput.value.trim() : '';
                            createClipboardItem({ type: 'image', content: imageDataUrl, title: clipTitle || undefined });
                            saveClipboardItems();
                            newClipTextarea.value = '';
                            if (currentTitleInput) currentTitleInput.value = '';
                            showNotification('Image copied to clipboard!');
                        }
                    };
                    reader.onerror = function(error) {
                        console.error('FileReader error:', error);
                        showNotification('Error reading image from clipboard');
                    };
                    reader.readAsDataURL(file);
                    e.preventDefault();
                    break;
                }
            }
        } else {
            console.log('No clipboard data or items available');
        }
    });

    // --- Collection Navigation Logic ---
    let collections = [];
    let currentCollectionIndex = 0;
    let currentCollection = null;

    function updateCollectionHeader() {
        const nameSpan = document.getElementById('collection-name');
        nameSpan.textContent = currentCollection ? currentCollection.name : '';
    }

    function ensureTitleInput() {
        // Remove any existing title input
        const oldTitleInput = document.querySelector('.clip-title-input');
        if (oldTitleInput && oldTitleInput.parentNode) {
            oldTitleInput.parentNode.removeChild(oldTitleInput);
        }
        // Insert the title input into the .input-row, before the Chat with AI button
        const inputRow = document.querySelector('.input-row');
        if (inputRow) {
            const newClipTitle = document.createElement('input');
            newClipTitle.type = 'text';
            newClipTitle.placeholder = 'Add title (optional)';
            newClipTitle.className = 'clip-title-input';
            // Remove all inline styles so CSS flexbox applies
            inputRow.insertBefore(newClipTitle, inputRow.querySelector('#ai-chat-btn'));
            newClipTitle.value = '';
        }
    }

    async function loadCollections() {
        const isElectron = window.navigator.userAgent.toLowerCase().indexOf('electron') > -1;
        let ipcRenderer;
        if (isElectron) {
            try {
                ipcRenderer = window.require('electron').ipcRenderer;
            } catch {}
        }
        if (isElectron && ipcRenderer) {
            const res = await ipcRenderer.invoke('get-collections');
            if (res.success && res.collections.length > 0) {
                // Filter out 'default' collection
                collections = res.collections.filter(c => c.name.toLowerCase() !== 'default');
                // Restore last used collection from localStorage, else use first
                const last = localStorage.getItem('currentCollection');
                currentCollectionIndex = Math.max(0, collections.findIndex(c => c.name === last));
                if (currentCollectionIndex === -1) currentCollectionIndex = 0;
                currentCollection = collections[currentCollectionIndex];
                updateCollectionHeader();
                ensureTitleInput();
                loadClipboardItemsFromDB(currentCollection.name);
            } else if (res.success && res.collections.length === 0) {
                collections = [];
                currentCollection = null;
                updateCollectionHeader();
                ensureTitleInput();
                loadClipboardItemsFromDB(null); // Show empty
            }
        }
    }

    document.getElementById('collection-left').onclick = () => {
        if (!collections.length || currentCollectionIndex === 0) return;
        currentCollectionIndex--;
        currentCollection = collections[currentCollectionIndex];
        localStorage.setItem('currentCollection', currentCollection.name);
        updateCollectionHeader();
        ensureTitleInput();
        loadClipboardItemsFromDB(currentCollection.name);
    };
    document.getElementById('collection-right').onclick = () => {
        if (!collections.length || currentCollectionIndex === collections.length - 1) return;
        currentCollectionIndex++;
        currentCollection = collections[currentCollectionIndex];
        localStorage.setItem('currentCollection', currentCollection.name);
        updateCollectionHeader();
        ensureTitleInput();
        loadClipboardItemsFromDB(currentCollection.name);
    };

    // --- Collection Creation Modal ---
    const collectionModal = document.createElement('div');
    collectionModal.id = 'collection-modal';
    collectionModal.className = 'collection-modal hidden';
    collectionModal.innerHTML = `
        <div class="collection-modal-content">
            <h4>Create New Collection</h4>
            <input id="collection-modal-input" type="text" placeholder="Collection name" maxlength="64" autofocus />
            <div class="collection-modal-actions">
                <button id="collection-modal-cancel">Cancel</button>
                <button id="collection-modal-create">Create</button>
            </div>
        </div>
    `;
    document.body.appendChild(collectionModal);

    function showCollectionModal() {
        collectionModal.classList.remove('hidden');
        document.getElementById('collection-modal-input').value = '';
        document.getElementById('collection-modal-input').focus();
    }
    function hideCollectionModal() {
        collectionModal.classList.add('hidden');
    }

    document.getElementById('collection-new').onclick = () => {
        showCollectionModal();
    };
    document.getElementById('collection-modal-cancel').onclick = hideCollectionModal;
    document.getElementById('collection-modal-create').onclick = async () => {
        const name = document.getElementById('collection-modal-input').value.trim();
        if (!name) return;
        const isElectron = window.navigator.userAgent.toLowerCase().indexOf('electron') > -1;
        let ipcRenderer;
        if (isElectron) {
            try {
                ipcRenderer = window.require('electron').ipcRenderer;
            } catch (error) {
                console.warn('Unable to require electron modules:', error);
            }
        }
        if (isElectron && ipcRenderer) {
            const res = await ipcRenderer.invoke('create-collection', name);
            if (res.success) {
                await loadCollections();
                ensureTitleInput(); // Ensure title input is present for the new collection
                showNotification('Collection created!');
                hideCollectionModal();
                loadClipboardItemsFromDB(name); // Show empty for new collection
            } else {
                showNotification('Error: ' + res.error);
            }
        }
    };
    document.getElementById('collection-modal-input').addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            document.getElementById('collection-modal-create').click();
        } else if (e.key === 'Escape') {
            hideCollectionModal();
        }
    });

    // --- Collection Delete Modal ---
    const deleteModal = document.createElement('div');
    deleteModal.id = 'collection-delete-modal';
    deleteModal.className = 'collection-modal hidden';
    deleteModal.innerHTML = `
        <div class="collection-modal-content">
            <h4>Delete Collection</h4>
            <div id="collection-delete-modal-msg" style="margin-bottom:10px;font-size:14px;color:#444;text-align:center;"></div>
            <div class="collection-modal-actions">
                <button id="collection-delete-cancel">Cancel</button>
                <button id="collection-delete-confirm" style="background:#d32f2f;color:#fff;">Delete</button>
            </div>
        </div>
    `;
    document.body.appendChild(deleteModal);

    function showDeleteModal(collectionName) {
        document.getElementById('collection-delete-modal-msg').textContent = `Are you sure you want to delete "${collectionName}"? This cannot be undone.`;
        deleteModal.classList.remove('hidden');
    }
    function hideDeleteModal() {
        deleteModal.classList.add('hidden');
    }

    document.getElementById('collection-delete').onclick = () => {
        if (!currentCollection) return;
        showDeleteModal(currentCollection.name);
    };
    document.getElementById('collection-delete-cancel').onclick = hideDeleteModal;
    document.getElementById('collection-delete-confirm').onclick = async () => {
        if (!currentCollection) return;
        const isElectron = window.navigator.userAgent.toLowerCase().indexOf('electron') > -1;
        let ipcRenderer;
        if (isElectron) {
            try {
                ipcRenderer = window.require('electron').ipcRenderer;
            } catch (error) {
                console.warn('Unable to require electron modules:', error);
            }
        }
        if (isElectron && ipcRenderer) {
            const res = await ipcRenderer.invoke('delete-collection', currentCollection.name);
            if (res.success) {
                await loadCollections();
                showNotification('Collection deleted!');
                hideDeleteModal();
            } else {
                showNotification('Error: ' + res.error);
            }
        }
    };
    // Allow Esc to close delete modal
    deleteModal.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') hideDeleteModal();
    });

    // Call loadCollections on startup
    if (isElectron && ipcRenderer) {
        loadCollections();
    }

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
        const currentTitleInput = document.querySelector('.clip-title-input');
        const clipTitle = currentTitleInput ? currentTitleInput.value.trim() : '';
        if (clipText) {
            if (isElectron && ipcRenderer) {
                ipcRenderer.invoke('save-clipboard-item', {
                    type: urlRegex.test(clipText) ? 'link' : 'text',
                    content: clipText,
                    title: clipTitle || undefined,
                    collectionName: currentCollection ? currentCollection.name : null
                }).then(res => {
                    if (res.success) {
                        // Instead of just createClipboardItem, reload the list from DB
                        newClipTextarea.value = '';
                        if (currentTitleInput) currentTitleInput.value = '';
                        loadClipboardItemsFromDB(currentCollection.name);
                        showNotification('Saved to database!');
                    } else {
                        showNotification('DB error: ' + res.error);
                    }
                });
            } else {
                createClipboardItem({ type: urlRegex.test(clipText) ? 'link' : 'text', content: clipText, title: clipTitle || undefined });
                saveClipboardItems();
                newClipTextarea.value = '';
                if (currentTitleInput) currentTitleInput.value = '';
            }
        }
    }

    // Clipboard logic is now handled by clipboard.js
    // Only delegate to clipboard.js functions here

    // --- Chat with AI popout toggle ---
    const aiChatBtn = document.getElementById('ai-chat-btn');
    const aiChatIndicator = aiChatBtn ? aiChatBtn.querySelector('.ai-chat-indicator') : null;
    if (aiChatBtn && isElectron && ipcRenderer) {
        aiChatBtn.addEventListener('click', () => {
            ipcRenderer.send('toggle-ai-chat');
        });
        if (aiChatIndicator) {
            aiChatIndicator.setAttribute('fill', '#ff4136'); // red
            ipcRenderer.on('ai-chat-closed', () => {
                aiChatIndicator.setAttribute('fill', '#ff4136'); // red
            });
            ipcRenderer.on('ai-chat-opened', () => {
                aiChatIndicator.setAttribute('fill', '#2ecc40'); // green
            });
        }
    }

    // --- Settings Button & Dark Mode ---
    const settingsBtn = document.getElementById('settings-btn');
    const settingsDropdown = document.getElementById('settings-dropdown');
    const darkModeToggle = document.getElementById('dark-mode-toggle');

    // Show/hide settings dropdown
    settingsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        settingsDropdown.classList.toggle('hidden');
    });
    // Hide dropdown when clicking outside
    document.addEventListener('mousedown', (e) => {
        if (!settingsDropdown.classList.contains('hidden') && !settingsDropdown.contains(e.target) && e.target !== settingsBtn) {
            settingsDropdown.classList.add('hidden');
        }
    });
    // Dark mode toggle logic
    function setDarkMode(enabled) {
        if (enabled) {
            document.body.classList.add('dark-mode');
            localStorage.setItem('darkMode', '1');
        } else {
            document.body.classList.remove('dark-mode');
            localStorage.setItem('darkMode', '0');
        }
    }
    darkModeToggle.addEventListener('change', (e) => {
        setDarkMode(e.target.checked);
    });
    // On load, apply dark mode if set
    if (localStorage.getItem('darkMode') === '1') {
        darkModeToggle.checked = true;
        setDarkMode(true);
    }
});