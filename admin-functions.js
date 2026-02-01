// ============================================================
// 🔐 ADMIN FUNCTIONS - TechFix Solutions
// Toutes les fonctions JavaScript pour le panel admin
// ============================================================

let currentUser = null;
let currentSection = 'dashboard';
let selectedChatSession = null;

// ============================================================
// AUTHENTICATION
// ============================================================

// Écouteur d'état d'authentification
auth.onAuthStateChanged(async (user) => {
    if (user) {
        // Vérifier si l'utilisateur est admin
        const isAdmin = await checkAdmin();
        if (isAdmin) {
            currentUser = user;
            document.getElementById('loginScreen').classList.add('hidden');
            document.getElementById('adminPanel').classList.remove('hidden');
            document.getElementById('adminName').textContent = user.email.split('@')[0];
            loadDashboard();
        } else {
            // Pas admin → déconnexion forcée
            await auth.signOut();
            showError('Accès refusé. Vous n\'êtes pas administrateur.');
        }
    } else {
        currentUser = null;
        document.getElementById('loginScreen').classList.remove('hidden');
        document.getElementById('adminPanel').classList.add('hidden');
    }
});

// Login form
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    try {
        await auth.signInWithEmailAndPassword(email, password);
    } catch (error) {
        console.error('Login error:', error);
        showError(getErrorMessage(error.code));
    }
});

// Logout
function logout() {
    if (confirm('Êtes-vous sûr de vouloir vous déconnecter?')) {
        auth.signOut();
    }
}

// Afficher erreur de login
function showError(message) {
    const errorDiv = document.getElementById('loginError');
    errorDiv.querySelector('p').textContent = message;
    errorDiv.classList.remove('hidden');
    setTimeout(() => errorDiv.classList.add('hidden'), 5000);
}

// Messages d'erreur Firebase
function getErrorMessage(code) {
    const errors = {
        'auth/invalid-email': 'Adresse email invalide',
        'auth/user-disabled': 'Ce compte a été désactivé',
        'auth/user-not-found': 'Email ou mot de passe incorrect',
        'auth/wrong-password': 'Email ou mot de passe incorrect',
        'auth/too-many-requests': 'Trop de tentatives. Réessayez plus tard',
        'auth/network-request-failed': 'Erreur réseau. Vérifiez votre connexion'
    };
    return errors[code] || 'Erreur de connexion. Réessayez.';
}

// ============================================================
// NAVIGATION
// ============================================================

function showSection(section) {
    // Cacher toutes les sections
    document.querySelectorAll('section[id$="Section"]').forEach(s => s.classList.add('hidden'));

    // Afficher la section demandée
    document.getElementById(section + 'Section').classList.remove('hidden');
    currentSection = section;

    // Mettre à jour les boutons de navigation
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('text-violet-600', 'dark:text-violet-400');
        btn.classList.add('text-gray-700', 'dark:text-gray-300');
    });
    document.querySelector(`[data-section="${section}"]`)?.classList.add('text-violet-600', 'dark:text-violet-400');

    // Charger les données de la section
    switch (section) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'devis':
            loadDevis();
            break;
        case 'contact':
            loadContact();
            break;
        case 'tickets':
            loadTickets();
            break;
        case 'chat':
            loadChat();
            break;
    }
}

// ============================================================
// DASHBOARD
// ============================================================

