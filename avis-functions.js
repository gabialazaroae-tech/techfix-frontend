// ============================================================
// ⭐ AVIS FUNCTIONS - TechFix Solutions
// Gestion de l'affichage des avis clients avec slider
// ============================================================

let currentSlide = 0;
let avisData = [];
let autoSlideInterval = null;

// ============================================================
// CHARGER LES AVIS DEPUIS FIREBASE
// ============================================================

function loadAvis() {
    const avisContainer = document.getElementById('avisContainer');
    
    if (!avisContainer) return; // Pas sur la page index
    
    avisContainer.innerHTML = '<p class="text-gray-500 dark:text-gray-400 text-center py-8">Chargement des avis...</p>';
    
    try {
        // Écouter les avis approuvés en temps réel
        db.collection('avis')
            .where('approuve', '==', true)
            .orderBy('createdAt', 'desc')
            .onSnapshot(snapshot => {
                if (snapshot.empty) {
                    avisContainer.innerHTML = '<p class="text-gray-500 dark:text-gray-400 text-center py-8">Aucun avis pour le moment</p>';
                    return;
                }
                
                // Stocker les avis
                avisData = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                
                // Afficher le slider
                renderSlider();
                
                // Démarrer l'auto-slide
                startAutoSlide();
            });
        
    } catch (error) {
        console.error('Erreur chargement avis:', error);
        avisContainer.innerHTML = '<p class="text-red-500 text-center py-4">Erreur de chargement des avis</p>';
    }
}

// ============================================================
// AFFICHER LE SLIDER
// ============================================================

