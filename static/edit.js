
// Critical: Track if user is actively typing
let isTyping = false;
let typingTimeout = null;
let pendingRemoteUpdate = null;

// Get cursor position in characters
function getCursorPosition() {
    const selection = window.getSelection();
    if (selection.rangeCount === 0) return 0;
    
    const range = selection.getRangeAt(0);
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(editor);
    preCaretRange.setEnd(range.startContainer, range.startOffset);
    
    return preCaretRange.toString().length;
}

// Set cursor position by character offset
function setCursorPosition(offset) {
    const selection = window.getSelection();
    const range = document.createRange();
    
    let charCount = 0;
    const walker = document.createTreeWalker(
        editor,
        NodeFilter.SHOW_TEXT,
        null,
        false
    );
    
    let node;
    while (node = walker.nextNode()) {
        const nodeLength = node.textContent.length;
        
        if (charCount + nodeLength >= offset) {
            const offsetInNode = offset - charCount;
            try {
                range.setStart(node, Math.min(offsetInNode, nodeLength));
                range.collapse(true);
                selection.removeAllRanges();
                selection.addRange(range);
                return;
            } catch (e) {
                console.warn('Could not set cursor:', e);
            }
        }
        charCount += nodeLength;
    }
    
    // Fallback: set to end
    try {
        range.selectNodeContents(editor);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
    } catch (e) {
        // Ignore
    }
}

// Diff algorithm
function getTextDiff(oldText, newText) {
    let start = 0;
    let oldEnd = oldText.length;
    let newEnd = newText.length;
    
    // Find common prefix
    while (start < oldEnd && start < newEnd && oldText[start] === newText[start]) {
        start++;
    }
    
    // Find common suffix
    while (oldEnd > start && newEnd > start && oldText[oldEnd - 1] === newText[newEnd - 1]) {
        oldEnd--;
        newEnd--;
    }
    
    return {
        start: start,
        end: oldEnd,
        removed: oldText.substring(start, oldEnd),
        inserted: newText.substring(start, newEnd)
    };
}

function connectWebSocket() {
    ws = new WebSocket(wsUrl);

    ws.onopen = function(e) {
        console.log('[v3] WebSocket connection established');
        showNotification('Connected to document', 'success');
    };

    ws.onmessage = function(e) {
        const data = JSON.parse(e.data);
        console.log('[v3] Received message:', data.type);

        switch(data.type) {
            case 'document_load':
                handleDocumentLoad(data);
                break;
            case 'edit':
                handleEdit(data);
                break;
            case 'user_joined':
                handleUserJoined(data);
                break;
            case 'user_left':
                handleUserLeft(data);
                break;
            case 'cursor':
                handleCursor(data);
                break;
            case 'comment':
                handleComment(data);
                break;
            default:
                console.log('[v3] Unknown message type:', data.type);
        }
    };

    ws.onerror = function(error) {
        console.error('[v3] WebSocket error:', error);
        showNotification('Connection error', 'error');
    };

    ws.onclose = function(e) {
        console.log('[v3] WebSocket connection closed');
        showNotification('Disconnected. Reconnecting...', 'warning');
        setTimeout(connectWebSocket, 3000);
    };
}

function handleDocumentLoad(data) {
    const content = renderContent(data.content);
    editor.textContent = content;
    lastContent = content;
    
    if (data.active_users) {
        activeUsers.clear();
        data.active_users.forEach(user => {
            activeUsers.add(user.id);
        });
        updateActiveUsersDisplay();
    }
    
    setTimeout(() => {
        editor.focus();
    }, 100);
}

function handleEdit(data) {
    // Don't apply our own edits
    if (data.user_id === currentUserId) return;
    
    const newContent = renderContent(data.content);
    
    // CRITICAL: If user is actively typing, queue the update
    if (isTyping || isComposing) {
        console.log('[v3] User is typing, queuing remote update');
        pendingRemoteUpdate = { content: newContent, username: data.username };
        return;
    }
    
    // Apply immediately if not typing
    applyRemoteUpdate(newContent, data.username);
}

