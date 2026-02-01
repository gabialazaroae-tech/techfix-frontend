// 🔥 CONFIGURATION FIREBASE - TechFix Solutions
// Remplace les valeurs par ta vraie configuration Firebase

const firebaseConfig = {
  apiKey: "AIzaSyAsPyJ_xq3UscIyq-2hB6TDKGBqMZCoKo4",
  authDomain: "techfix-solutions-alazaroae.firebaseapp.com",
  projectId: "techfix-solutions-alazaroae",
  storageBucket: "techfix-solutions-alazaroae.firebasestorage.app",
  messagingSenderId: "549071310832",
  appId: "1:549071310832:web:124491714c096021725735",
  measurementId: "G-3WVS42MMN7"
};

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db   = firebase.firestore();

// Désactivé temporairement pour éviter les erreurs
// db.settings({ cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED });
// db.enablePersistence().catch(() => {});

// ============================================================
// 🔐 SÉCURITÉ - Sanitisation côté client
// Utilisée avant tout usage de innerHTML
// ============================================================
function sanitizeHtml(str) {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
}

// ============================================================
// 🔐 SÉCURITÉ - Badges avec whitelist stricte
// Seules les valeurs connues génèrent du HTML.
// Toute valeur inconnue est affichée comme texte brut (échappée).
// ============================================================
const STATUS_BADGES = {
    'nouveau':  { label: '🆕 Nouveau',  classes: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
    'en_cours': { label: '⏳ En cours', classes: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' },
    'traite':   { label: '✅ Traité',   classes: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
    'ouvert':   { label: '📂 Ouvert',   classes: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
    'resolu':   { label: '✅ Résolu',   classes: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' }
};

const PRIORITY_BADGES = {
    'normale': { label: 'Normal',     classes: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200' },
    'haute':   { label: '⚠️ Haute',   classes: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' },
    'urgente': { label: '🚨 Urgente', classes: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' }
};

function getStatusBadge(status) {
    const badge = STATUS_BADGES[status];
    if (!badge) {
        // Valeur inconnue → afficher comme texte brut échappé, pas de HTML
        return `<span class="px-3 py-1 bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 rounded-full text-sm">${sanitizeHtml(status)}</span>`;
    }
    return `<span class="px-3 py-1 ${badge.classes} rounded-full text-sm font-semibold">${badge.label}</span>`;
}

function getPriorityBadge(priority) {
    const badge = PRIORITY_BADGES[priority];
    if (!badge) {
        return `<span class="px-3 py-1 bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 rounded-full text-sm">${sanitizeHtml(priority)}</span>`;
    }
    return `<span class="px-3 py-1 ${badge.classes} rounded-full text-sm font-semibold">${badge.label}</span>`;
}

// ============================================================
// Formatage des dates
// ============================================================
function formatDate(timestamp) {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    return date.toLocaleDateString('fr-BE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// ============================================================
// Vérifier si l'utilisateur est admin (vérifié côté Firestore)
// ============================================================
async function checkAdmin() {
    const user = auth.currentUser;
    if (!user) return false;
    const userDoc = await db.collection('users').doc(user.uid).get();
    return userDoc.exists && userDoc.data().isAdmin === true;
}
