// ============================================================
// 💬 CHAT WIDGET - TechFix Solutions
// Widget de chat live en temps réel
// ============================================================

let chatSession = null;
let chatUser = null;
let unsubscribeMessages = null;

// ============================================================
// INITIALIZATION
// ============================================================

// Vérifier si l'utilisateur a déjà une session
window.addEventListener('load', () => {
    const savedUser = localStorage.getItem('techfix_chat_user');
    if (savedUser) {
        chatUser = JSON.parse(savedUser);
        startChatSession();
    } else {
        showAuthScreen();
    }
});

// ============================================================
// UI CONTROLS
// ============================================================

// Toggle chat window
document.getElementById('chatButton').addEventListener('click', () => {
    const chatWindow = document.getElementById('chatWindow');
    if (chatWindow.style.display === 'flex') {
        chatWindow.style.display = 'none';
    } else {
        chatWindow.style.display = 'flex';
        resetBadge();
        scrollToBottom();
    }
});

// Close chat
document.getElementById('chatClose').addEventListener('click', () => {
    document.getElementById('chatWindow').style.display = 'none';
});

// ============================================================
// AUTHENTICATION
// ============================================================

function showAuthScreen() {
    document.getElementById('chatAuth').style.display = 'block';
    document.getElementById('chatMessages').style.display = 'none';
    document.getElementById('chatInput').style.display = 'none';
}

function hideAuthScreen() {
    document.getElementById('chatAuth').style.display = 'none';
    document.getElementById('chatMessages').style.display = 'block';
    document.getElementById('chatInput').style.display = 'flex';
}

// Start chat button
document.getElementById('chatStartBtn').addEventListener('click', () => {
    const name = document.getElementById('chatUserName').value.trim();
    const email = document.getElementById('chatUserEmail').value.trim();
    
    if (!name || name.length < 2) {
        alert('Veuillez entrer votre nom (min. 2 caractères)');
        return;
    }
    
    if (!email || !email.includes('@')) {
        alert('Veuillez entrer un email valide');
        return;
    }
    
    // Sanitize inputs
    const sanitizedName = sanitizeHtml(name.substring(0, 100));
    const sanitizedEmail = sanitizeHtml(email.substring(0, 254));
    
    chatUser = {
        name: sanitizedName,
        email: sanitizedEmail,
        id: 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
    };
    
    localStorage.setItem('techfix_chat_user', JSON.stringify(chatUser));
    startChatSession();
});

// ============================================================
// CHAT SESSION
// ============================================================