function applyRemoteUpdate(newContent, username) {
    const currentContent = editor.textContent;
    
    if (currentContent === newContent) return;
    
    // Save cursor position
    const cursorPos = getCursorPosition();
    
    // Calculate diff
    const diff = getTextDiff(currentContent, newContent);
    
    // Adjust cursor based on where the change happened
    let newCursorPos = cursorPos;
    
    if (diff.start < cursorPos) {
        const removedLength = diff.end - diff.start;
        const insertedLength = diff.inserted.length;
        const delta = insertedLength - removedLength;
        
        if (diff.end <= cursorPos) {
            // Change is completely before cursor
            newCursorPos = cursorPos + delta;
        } else {
            // Change overlaps cursor - move cursor to end of insertion
            newCursorPos = diff.start + insertedLength;
        }
    }
    
    // Apply the change
    isRemoteChange = true;
    
    // Use a single atomic update
    const beforeChange = currentContent.substring(0, diff.start);
    const afterChange = currentContent.substring(diff.end);
    const newText = beforeChange + diff.inserted + afterChange;
    
    editor.textContent = newText;
    lastContent = newText;
    
    // Restore cursor
    setCursorPosition(newCursorPos);
    
    isRemoteChange = false;
    
    if (username) {
        showNotification(`${username} edited`, 'info', 1000);
    }
}

// Check for pending updates after user stops typing
function checkPendingUpdates() {
    if (!isTyping && !isComposing && pendingRemoteUpdate) {
        console.log('[v3] Applying pending remote update');
        const update = pendingRemoteUpdate;
        pendingRemoteUpdate = null;
        applyRemoteUpdate(update.content, update.username);
    }
}

function initializeEditor() {
    editor.setAttribute('contenteditable', 'true');
    editor.setAttribute('spellcheck', 'false'); // Disable spellcheck for better performance
    editor.style.minHeight = '500px';
    editor.style.border = '1px solid #ccc';
    editor.style.padding = '10px';
    editor.style.outline = 'none';
    editor.style.whiteSpace = 'pre-wrap';
    editor.style.wordWrap = 'break-word';
    editor.style.fontFamily = 'monospace';
    editor.style.fontSize = '14px';
    editor.style.lineHeight = '1.5';
}

function handleUserJoined(data) {
    if (data.user_id) {
        activeUsers.add(data.user_id);
        updateActiveUsersDisplay();
    }
    if (data.username) {
        showNotification(`${data.username} joined`, 'info', 2000);
    }
}

function handleUserLeft(data) {
    if (data.user_id) {
        activeUsers.delete(data.user_id);
        updateActiveUsersDisplay();
    }
    if (data.username) {
        showNotification(`${data.username} left`, 'info', 2000);
    }
}

function handleCursor(data) {
    showCursor(data.username, data.position);
}

function handleComment(data) {
    addCommentToSidebar(data.username, data.content, data.position);
}

function updateActiveUsersDisplay() {
    const activeUsersDiv = document.getElementById('active-users');
    if (!activeUsersDiv) return;
    
    activeUsersDiv.innerHTML = `
        <div class="text-sm font-medium text-gray-700">
            Online Users: ${activeUsers.size}
        </div>
    `;
}

// Input handling with IME support
let inputDebounceTimer;

editor.addEventListener('compositionstart', () => {
    isComposing = true;
    console.log('[v3] Composition started');
});

editor.addEventListener('compositionend', () => {
    isComposing = false;
    console.log('[v3] Composition ended');
    // Check for pending updates after a short delay
    setTimeout(checkPendingUpdates, 100);
    handleEditorChange();
});

// Track typing state
editor.addEventListener('beforeinput', (e) => {
    if (isRemoteChange) return;
    
    // User is about to type
    isTyping = true;
    
    // Reset the typing timeout
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
        isTyping = false;
        console.log('[v3] User stopped typing');
        // Check for pending updates
        checkPendingUpdates();
    }, 500); // Wait 500ms after last keystroke before allowing remote updates
});

editor.addEventListener('input', (e) => {
    if (isComposing || isRemoteChange) return;
    
    // User is typing
    isTyping = true;
    
    // Reset the typing timeout
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
        isTyping = false;
        console.log('[v3] User stopped typing');
        checkPendingUpdates();
    }, 500);
    
    handleEditorChange();
});

function handleEditorChange() {
    if (isRemoteChange) return;
    
    clearTimeout(inputDebounceTimer);
    inputDebounceTimer = setTimeout(() => {
        sendContentUpdate();
    }, 200); // Slightly longer debounce for better batching
}

// Cursor position tracking
let cursorDebounceTimer;

editor.addEventListener('click', () => {
    clearTimeout(cursorDebounceTimer);
    cursorDebounceTimer = setTimeout(sendCursorPosition, 150);
});

editor.addEventListener('keyup', (e) => {
    // Only send cursor position for navigation keys
    if (e.key.startsWith('Arrow') || e.key === 'Home' || e.key === 'End' || 
        e.key === 'PageUp' || e.key === 'PageDown') {
        clearTimeout(cursorDebounceTimer);
        cursorDebounceTimer = setTimeout(sendCursorPosition, 150);
    }
});