async function loadDashboard() {
    try {
        // Compter les nouveaux devis
        const devisSnapshot = await db.collection('devis')
            .where('status', '==', 'nouveau')
            .get();
        document.getElementById('statsDevisNouveau').textContent = devisSnapshot.size;

        // Compter les nouveaux messages contact
        const contactSnapshot = await db.collection('contact')
            .where('status', '==', 'nouveau')
            .get();
        document.getElementById('statsContactNouveau').textContent = contactSnapshot.size;

        // Compter les tickets ouverts
        const ticketsSnapshot = await db.collection('tickets')
            .where('status', 'in', ['ouvert', 'en_cours'])
            .get();
        document.getElementById('statsTicketsOuverts').textContent = ticketsSnapshot.size;

        // Compter les utilisateurs en ligne (chat)
        const chatSessionsSnapshot = await db.collection('chatSessions')
            .where('isOnline', '==', true)
            .get();
        document.getElementById('statsChatOnline').textContent = chatSessionsSnapshot.size;

        // Charger activité récente
        loadRecentActivity();

    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

async function loadRecentActivity() {
    const activityFeed = document.getElementById('activityFeed');
    activityFeed.innerHTML = '<p class="text-gray-500 dark:text-gray-400 text-center py-4">Chargement...</p>';

    try {
        // Récupérer les 10 dernières activités (devis, contact, tickets)
        const activities = [];

        // Devis récents
        const devisSnap = await db.collection('devis').orderBy('createdAt', 'desc').limit(5).get();
        devisSnap.forEach(doc => {
            const data = doc.data();
            activities.push({
                type: 'devis',
                icon: '📧',
                text: `Nouveau devis de ${sanitizeHtml(data.nom)} - ${sanitizeHtml(data.service)}`,
                time: data.createdAt,
                status: data.status
            });
        });

        // Messages contact récents
        const contactSnap = await db.collection('contact').orderBy('createdAt', 'desc').limit(5).get();
        contactSnap.forEach(doc => {
            const data = doc.data();
            activities.push({
                type: 'contact',
                icon: '💬',
                text: `Message de ${sanitizeHtml(data.nom)} - ${sanitizeHtml(data.sujet)}`,
                time: data.createdAt,
                status: data.status
            });
        });

        // Trier par date
        activities.sort((a, b) => b.time - a.time);

        // Afficher les 10 plus récents
        if (activities.length === 0) {
            activityFeed.innerHTML = '<p class="text-gray-500 dark:text-gray-400 text-center py-8">Aucune activité récente</p>';
            return;
        }

        activityFeed.innerHTML = activities.slice(0, 10).map(activity => `
            <div class="flex items-start gap-4 p-4 bg-white dark:bg-gray-700 rounded-lg">
                <div class="text-2xl">${activity.icon}</div>
                <div class="flex-1">
                    <p class="text-gray-900 dark:text-white">${activity.text}</p>
                    <p class="text-sm text-gray-500 dark:text-gray-400">${formatDate(activity.time)}</p>
                </div>
                ${getStatusBadge(activity.status)}
            </div>
        `).join('');

    } catch (error) {
        console.error('Error loading activity:', error);
        activityFeed.innerHTML = '<p class="text-red-500 text-center py-4">Erreur de chargement</p>';
    }
}

// ============================================================
// DEVIS
// ============================================================

async function loadDevis() {
    const devisList = document.getElementById('devisList');
    devisList.innerHTML = '<p class="text-gray-500 dark:text-gray-400 text-center py-8">Chargement...</p>';

    try {
        const snapshot = await db.collection('devis').orderBy('createdAt', 'desc').limit(50).get();

        if (snapshot.empty) {
            devisList.innerHTML = '<p class="text-gray-500 dark:text-gray-400 text-center py-8">Aucun devis</p>';
            return;
        }

        devisList.innerHTML = snapshot.docs.map(doc => {
            const data = doc.data();
            return `
                <div class="border-b border-gray-200 dark:border-gray-700 py-4">
                    <div class="flex items-start justify-between mb-2">
                        <div>
                            <h3 class="font-bold text-gray-900 dark:text-white">${sanitizeHtml(data.nom)}</h3>
                            <p class="text-sm text-gray-600 dark:text-gray-400">${sanitizeHtml(data.email)} • ${sanitizeHtml(data.telephone)}</p>
                        </div>
                        ${getStatusBadge(data.status)}
                    </div>
                    <div class="mb-2">
                        <span class="font-semibold text-gray-900 dark:text-white">Service:</span>
                        <span class="text-gray-700 dark:text-gray-300">${sanitizeHtml(data.service)}</span>
                    </div>
                    <p class="text-gray-700 dark:text-gray-300 text-sm mb-2">${sanitizeHtml(data.description).substring(0, 200)}...</p>
                    <div class="flex items-center justify-between">
                        <span class="text-xs text-gray-500 dark:text-gray-400">${formatDate(data.createdAt)}</span>
                        <div class="flex gap-2">
                            <button onclick="viewDevis('${doc.id}')" class="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600">
                                Voir
                            </button>
                            <button onclick="updateDevisStatus('${doc.id}', 'en_cours')" class="px-3 py-1 bg-yellow-500 text-white rounded text-sm hover:bg-yellow-600">
                                En cours
                            </button>
                            <button onclick="updateDevisStatus('${doc.id}', 'traite')" class="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600">
                                Traité
                            </button>
                            <button onclick="deleteDevis('${doc.id}')" class="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600">
                                🗑️
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

    } catch (error) {
        console.error('Error loading devis:', error);
        devisList.innerHTML = '<p class="text-red-500 text-center py-4">Erreur de chargement</p>';
    }
}

async function updateDevisStatus(id, status) {
    try {
        await db.collection('devis').doc(id).update({
            status: status,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        loadDevis();
        if (currentSection === 'dashboard') loadDashboard();
    } catch (error) {
        console.error('Error updating devis:', error);
        alert('Erreur lors de la mise à jour');
    }
}

// ============================================================
// CONTACT
// ============================================================

async function loadContact() {
    const contactList = document.getElementById('contactList');
    contactList.innerHTML = '<p class="text-gray-500 dark:text-gray-400 text-center py-8">Chargement...</p>';

    try {
        const snapshot = await db.collection('contact').orderBy('createdAt', 'desc').limit(50).get();

        if (snapshot.empty) {
            contactList.innerHTML = '<p class="text-gray-500 dark:text-gray-400 text-center py-8">Aucun message</p>';
            return;
        }

        contactList.innerHTML = snapshot.docs.map(doc => {
            const data = doc.data();
            return `
                <div class="border-b border-gray-200 dark:border-gray-700 py-4">
                    <div class="flex items-start justify-between mb-2">
                        <div>
                            <h3 class="font-bold text-gray-900 dark:text-white">${sanitizeHtml(data.nom)}</h3>
                            <p class="text-sm text-gray-600 dark:text-gray-400">${sanitizeHtml(data.email)} • ${sanitizeHtml(data.telephone)}</p>
                        </div>
                        ${getStatusBadge(data.status)}
                    </div>
                    <div class="mb-2">
                        <span class="font-semibold text-gray-900 dark:text-white">Sujet:</span>
                        <span class="text-gray-700 dark:text-gray-300">${sanitizeHtml(data.sujet)}</span>
                    </div>
                    <p class="text-gray-700 dark:text-gray-300 text-sm mb-2">${sanitizeHtml(data.message).substring(0, 200)}...</p>
                    <div class="flex items-center justify-between">
                        <span class="text-xs text-gray-500 dark:text-gray-400">${formatDate(data.createdAt)}</span>
                        <div class="flex gap-2">
                            <button onclick="viewContact('${doc.id}')" class="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600">
                                Voir
                            </button>
                            <button onclick="updateContactStatus('${doc.id}', 'traite')" class="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600">
                                Traité
                            </button>
                            <button onclick="deleteContact('${doc.id}')" class="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600">
                                🗑️
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

    } catch (error) {
        console.error('Error loading contact:', error);
        contactList.innerHTML = '<p class="text-red-500 text-center py-4">Erreur de chargement</p>';
    }
}

async function updateContactStatus(id, status) {
    try {
        await db.collection('contact').doc(id).update({
            status: status,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        loadContact();
        if (currentSection === 'dashboard') loadDashboard();
    } catch (error) {
        console.error('Error updating contact:', error);
        alert('Erreur lors de la mise à jour');
    }
}

// ============================================================
// FONCTIONS DE SUPPRESSION - DEVIS, CONTACT, TICKETS
// ============================================================

async function deleteDevis(id) {
    if (!confirm('⚠️ Êtes-vous sûr de vouloir SUPPRIMER définitivement ce devis?\n\nCette action est IRRÉVERSIBLE!')) {
        return;
    }

    // Double confirmation pour éviter les erreurs
    if (!confirm('🚨 DERNIÈRE CONFIRMATION\n\nVoulez-vous vraiment supprimer ce devis?\n\nIl sera impossible de le récupérer!')) {
        return;
    }

    try {
        await db.collection('devis').doc(id).delete();
        alert('✅ Devis supprimé avec succès');
        loadDevis();
        if (currentSection === 'dashboard') loadDashboard();
    } catch (error) {
        console.error('Error deleting devis:', error);
        alert('❌ Erreur lors de la suppression');
    }
}

async function deleteContact(id) {
    if (!confirm('⚠️ Êtes-vous sûr de vouloir SUPPRIMER définitivement ce message?\n\nCette action est IRRÉVERSIBLE!')) {
        return;
    }

    // Double confirmation
    if (!confirm('🚨 DERNIÈRE CONFIRMATION\n\nVoulez-vous vraiment supprimer ce message?\n\nIl sera impossible de le récupérer!')) {
        return;
    }

    try {
        await db.collection('contact').doc(id).delete();
        alert('✅ Message supprimé avec succès');
        loadContact();
        if (currentSection === 'dashboard') loadDashboard();
    } catch (error) {
        console.error('Error deleting contact:', error);
        alert('❌ Erreur lors de la suppression');
    }
}

async function deleteTicket(id) {
    if (!confirm('⚠️ Êtes-vous sûr de vouloir SUPPRIMER définitivement ce ticket?\n\nTous les messages du ticket seront aussi supprimés!\n\nCette action est IRRÉVERSIBLE!')) {
        return;
    }

    // Double confirmation
    if (!confirm('🚨 DERNIÈRE CONFIRMATION\n\nVoulez-vous vraiment supprimer ce ticket et tous ses messages?\n\nIl sera impossible de les récupérer!')) {
        return;
    }

    try {
        // Supprimer tous les messages du ticket d'abord
        const messagesSnapshot = await db.collection('tickets').doc(id).collection('messages').get();
        const deletePromises = messagesSnapshot.docs.map(doc => doc.ref.delete());
        await Promise.all(deletePromises);

        // Puis supprimer le ticket
        await db.collection('tickets').doc(id).delete();

        alert('✅ Ticket et ses messages supprimés avec succès');
        loadTickets();
        if (currentSection === 'dashboard') loadDashboard();
    } catch (error) {
        console.error('Error deleting ticket:', error);
        alert('❌ Erreur lors de la suppression');
    }
}

// ============================================================
// TICKETS
// ============================================================

async function loadTickets() {
    const ticketsList = document.getElementById('ticketsList');
    ticketsList.innerHTML = '<p class="text-gray-500 dark:text-gray-400 text-center py-8">Chargement...</p>';

    try {
        const snapshot = await db.collection('tickets').orderBy('updatedAt', 'desc').limit(50).get();

        if (snapshot.empty) {
            ticketsList.innerHTML = '<p class="text-gray-500 dark:text-gray-400 text-center py-8">Aucun ticket</p>';
            return;
        }

        ticketsList.innerHTML = snapshot.docs.map(doc => {
            const data = doc.data();
            return `
                <div class="border-b border-gray-200 dark:border-gray-700 py-4">
                    <div class="flex items-start justify-between mb-2">
                        <h3 class="font-bold text-gray-900 dark:text-white">${sanitizeHtml(data.titre)}</h3>
                        <div class="flex gap-2">
                            ${getStatusBadge(data.status)}
                            ${getPriorityBadge(data.priority)}
                        </div>
                    </div>
                    <p class="text-gray-700 dark:text-gray-300 text-sm mb-2">${sanitizeHtml(data.description).substring(0, 150)}...</p>
                    <div class="flex items-center justify-between">
                        <span class="text-xs text-gray-500 dark:text-gray-400">${formatDate(data.createdAt)}</span>
                        <div class="flex gap-2">
                            <button onclick="viewTicket('${doc.id}')" class="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600">
                                Voir
                            </button>
                            <button onclick="updateTicketStatus('${doc.id}', 'resolu')" class="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600">
                                Résoudre
                            </button>
                            <button onclick="deleteTicket('${doc.id}')" class="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600">
                                🗑️
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

    } catch (error) {
        console.error('Error loading tickets:', error);
        ticketsList.innerHTML = '<p class="text-red-500 text-center py-4">Erreur de chargement</p>';
    }
}

async function updateTicketStatus(id, status) {
    try {
        await db.collection('tickets').doc(id).update({
            status: status,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        loadTickets();
        if (currentSection === 'dashboard') loadDashboard();
    } catch (error) {
        console.error('Error updating ticket:', error);
        alert('Erreur lors de la mise à jour');
    }
}

// ============================================================
// VIEW TICKET MODAL - FONCTION COMPLÈTE
// ============================================================

async function viewTicket(ticketId) {
    try {
        // Charger le ticket
        const ticketDoc = await db.collection('tickets').doc(ticketId).get();
        if (!ticketDoc.exists) {
            alert('Ticket non trouvé');
            return;
        }

        const ticketData = ticketDoc.data();

        // Créer le modal
        const modal = document.createElement('div');
        modal.id = 'ticketModal';
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center px-4 z-50';
        modal.innerHTML = `
            <div class="bg-white dark:bg-gray-800 rounded-2xl max-w-4xl w-full p-8 max-h-screen overflow-y-auto">
                <div class="flex justify-between items-start mb-6">
                    <div>
                        <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">${sanitizeHtml(ticketData.titre)}</h2>
                        <div class="flex gap-2 mb-2">
                            ${getStatusBadge(ticketData.status)}
                            ${getPriorityBadge(ticketData.priority)}
                        </div>
                        <p class="text-sm text-gray-600 dark:text-gray-400">Par ${sanitizeHtml(ticketData.userName)} • ${formatDate(ticketData.createdAt)}</p>
                    </div>
                    <button onclick="closeTicketModal()" class="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>
                
                <div id="ticketModalMessages" class="space-y-4 mb-6 max-h-96 overflow-y-auto bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                    <p class="text-center text-gray-500 dark:text-gray-400">Chargement des messages...</p>
                </div>
                
                <form id="ticketReplyForm" class="flex gap-2 mb-4">
                    <input type="text" id="ticketReplyInput" placeholder="Votre réponse..." class="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-600" maxlength="2000">
                    <button type="submit" class="bg-gradient-to-r from-violet-600 to-blue-500 text-white px-6 py-3 rounded-lg font-bold hover:shadow-xl transition">
                        Envoyer
                    </button>
                </form>
                
                <button onclick="deleteTicket('${ticketId}'); closeTicketModal();" class="w-full bg-red-500 text-white px-6 py-3 rounded-lg font-bold hover:bg-red-600 transition">
                    🗑️ Supprimer ce ticket
                </button>
            </div>
        `;

        document.body.appendChild(modal);

        // Charger les messages
        loadTicketModalMessages(ticketId);

        // Gérer le formulaire de réponse
        document.getElementById('ticketReplyForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            await sendTicketReply(ticketId);
        });

    } catch (error) {
        console.error('Error opening ticket:', error);
        alert('Erreur lors de l\'ouverture du ticket');
    }
}

function closeTicketModal() {
    const modal = document.getElementById('ticketModal');
    if (modal) modal.remove();
}

async function loadTicketModalMessages(ticketId) {
    const messagesDiv = document.getElementById('ticketModalMessages');

    try {
        // Écouter les messages en temps réel
        db.collection('tickets').doc(ticketId).collection('messages')
            .orderBy('createdAt', 'asc')
            .onSnapshot(snapshot => {
                if (snapshot.empty) {
                    messagesDiv.innerHTML = '<p class="text-center text-gray-500 dark:text-gray-400">Aucun message</p>';
                    return;
                }

                messagesDiv.innerHTML = snapshot.docs.map(doc => {
                    const data = doc.data();
                    const isAdmin = data.isAdmin;
                    return `
                        <div class="flex ${isAdmin ? 'justify-end' : 'justify-start'}">
                            <div class="max-w-md ${isAdmin ? 'bg-violet-100 dark:bg-violet-900/30' : 'bg-white dark:bg-gray-600'} rounded-lg p-4 shadow">
                                <div class="flex items-center gap-2 mb-2">
                                    <span class="font-semibold text-gray-900 dark:text-white">${sanitizeHtml(data.userName)}</span>
                                    ${isAdmin ? '<span class="text-xs bg-violet-500 text-white px-2 py-1 rounded">Admin</span>' : '<span class="text-xs bg-blue-500 text-white px-2 py-1 rounded">Client</span>'}
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

    } catch (error) {
        console.error('Error loading messages:', error);
        messagesDiv.innerHTML = '<p class="text-red-500 text-center">Erreur de chargement</p>';
    }
}

async function sendTicketReply(ticketId) {
    const input = document.getElementById('ticketReplyInput');
    const message = input.value.trim();

    if (!message) return;

    if (message.length < 2) {
        alert('Le message doit contenir au moins 2 caractères');
        return;
    }

    try {
        // Ajouter le message
        await db.collection('tickets').doc(ticketId).collection('messages').add({
            userId: currentUser.uid,
            userName: 'Admin',
            message: message,
            isAdmin: true,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Mettre à jour le ticket
        await db.collection('tickets').doc(ticketId).update({
            status: 'en_cours',
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        input.value = '';

    } catch (error) {
        console.error('Error sending reply:', error);
        alert('Erreur lors de l\'envoi du message');
    }
}

// ============================================================
// CHAT LIVE
// ============================================================

// ============================================================
// VIEW DEVIS MODAL - AVEC BOUTONS DE RÉPONSE
// ============================================================

async function viewDevis(devisId) {
    try {
        const devisDoc = await db.collection('devis').doc(devisId).get();
        if (!devisDoc.exists) {
            alert('Devis non trouvé');
            return;
        }

        const data = devisDoc.data();

        // Créer le modal
        const modal = document.createElement('div');
        modal.id = 'devisModal';
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center px-4 z-50';
        modal.innerHTML = `
            <div class="bg-white dark:bg-gray-800 rounded-2xl max-w-4xl w-full p-8 max-h-screen overflow-y-auto">
                <div class="flex justify-between items-start mb-6">
                    <div>
                        <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">📧 Demande de Devis</h2>
                        ${getStatusBadge(data.status)}
                    </div>
                    <button onclick="closeDevisModal()" class="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>
                
                <div class="space-y-4 mb-6">
                    <div class="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                        <h3 class="font-bold text-gray-900 dark:text-white mb-3">👤 Informations Client</h3>
                        <div class="space-y-2">
                            <p class="text-gray-700 dark:text-gray-300"><strong>Nom:</strong> ${sanitizeHtml(data.nom)}</p>
                            <p class="text-gray-700 dark:text-gray-300"><strong>Email:</strong> <a href="mailto:${sanitizeHtml(data.email)}" class="text-violet-600 hover:underline">${sanitizeHtml(data.email)}</a></p>
                            <p class="text-gray-700 dark:text-gray-300"><strong>Téléphone:</strong> <a href="tel:${sanitizeHtml(data.telephone)}" class="text-violet-600 hover:underline">${sanitizeHtml(data.telephone)}</a></p>
                            ${data.ville ? `<p class="text-gray-700 dark:text-gray-300"><strong>Ville:</strong> ${sanitizeHtml(data.ville)}</p>` : ''}
                        </div>
                    </div>
                    
                    <div class="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                        <h3 class="font-bold text-gray-900 dark:text-white mb-3">🔧 Détails de la Demande</h3>
                        <div class="space-y-2">
                            <p class="text-gray-700 dark:text-gray-300"><strong>Service:</strong> ${sanitizeHtml(data.service)}</p>
                            ${data.urgence ? `<p class="text-gray-700 dark:text-gray-300"><strong>Urgence:</strong> ${sanitizeHtml(data.urgence)}</p>` : ''}
                            ${data.deplacement ? `<p class="text-gray-700 dark:text-gray-300"><strong>Déplacement:</strong> ${sanitizeHtml(data.deplacement)}</p>` : ''}
                            ${data.budget ? `<p class="text-gray-700 dark:text-gray-300"><strong>Budget estimé:</strong> ${sanitizeHtml(data.budget)}</p>` : ''}
                        </div>
                    </div>
                    
                    <div class="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                        <h3 class="font-bold text-gray-900 dark:text-white mb-3">📝 Description</h3>
                        <p class="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">${sanitizeHtml(data.description)}</p>
                    </div>
                    
                    <div class="text-sm text-gray-500 dark:text-gray-400">
                        📅 Reçu le ${formatDate(data.createdAt)}
                    </div>
                </div>
                
                <div class="flex gap-3">
                    <a href="mailto:${sanitizeHtml(data.email)}?subject=Réponse à votre demande de devis - ${encodeURIComponent(data.service)}&body=Bonjour ${sanitizeHtml(data.nom)},%0D%0A%0D%0AMerci pour votre demande de devis concernant : ${encodeURIComponent(data.service)}%0D%0A%0D%0A" class="flex-1 bg-gradient-to-r from-violet-600 to-blue-500 text-white px-6 py-3 rounded-lg font-bold hover:shadow-xl transition text-center">
                        📧 Répondre par Email
                    </a>
                    <a href="tel:${sanitizeHtml(data.telephone)}" class="px-6 py-3 bg-green-500 text-white rounded-lg font-bold hover:bg-green-600 transition">
                        📞 Appeler
                    </a>
                    <button onclick="copyDevisInfo('${devisId}')" class="px-6 py-3 bg-gray-500 text-white rounded-lg font-bold hover:bg-gray-600 transition">
                        📋 Copier
                    </button>
                    <button onclick="deleteDevis('${devisId}'); closeDevisModal();" class="px-6 py-3 bg-red-500 text-white rounded-lg font-bold hover:bg-red-600 transition">
                        🗑️ Supprimer
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

    } catch (error) {
        console.error('Error viewing devis:', error);
        alert('Erreur lors de l\'ouverture du devis');
    }
}

function closeDevisModal() {
    const modal = document.getElementById('devisModal');
    if (modal) modal.remove();
}

async function copyDevisInfo(devisId) {
    try {
        const devisDoc = await db.collection('devis').doc(devisId).get();
        const data = devisDoc.data();

        const info = `
DEMANDE DE DEVIS
================
Nom: ${data.nom}
Email: ${data.email}
Téléphone: ${data.telephone}
${data.ville ? `Ville: ${data.ville}` : ''}

Service: ${data.service}
${data.urgence ? `Urgence: ${data.urgence}` : ''}
${data.deplacement ? `Déplacement: ${data.deplacement}` : ''}
${data.budget ? `Budget: ${data.budget}` : ''}

Description:
${data.description}

Reçu le: ${formatDate(data.createdAt)}
        `.trim();

        await navigator.clipboard.writeText(info);
        alert('✅ Informations copiées dans le presse-papier!');
    } catch (error) {
        console.error('Error copying:', error);
        alert('❌ Erreur lors de la copie');
    }
}

// ============================================================
// VIEW CONTACT MODAL - AVEC BOUTONS DE RÉPONSE
// ============================================================

async function viewContact(contactId) {
    try {
        const contactDoc = await db.collection('contact').doc(contactId).get();
        if (!contactDoc.exists) {
            alert('Message non trouvé');
            return;
        }

        const data = contactDoc.data();

        // Créer le modal
        const modal = document.createElement('div');
        modal.id = 'contactModal';
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center px-4 z-50';
        modal.innerHTML = `
            <div class="bg-white dark:bg-gray-800 rounded-2xl max-w-4xl w-full p-8 max-h-screen overflow-y-auto">
                <div class="flex justify-between items-start mb-6">
                    <div>
                        <h2 class="text-2xl font-bold text-gray-900 dark:text-white mb-2">💬 Message de Contact</h2>
                        ${getStatusBadge(data.status)}
                    </div>
                    <button onclick="closeContactModal()" class="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                        </svg>
                    </button>
                </div>
                
                <div class="space-y-4 mb-6">
                    <div class="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                        <h3 class="font-bold text-gray-900 dark:text-white mb-3">👤 Informations Client</h3>
                        <div class="space-y-2">
                            <p class="text-gray-700 dark:text-gray-300"><strong>Nom:</strong> ${sanitizeHtml(data.nom)}</p>
                            <p class="text-gray-700 dark:text-gray-300"><strong>Email:</strong> <a href="mailto:${sanitizeHtml(data.email)}" class="text-violet-600 hover:underline">${sanitizeHtml(data.email)}</a></p>
                            <p class="text-gray-700 dark:text-gray-300"><strong>Téléphone:</strong> <a href="tel:${sanitizeHtml(data.telephone)}" class="text-violet-600 hover:underline">${sanitizeHtml(data.telephone)}</a></p>
                        </div>
                    </div>
                    
                    <div class="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                        <h3 class="font-bold text-gray-900 dark:text-white mb-3">📌 Sujet</h3>
                        <p class="text-gray-700 dark:text-gray-300 text-lg">${sanitizeHtml(data.sujet)}</p>
                    </div>
                    
                    <div class="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                        <h3 class="font-bold text-gray-900 dark:text-white mb-3">💬 Message</h3>
                        <p class="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">${sanitizeHtml(data.message)}</p>
                    </div>
                    
                    <div class="text-sm text-gray-500 dark:text-gray-400">
                        📅 Reçu le ${formatDate(data.createdAt)}
                    </div>
                </div>
                
                <div class="flex gap-3">
                    <a href="mailto:${sanitizeHtml(data.email)}?subject=RE: ${encodeURIComponent(data.sujet)}&body=Bonjour ${sanitizeHtml(data.nom)},%0D%0A%0D%0AMerci pour votre message concernant : ${encodeURIComponent(data.sujet)}%0D%0A%0D%0A" class="flex-1 bg-gradient-to-r from-violet-600 to-blue-500 text-white px-6 py-3 rounded-lg font-bold hover:shadow-xl transition text-center">
                        📧 Répondre par Email
                    </a>
                    <a href="tel:${sanitizeHtml(data.telephone)}" class="px-6 py-3 bg-green-500 text-white rounded-lg font-bold hover:bg-green-600 transition">
                        📞 Appeler
                    </a>
                    <button onclick="copyContactInfo('${contactId}')" class="px-6 py-3 bg-gray-500 text-white rounded-lg font-bold hover:bg-gray-600 transition">
                        📋 Copier
                    </button>
                    <button onclick="deleteContact('${contactId}'); closeContactModal();" class="px-6 py-3 bg-red-500 text-white rounded-lg font-bold hover:bg-red-600 transition">
                        🗑️ Supprimer
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

    } catch (error) {
        console.error('Error viewing contact:', error);
        alert('Erreur lors de l\'ouverture du message');
    }
}

function closeContactModal() {
    const modal = document.getElementById('contactModal');
    if (modal) modal.remove();
}

async function copyContactInfo(contactId) {
    try {
        const contactDoc = await db.collection('contact').doc(contactId).get();
        const data = contactDoc.data();

        const info = `
MESSAGE DE CONTACT
==================
Nom: ${data.nom}
Email: ${data.email}
Téléphone: ${data.telephone}

Sujet: ${data.sujet}

Message:
${data.message}

Reçu le: ${formatDate(data.createdAt)}
        `.trim();

        await navigator.clipboard.writeText(info);
        alert('✅ Informations copiées dans le presse-papier!');
    } catch (error) {
        console.error('Error copying:', error);
        alert('❌ Erreur lors de la copie');
    }
}

// ============================================================
// CHAT LIVE
// ============================================================

async function loadChat() {
    loadChatSessions();
}

async function loadChatSessions() {
    const sessionsList = document.getElementById('chatSessionsList');

    try {
        // Écouter les sessions actives en temps réel
        db.collection('chatSessions')
            .where('isOnline', '==', true)
            .onSnapshot(snapshot => {
                if (snapshot.empty) {
                    sessionsList.innerHTML = '<p class="text-gray-500 dark:text-gray-400 text-center py-4">Aucune session</p>';
                    return;
                }

                sessionsList.innerHTML = snapshot.docs.map(doc => {
                    const data = doc.data();
                    return `
                        <div onclick="selectChatSession('${doc.id}')" class="p-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg cursor-pointer ${selectedChatSession === doc.id ? 'bg-gray-100 dark:bg-gray-700' : ''}">
                            <div class="flex items-center justify-between">
                                <div class="flex items-center gap-2">
                                    <div class="w-2 h-2 bg-green-500 rounded-full"></div>
                                    <span class="font-semibold text-gray-900 dark:text-white">${sanitizeHtml(data.userName || 'Utilisateur')}</span>
                                </div>
                                ${data.unreadCount > 0 ? `<span class="bg-red-500 text-white text-xs px-2 py-1 rounded-full">${data.unreadCount}</span>` : ''}
                            </div>
                            <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">${formatDate(data.lastSeen)}</p>
                        </div>
                    `;
                }).join('');
            });

    } catch (error) {
        console.error('Error loading chat sessions:', error);
    }
}

function selectChatSession(sessionId) {
    selectedChatSession = sessionId;
    loadChatMessages(sessionId);
    loadChatSessions(); // Refresh pour mettre à jour la sélection
}

async function loadChatMessages(sessionId) {
    const messagesDiv = document.getElementById('chatMessages');

    try {
        // Écouter les messages en temps réel
        db.collection('chatMessages')
            .where('sessionId', '==', sessionId)
            .orderBy('createdAt', 'asc')
            .onSnapshot(snapshot => {
                if (snapshot.empty) {
                    messagesDiv.innerHTML = '<p class="text-gray-500 dark:text-gray-400 text-center py-8">Aucun message</p>';
                    return;
                }

                messagesDiv.innerHTML = snapshot.docs.map(doc => {
                    const data = doc.data();
                    const isAdmin = data.isAdmin;
                    return `
                        <div class="mb-4 ${isAdmin ? 'text-right' : 'text-left'}">
                            <div class="inline-block max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${isAdmin ? 'bg-violet-500 text-white' : 'bg-gray-200 dark:bg-gray-600 text-gray-900 dark:text-white'}">
                                <p class="text-sm font-semibold mb-1">${sanitizeHtml(data.userName)}</p>
                                <p>${sanitizeHtml(data.message)}</p>
                                <p class="text-xs opacity-75 mt-1">${formatDate(data.createdAt)}</p>
                            </div>
                        </div>
                    `;
                }).join('');

                // Scroll vers le bas
                messagesDiv.scrollTop = messagesDiv.scrollHeight;
            });

    } catch (error) {
        console.error('Error loading messages:', error);
    }
}

async function sendChatMessage() {
    if (!selectedChatSession) {
        alert('Sélectionnez une session d\'abord');
        return;
    }

    const input = document.getElementById('chatInput');
    const message = input.value.trim();

    if (!message) return;

    try {
        await db.collection('chatMessages').add({
            sessionId: selectedChatSession,
            userId: currentUser.uid,
            userName: 'Admin',
            message: message,
            isAdmin: true,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        // Mettre à jour la session
        await db.collection('chatSessions').doc(selectedChatSession).update({
            lastSeen: firebase.firestore.FieldValue.serverTimestamp()
        });

        input.value = '';

    } catch (error) {
        console.error('Error sending message:', error);
        alert('Erreur lors de l\'envoi');
    }
}