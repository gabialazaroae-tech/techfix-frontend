// ============================================================
// 🎫 FORUM FUNCTIONS - TechFix Solutions
// Gestion des tickets et messages pour les clients
// ============================================================

let currentUser = null;
let currentTicketId = null;
let unsubscribeMessages = null;
let unsubscribeTicketMessages = null;

// ============================================================
// AUTHENTICATION
// ============================================================

auth.onAuthStateChanged(async (user) => {
    if (user) {
        currentUser = user;
        document.getElementById('authScreen').classList.add('hidden');
        document.getElementById('forumScreen').classList.remove('hidden');
        document.getElementById('userName').textContent = user.email.split('@')[0];

        // Créer/mettre à jour le profil utilisateur
        await ensureUserProfile(user);

        // Charger les tickets
        loadUserTickets();
    } else {
        currentUser = null;
        document.getElementById('authScreen').classList.remove('hidden');
        document.getElementById('forumScreen').classList.add('hidden');
    }
});

// Login
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    try {
        await auth.signInWithEmailAndPassword(email, password);
    } catch (error) {
        console.error('Login error:', error);
        showAuthError(getAuthErrorMessage(error.code));
    }
});

// Register
document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('registerName').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value;

    if (password.length < 6) {
        showAuthError('Le mot de passe doit contenir au moins 6 caractères');
        return;
    }

    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);

        // Créer le profil utilisateur
        await db.collection('users').doc(userCredential.user.uid).set({
            email: email,
            name: name,
            isAdmin: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

    } catch (error) {
        console.error('Register error:', error);
        showAuthError(getAuthErrorMessage(error.code));
    }
});