function sendContentUpdate() {
    if (!ws || ws.readyState !== WebSocket.OPEN || isRemoteChange) return;
    
    const currentContent = editor.textContent;
    
    if (currentContent !== lastContent) {
        ws.send(JSON.stringify({
            type: 'edit',
            content: currentContent,
        }));
        
        lastContent = currentContent;
        
        clearTimeout(autoSaveTimer);
        autoSaveTimer = setTimeout(saveVersion, 30000);
    }
}

function sendCursorPosition() {
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    
    const position = getCursorPosition();
    ws.send(JSON.stringify({
        type: 'cursor',
        position: position,
    }));
}

function formatText(command) {
    if (isRemoteChange) return;
    
    document.execCommand(command, false, null);
    editor.focus();
    handleEditorChange();
}

function saveVersion() {
    fetch(`/documents/api/save-version/${documentId}/`, {
        method: 'POST',
        headers: {
            'X-CSRFToken': getCookie('csrftoken'),
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            summary: 'Auto-saved'
        })
    }).catch(error => {
        console.error('[v3] Error saving version:', error);
    });
}

function addComment() {
    const comment = prompt('Enter your comment:');
    if (comment && ws && ws.readyState === WebSocket.OPEN) {
        const position = getCursorPosition();
        ws.send(JSON.stringify({
            type: 'comment',
            content: comment,
            position: position,
        }));
    }
}

function addCommentToSidebar(username, content, position) {
    const commentsDiv = document.getElementById('comments');
    if (!commentsDiv) return;
    
    const commentEl = document.createElement('div');
    commentEl.className = 'p-2 bg-yellow-50 rounded text-sm mb-2';
    commentEl.innerHTML = `
        <p class="font-medium text-gray-900">${escapeHtml(username || 'Unknown')}</p>
        <p class="text-gray-700">${escapeHtml(content || '')}</p>
    `;
    commentsDiv.insertBefore(commentEl, commentsDiv.firstChild);
}

function showNotification(message, type = 'info', duration = 3000) {
    document.querySelectorAll('.collab-notification').forEach(n => n.remove());
    
    const notification = document.createElement('div');
    const bgColor = type === 'success' ? 'bg-green-600' : 
                   type === 'error' ? 'bg-red-600' : 
                   type === 'warning' ? 'bg-yellow-600' : 'bg-blue-600';
    
    notification.className = `collab-notification fixed top-4 right-4 ${bgColor} text-white px-4 py-2 rounded shadow-lg z-50 text-xs`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, duration);
}

function showCursor(username, position) {
    // Implement visual cursor display if needed
}

function toggleShare() {
    const modal = document.getElementById('shareModal');
    if (modal) modal.classList.toggle('hidden');
}

function closeShareModal() {
    const modal = document.getElementById('shareModal');
    if (modal) modal.classList.add('hidden');
}

function shareDocument() {
    const usernameInput = document.getElementById('shareUsername');
    const permissionSelect = document.getElementById('sharePermission');
    
    if (!usernameInput || !permissionSelect) return;
    
    const username = usernameInput.value.trim();
    const permission = permissionSelect.value;

    if (!username) {
        showNotification('Please enter a username', 'warning');
        return;
    }

    fetch(`/documents/api/share/${documentId}/`, {
        method: 'POST',
        headers: {
            'X-CSRFToken': getCookie('csrftoken'),
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            username: username,
            permission: permission
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showNotification(`Document shared with ${username}`, 'success');
            closeShareModal();
            usernameInput.value = '';
        } else {
            showNotification(data.error || 'Error sharing document', 'error');
        }
    })
    .catch(error => {
        console.error('[v3] Error sharing document:', error);
        showNotification('Error sharing document', 'error');
    });
}

function renderContent(content) {
    if (typeof content === 'string') {
        return content;
    }
    if (content && typeof content === 'object') {
        return JSON.stringify(content);
    }
    return '';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

const currentUserId = {{ request.user.id }};

document.addEventListener('DOMContentLoaded', function() {
    initializeEditor();
    connectWebSocket();
    updateActiveUsersDisplay();
});

editor.addEventListener('focus', () => {
    editor.classList.add('ring-2', 'ring-blue-500');
});

editor.addEventListener('blur', () => {
    editor.classList.remove('ring-2', 'ring-blue-500');
    // Apply any pending updates when losing focus
    isTyping = false;
    setTimeout(checkPendingUpdates, 100);
});