async function startChatSession() {
    hideAuthScreen();
    
    try {
        // Créer ou récupérer la session
        const sessionRef = db.collection('chatSessions').doc(chatUser.id);
        const sessionDoc = await sessionRef.get();
        
        if (sessionDoc.exists) {
            chatSession = sessionDoc.id;
            await sessionRef.update({
                isOnline: true,
                lastSeen: firebase.firestore.FieldValue.serverTimestamp()
            });
        } else {
            chatSession = chatUser.id;
            await sessionRef.set({
                userId: chatUser.id,
                userName: chatUser.name,
                userEmail: chatUser.email,
                isOnline: true,
                lastSeen: firebase.firestore.FieldValue.serverTimestamp(),
                unreadCount: 0,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            // Envoyer message de bienvenue
            await sendSystemMessage('Bonjour! Un membre de notre équipe vous répondra dans quelques instants.');
        }
        
        // Charger les messages
        loadMessages();
        
    } catch (error) {
        console.error('Error starting chat session:', error);
        alert('Erreur de connexion au chat');
    }
}

// ============================================================
// MESSAGES
// ============================================================

function loadMessages() {
    if (unsubscribeMessages) {
        unsubscribeMessages();
    }
    
    const messagesDiv = document.getElementById('chatMessages');
    
    // Écouter les messages en temps réel
    unsubscribeMessages = db.collection('chatMessages')
        .where('sessionId', '==', chatSession)
        .orderBy('createdAt', 'asc')
        .onSnapshot(snapshot => {
            messagesDiv.innerHTML = '';
            
            if (snapshot.empty) {
                messagesDiv.innerHTML = '<p style="text-align:center;color:#9CA3AF;padding:20px;">Démarrez la conversation!</p>';
                return;
            }
            
            snapshot.docs.forEach(doc => {
                const data = doc.data();
                addMessageToUI(data);
            });
            
            scrollToBottom();
            
            // Marquer comme lu si fenêtre ouverte
            if (document.getElementById('chatWindow').style.display === 'flex') {
                resetUnreadCount();
            } else {
                updateBadge(snapshot.size);
            }
        });
}

function addMessageToUI(data) {
    const messagesDiv = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${data.isAdmin ? 'admin' : 'user'}`;
    
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${data.isAdmin ? 'admin' : 'user'}`;
    
    if (data.isAdmin) {
        const nameDiv = document.createElement('div');
        nameDiv.className = 'chat-name';
        nameDiv.textContent = data.userName || 'Support';
        bubble.appendChild(nameDiv);
    }
    
    const messageText = document.createElement('div');
    messageText.textContent = data.message;
    bubble.appendChild(messageText);
    
    const timeDiv = document.createElement('div');
    timeDiv.className = 'chat-time';
    timeDiv.textContent = data.createdAt ? formatChatTime(data.createdAt.toDate()) : 'À l\'instant';
    bubble.appendChild(timeDiv);
    
    messageDiv.appendChild(bubble);
    messagesDiv.appendChild(messageDiv);
}

// Send message
document.getElementById('chatSendBtn').addEventListener('click', sendMessage);
document.getElementById('chatMessageInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

async function sendMessage() {
    const input = document.getElementById('chatMessageInput');
    const message = input.value.trim();
    
    if (!message || !chatSession) return;
    
    if (message.length < 1) return;
    if (message.length > 2000) {
        alert('Message trop long (max 2000 caractères)');
        return;
    }
    
    try {
        await db.collection('chatMessages').add({
            sessionId: chatSession,
            userId: chatUser.id,
            userName: chatUser.name,
            message: sanitizeHtml(message),
            isAdmin: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Mettre à jour la session
        await db.collection('chatSessions').doc(chatSession).update({
            lastSeen: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        input.value = '';
        
    } catch (error) {
        console.error('Error sending message:', error);
        alert('Erreur lors de l\'envoi');
    }
}

async function sendSystemMessage(message) {
    try {
        await db.collection('chatMessages').add({
            sessionId: chatSession,
            userId: 'system',
            userName: 'TechFix',
            message: message,
            isAdmin: true,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    } catch (error) {
        console.error('Error sending system message:', error);
    }
}

// ============================================================
// BADGE & NOTIFICATIONS
// ============================================================

function updateBadge(count) {
    const badge = document.getElementById('chatBadge');
    if (count > 0) {
        badge.textContent = count > 9 ? '9+' : count;
        badge.style.display = 'flex';
    } else {
        badge.style.display = 'none';
    }
}

function resetBadge() {
    document.getElementById('chatBadge').style.display = 'none';
    resetUnreadCount();
}

async function resetUnreadCount() {
    if (!chatSession) return;
    try {
        await db.collection('chatSessions').doc(chatSession).update({
            unreadCount: 0
        });
    } catch (error) {
        console.error('Error resetting unread count:', error);
    }
}

// ============================================================
// UTILITIES
// ============================================================

function scrollToBottom() {
    const messagesDiv = document.getElementById('chatMessages');
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
}

function formatChatTime(date) {
    const now = new Date();
    const diff = now - date;
    
    // Moins d'une minute
    if (diff < 60000) return 'À l\'instant';
    
    // Moins d'une heure
    if (diff < 3600000) {
        const mins = Math.floor(diff / 60000);
        return `Il y a ${mins} min`;
    }
    
    // Aujourd'hui
    if (date.toDateString() === now.toDateString()) {
        return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    }
    
    // Cette semaine
    if (diff < 604800000) {
        const days = Math.floor(diff / 86400000);
        return `Il y a ${days} jour${days > 1 ? 's' : ''}`;
    }
    
    // Date complète
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// Clean up on page unload
window.addEventListener('beforeunload', () => {
    if (chatSession) {
        db.collection('chatSessions').doc(chatSession).update({
            isOnline: false,
            lastSeen: firebase.firestore.FieldValue.serverTimestamp()
        }).catch(() => {});
    }
});