// Ensure user profile exists
async function ensureUserProfile(user) {
    const userDoc = await db.collection('users').doc(user.uid).get();
    if (!userDoc.exists) {
        await db.collection('users').doc(user.uid).set({
            email: user.email,
            name: user.email.split('@')[0],
            isAdmin: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    }
}

// Show/hide tabs
document.addEventListener('click', (e) => {
    if (e.target.closest('[data-action="showRegister"]')) {
        document.getElementById('loginTab').classList.add('hidden');
        document.getElementById('registerTab').classList.remove('hidden');
        document.getElementById('authError').classList.add('hidden');
    }
    if (e.target.closest('[data-action="showLogin"]')) {
        document.getElementById('registerTab').classList.add('hidden');
        document.getElementById('loginTab').classList.remove('hidden');
        document.getElementById('authError').classList.add('hidden');
    }
    if (e.target.closest('[data-action="forumLogout"]')) {
        if (confirm('Êtes-vous sûr de vouloir vous déconnecter?')) {
            auth.signOut();
        }
    }
});

// Show auth error
function showAuthError(message) {
    const errorDiv = document.getElementById('authError');
    errorDiv.querySelector('p').textContent = message;
    errorDiv.classList.remove('hidden');
    setTimeout(() => errorDiv.classList.add('hidden'), 5000);
}

// Auth error messages
function getAuthErrorMessage(code) {
    const errors = {
        'auth/email-already-in-use': 'Cet email est déjà utilisé',
        'auth/invalid-email': 'Email invalide',
        'auth/weak-password': 'Mot de passe trop faible (min. 6 caractères)',
        'auth/user-not-found': 'Email ou mot de passe incorrect',
        'auth/wrong-password': 'Email ou mot de passe incorrect',
        'auth/too-many-requests': 'Trop de tentatives. Réessayez plus tard'
    };
    return errors[code] || 'Erreur de connexion';
}

// ============================================================
// TICKETS
// ============================================================

async function loadUserTickets() {
    const ticketsList = document.getElementById('ticketsList');
    ticketsList.innerHTML = '<p class="text-gray-500 dark:text-gray-400 text-center py-8">Chargement...</p>';

    try {
        // Écouter les tickets de l'utilisateur en temps réel
        db.collection('tickets')
            .where('userId', '==', currentUser.uid)
            .onSnapshot(snapshot => {
                // Trier manuellement côté client
                const sortedDocs = snapshot.docs.sort((a, b) => {
                    const aTime = a.data().updatedAt?.toMillis() || 0;
                    const bTime = b.data().updatedAt?.toMillis() || 0;
                    return bTime - aTime;
                });

                if (snapshot.empty) {
                    ticketsList.innerHTML = `
                        <div class="text-center py-12">
                            <p class="text-gray-500 dark:text-gray-400 mb-4">Vous n'avez aucun ticket</p>
                            <button data-action="newTicket" class="bg-gradient-to-r from-violet-600 to-blue-500 text-white px-6 py-3 rounded-lg font-bold hover:shadow-xl transition">
                                Créer mon premier ticket
                            </button>
                        </div>
                    `;
                    return;
                }

                ticketsList.innerHTML = sortedDocs.map(doc => {
                    const data = doc.data();
                    return `
                        <div onclick="openTicketDetail('${doc.id}')" class="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg hover:shadow-xl transition cursor-pointer">
                            <div class="flex items-start justify-between mb-3">
                                <h3 class="text-xl font-bold text-gray-900 dark:text-white">${sanitizeHtml(data.titre)}</h3>
                                <div class="flex gap-2">
                                    ${getStatusBadge(data.status)}
                                    ${getPriorityBadge(data.priority)}
                                </div>
                            </div>
                            <p class="text-gray-700 dark:text-gray-300 mb-4">${sanitizeHtml(data.description).substring(0, 150)}...</p>
                            <div class="flex items-center justify-between text-sm">
                                <span class="text-gray-500 dark:text-gray-400">Créé le ${formatDate(data.createdAt)}</span>
                                <span class="text-gray-500 dark:text-gray-400">Mis à jour le ${formatDate(data.updatedAt)}</span>
                            </div>
                        </div>
                    `;
                }).join('');
            });

    } catch (error) {
        console.error('Error loading tickets:', error);
        ticketsList.innerHTML = '<p class="text-red-500 text-center py-4">Erreur de chargement</p>';
    }
}

// ============================================================
// NEW TICKET MODAL
// ============================================================

document.addEventListener('click', (e) => {
    if (e.target.closest('[data-action="newTicket"]')) {
        document.getElementById('newTicketModal').classList.remove('hidden');
    }
    if (e.target.closest('[data-action="closeModal"]')) {
        document.getElementById('newTicketModal').classList.add('hidden');
        document.getElementById('newTicketForm').reset();
    }
});

document.getElementById('newTicketForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const titre = document.getElementById('ticketTitre').value.trim();
    const priority = document.getElementById('ticketPriority').value;
    const description = document.getElementById('ticketDescription').value.trim();

    if (!titre || !description) {
        alert('Veuillez remplir tous les champs obligatoires');
        return;
    }

    if (titre.length < 5) {
        alert('Le titre doit contenir au moins 5 caractères');
        return;
    }

    if (description.length < 10) {
        alert('La description doit contenir au moins 10 caractères');
        return;
    }

    try {
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        const userName = userDoc.exists ? userDoc.data().name : currentUser.email.split('@')[0];

        // Créer le ticket
        const ticketRef = await db.collection('tickets').add({
            userId: currentUser.uid,
            userName: userName,
            titre: titre,
            description: description,
            priority: priority,
            status: 'ouvert',
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Créer le premier message (la description)
        await db.collection('tickets').doc(ticketRef.id).collection('messages').add({
            userId: currentUser.uid,
            userName: userName,
            message: description,
            isAdmin: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Message de bienvenue automatique
        await db.collection('tickets').doc(ticketRef.id).collection('messages').add({
            userId: 'system',
            userName: 'TechFix Support',
            message: 'Bonjour! Merci pour votre message. Un membre de notre équipe vous répondra dans les plus brefs délais.',
            isAdmin: true,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Fermer le modal
        document.getElementById('newTicketModal').classList.add('hidden');
        document.getElementById('newTicketForm').reset();

        // Ouvrir le nouveau ticket
        setTimeout(() => openTicketDetail(ticketRef.id), 500);

    } catch (error) {
        console.error('Error creating ticket:', error);
        alert('Erreur lors de la création du ticket');
    }
});

// ============================================================
// TICKET DETAIL MODAL
// ============================================================

async function openTicketDetail(ticketId) {
    currentTicketId = ticketId;

    try {
        const ticketDoc = await db.collection('tickets').doc(ticketId).get();
        if (!ticketDoc.exists) {
            alert('Ticket non trouvé');
            return;
        }

        const data = ticketDoc.data();

        // Afficher les infos du ticket
        document.getElementById('ticketDetailTitle').textContent = data.titre;
        document.getElementById('ticketDetailBadges').innerHTML = `
            ${getStatusBadge(data.status)}
            ${getPriorityBadge(data.priority)}
        `;

        // Charger les messages
        loadTicketMessages(ticketId);

        // Afficher le modal
        document.getElementById('ticketDetailModal').classList.remove('hidden');

    } catch (error) {
        console.error('Error opening ticket:', error);
        alert('Erreur lors de l\'ouverture du ticket');
    }
}

function loadTicketMessages(ticketId) {
    const messagesDiv = document.getElementById('ticketMessages');

    // Arrêter l'écoute précédente si elle existe
    if (unsubscribeTicketMessages) {
        unsubscribeTicketMessages();
    }

    // Écouter les messages en temps réel
    unsubscribeTicketMessages = db.collection('tickets').doc(ticketId).collection('messages')
        .orderBy('createdAt', 'asc')
        .onSnapshot(snapshot => {
            if (snapshot.empty) {
                messagesDiv.innerHTML = '<p class="text-gray-500 dark:text-gray-400 text-center py-4">Aucun message</p>';
                return;
            }

            messagesDiv.innerHTML = snapshot.docs.map(doc => {
                const data = doc.data();
                const isAdmin = data.isAdmin;
                return `
                    <div class="flex ${isAdmin ? 'justify-end' : 'justify-start'}">
                        <div class="max-w-md ${isAdmin ? 'bg-violet-100 dark:bg-violet-900/30' : 'bg-gray-100 dark:bg-gray-700'} rounded-lg p-4">
                            <div class="flex items-center gap-2 mb-2">
                                <span class="font-semibold text-gray-900 dark:text-white">${sanitizeHtml(data.userName)}</span>
                                ${isAdmin ? '<span class="text-xs bg-violet-500 text-white px-2 py-1 rounded">Admin</span>' : ''}
                            </div>
                            <p class="text-gray-800 dark:text-gray-200">${sanitizeHtml(data.message)}</p>
                            <p class="text-xs text-gray-500 dark:text-gray-400 mt-2">${formatDate(data.createdAt)}</p>
                        </div>
                    </div>
                `;
            }).join('');

            // Scroll vers le bas
            messagesDiv.scrollTop = messagesDiv.scrollHeight;
        });
}

// Close ticket detail modal
document.addEventListener('click', (e) => {
    if (e.target.closest('[data-action="closeDetailModal"]')) {
        document.getElementById('ticketDetailModal').classList.add('hidden');

        // Arrêter d'écouter les messages
        if (unsubscribeTicketMessages) {
            unsubscribeTicketMessages();
            unsubscribeTicketMessages = null;
        }

        currentTicketId = null;
    }
});

// Reply to ticket
document.getElementById('replyForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!currentTicketId) return;

    const input = document.getElementById('replyInput');
    const message = input.value.trim();

    if (!message) return;

    if (message.length < 2) {
        alert('Le message doit contenir au moins 2 caractères');
        return;
    }

    try {
        const userDoc = await db.collection('users').doc(currentUser.uid).get();
        const userName = userDoc.exists ? userDoc.data().name : currentUser.email.split('@')[0];

        // Ajouter le message
        await db.collection('tickets').doc(currentTicketId).collection('messages').add({
            userId: currentUser.uid,
            userName: userName,
            message: message,
            isAdmin: false,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Mettre à jour le ticket
        await db.collection('tickets').doc(currentTicketId).update({
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        input.value = '';

    } catch (error) {
        console.error('Error sending reply:', error);
        alert('Erreur lors de l\'envoi du message');
    }
});