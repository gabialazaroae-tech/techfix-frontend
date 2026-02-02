// 🔥 CONFIGURATION FIREBASE - TechFix Solutions
// Version corrigée - février 2026

console.log("Début chargement firebase-config.js");

if (typeof firebase === 'undefined') {
    console.error("ERREUR : Firebase n'est PAS chargé ! Vérifie l'ordre des scripts dans HTML.");
} else {
    console.log("Firebase global détecté → OK");
}

const firebaseConfig = {
    apiKey: "AIzaSyAsPyJ_xq3UscIyq-2hB6TDKGBqMZCoKo4",
    authDomain: "techfix-solutions-alazaroae.firebaseapp.com",
    projectId: "techfix-solutions-alazaroae",
    storageBucket: "techfix-solutions-alazaroae.firebasestorage.app",
    messagingSenderId: "549071310832",
    appId: "1:549071310832:web:124491714c096021725735",
    measurementId: "G-3WVS42MMN7"
};

try {
    // Initialisation
    firebase.initializeApp(firebaseConfig);
    console.log("Firebase.initializeApp → SUCCESS");

    // Services
    const auth = firebase.auth();
    const db = firebase.firestore();

    // Exposition globale (pour tes autres scripts)
    window.auth = auth;
    window.db = db;

    console.log("Services auth et db créés → window.db et window.auth disponibles");

    // Optionnel : test rapide de connexion (juste pour debug)
    db.collection('_test').doc('ping').set({ ping: Date.now() })
        .then(() => console.log("Test Firestore : écriture OK (collection _test)"))
        .catch(err => console.warn("Test Firestore échoué (normal si règles restrictives) :", err.message));

} catch (error) {
    console.error("ÉCHEC TOTAL INITIALISATION FIREBASE :", error);
    console.error("Code erreur :", error.code);
    console.error("Message :", error.message);
    if (error.message.includes("already exists")) {
        console.warn("→ Firebase a été initialisé plusieurs fois. Vérifie les <script> doublons !");
    }
}

// ============================================================
// 🔐 SÉCURITÉ - Sanitisation côté client
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
// Badges statut / priorité (inchangé)
// ============================================================
const STATUS_BADGES = {
    'nouveau': { label: '🆕 Nouveau', classes: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
    'en_cours': { label: '⏳ En cours', classes: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' },
    'traite': { label: '✅ Traité', classes: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
    'ouvert': { label: '📂 Ouvert', classes: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
    'resolu': { label: '✅ Résolu', classes: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' }
};

const PRIORITY_BADGES = {
    'normale': { label: 'Normal', classes: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200' },
    'haute': { label: '⚠️ Haute', classes: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' },
    'urgente': { label: '🚨 Urgente', classes: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' }
};

function getStatusBadge(status) {
    const badge = STATUS_BADGES[status];
    if (!badge) return `<span class="px-3 py-1 bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 rounded-full text-sm">${sanitizeHtml(status)}</span>`;
    return `<span class="px-3 py-1 ${badge.classes} rounded-full text-sm font-semibold">${badge.label}</span>`;
}

function getPriorityBadge(priority) {
    const badge = PRIORITY_BADGES[priority];
    if (!badge) return `<span class="px-3 py-1 bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 rounded-full text-sm">${sanitizeHtml(priority)}</span>`;
    return `<span class="px-3 py-1 ${badge.classes} rounded-full text-sm font-semibold">${badge.label}</span>`;
}

// ============================================================
// Formatage dates
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
// Check admin
// ============================================================
async function checkAdmin() {
    const user = auth?.currentUser;
    if (!user) return false;
    try {
        const userDoc = await db.collection('users').doc(user.uid).get();
        return userDoc.exists && userDoc.data().isAdmin === true;
    } catch (err) {
        console.error("Erreur checkAdmin :", err);
        return false;
    }
}

console.log("Fin chargement firebase-config.js");