function renderSlider() {
    const avisContainer = document.getElementById('avisContainer');
    
    // Nombre d'avis par slide (responsive)
    const itemsPerSlide = window.innerWidth >= 1024 ? 3 : (window.innerWidth >= 768 ? 2 : 1);
    
    // Créer les slides
    const slides = [];
    for (let i = 0; i < avisData.length; i += itemsPerSlide) {
        slides.push(avisData.slice(i, i + itemsPerSlide));
    }
    
    // HTML du slider
    avisContainer.innerHTML = `
        <div class="relative">
            <!-- Slides -->
            <div class="overflow-hidden">
                <div id="slidesWrapper" class="flex transition-transform duration-500 ease-in-out">
                    ${slides.map((slide, slideIndex) => `
                        <div class="w-full flex-shrink-0">
                            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                ${slide.map(avis => createAvisCard(avis)).join('')}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <!-- Navigation -->
            ${slides.length > 1 ? `
                <button onclick="previousSlide()" class="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 bg-white dark:bg-gray-800 p-3 rounded-full shadow-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition z-10">
                    <svg class="w-6 h-6 text-gray-800 dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
                    </svg>
                </button>
                
                <button onclick="nextSlide()" class="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 bg-white dark:bg-gray-800 p-3 rounded-full shadow-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition z-10">
                    <svg class="w-6 h-6 text-gray-800 dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                    </svg>
                </button>
                
                <!-- Indicators -->
                <div class="flex justify-center gap-2 mt-8">
                    ${slides.map((_, i) => `
                        <button onclick="goToSlide(${i})" class="w-3 h-3 rounded-full transition ${i === 0 ? 'bg-violet-600' : 'bg-gray-300 dark:bg-gray-600'}" data-slide-indicator="${i}"></button>
                    `).join('')}
                </div>
            ` : ''}
        </div>
    `;
    
    currentSlide = 0;
}

// ============================================================
// CRÉER UNE CARTE D'AVIS
// ============================================================

function createAvisCard(avis) {
    const initiales = avis.initiales || getInitiales(avis.nom);
    const couleur = getInitialesColor(initiales);
    const etoiles = createStars(avis.note);
    const dateFormatted = formatDateAvis(avis.createdAt);
    
    return `
        <div class="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg hover:shadow-xl transition">
            <!-- Initiales -->
            <div class="flex items-center gap-4 mb-4">
                <div class="w-16 h-16 rounded-full ${couleur} flex items-center justify-center">
                    <span class="text-white text-xl font-bold">${sanitizeHtml(initiales)}</span>
                </div>
                <div>
                    <h3 class="font-bold text-gray-900 dark:text-white">${sanitizeHtml(avis.nom)}</h3>
                    <div class="flex gap-1 mt-1">
                        ${etoiles}
                    </div>
                </div>
            </div>
            
            <!-- Texte avis -->
            <p class="text-gray-700 dark:text-gray-300 mb-4 italic">
                "${sanitizeHtml(avis.texte)}"
            </p>
            
            <!-- Service et date -->
            <div class="flex items-center justify-between text-sm">
                <span class="px-3 py-1 bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 rounded-full font-semibold">
                    ${sanitizeHtml(avis.service)}
                </span>
                <span class="text-gray-500 dark:text-gray-400">
                    ${dateFormatted}
                </span>
            </div>
        </div>
    `;
}

// ============================================================
// NAVIGATION SLIDER
// ============================================================

function nextSlide() {
    const itemsPerSlide = window.innerWidth >= 1024 ? 3 : (window.innerWidth >= 768 ? 2 : 1);
    const totalSlides = Math.ceil(avisData.length / itemsPerSlide);
    
    currentSlide = (currentSlide + 1) % totalSlides;
    updateSliderPosition();
    resetAutoSlide();
}

function previousSlide() {
    const itemsPerSlide = window.innerWidth >= 1024 ? 3 : (window.innerWidth >= 768 ? 2 : 1);
    const totalSlides = Math.ceil(avisData.length / itemsPerSlide);
    
    currentSlide = (currentSlide - 1 + totalSlides) % totalSlides;
    updateSliderPosition();
    resetAutoSlide();
}

function goToSlide(index) {
    currentSlide = index;
    updateSliderPosition();
    resetAutoSlide();
}

function updateSliderPosition() {
    const wrapper = document.getElementById('slidesWrapper');
    if (!wrapper) return;
    
    wrapper.style.transform = `translateX(-${currentSlide * 100}%)`;
    
    // Mettre à jour les indicateurs
    document.querySelectorAll('[data-slide-indicator]').forEach((indicator, i) => {
        if (i === currentSlide) {
            indicator.classList.remove('bg-gray-300', 'dark:bg-gray-600');
            indicator.classList.add('bg-violet-600');
        } else {
            indicator.classList.remove('bg-violet-600');
            indicator.classList.add('bg-gray-300', 'dark:bg-gray-600');
        }
    });
}

// ============================================================
// AUTO-SLIDE
// ============================================================

function startAutoSlide() {
    // Changer de slide toutes les 5 secondes
    autoSlideInterval = setInterval(() => {
        nextSlide();
    }, 5000);
}

function resetAutoSlide() {
    clearInterval(autoSlideInterval);
    startAutoSlide();
}

// Arrêter l'auto-slide quand l'utilisateur quitte la page
window.addEventListener('beforeunload', () => {
    clearInterval(autoSlideInterval);
});

// ============================================================
// UTILITAIRES
// ============================================================

function getInitiales(nom) {
    if (!nom) return '??';
    
    const parts = nom.trim().split(' ');
    if (parts.length === 1) {
        return parts[0].substring(0, 2).toUpperCase();
    }
    
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getInitialesColor(initiales) {
    const colors = [
        'bg-violet-500',
        'bg-blue-500',
        'bg-green-500',
        'bg-yellow-500',
        'bg-red-500',
        'bg-pink-500',
        'bg-indigo-500',
        'bg-purple-500'
    ];
    
    // Couleur basée sur les initiales (toujours la même pour les mêmes initiales)
    const hash = initiales.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
}

function createStars(note) {
    let stars = '';
    for (let i = 1; i <= 5; i++) {
        if (i <= note) {
            stars += '<svg class="w-5 h-5 text-yellow-400 fill-current" viewBox="0 0 20 20"><path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/></svg>';
        } else {
            stars += '<svg class="w-5 h-5 text-gray-300 dark:text-gray-600 fill-current" viewBox="0 0 20 20"><path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z"/></svg>';
        }
    }
    return stars;
}

function formatDateAvis(timestamp) {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    return date.toLocaleDateString('fr-FR', {
        month: 'long',
        year: 'numeric'
    });
}

// ============================================================
// RESPONSIVE - Recharger le slider si la fenêtre change de taille
// ============================================================

let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        if (avisData.length > 0) {
            renderSlider();
        }
    }, 250);
});

// ============================================================
// INITIALISATION
// ============================================================

// Charger les avis au chargement de la page
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadAvis);
} else {
    loadAvis();
}
