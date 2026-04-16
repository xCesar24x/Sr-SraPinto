/**
 * Sr. & Sra. Pinto - Hub de Enlaces Interactivo
 * Sistema modular con GSAP animations
 * Mobile-first responsive architecture
 */

// ========================================
// MÓDULO: State Management
// ========================================
const StateManager = {
    currentCategory: 'destacados',
    
    setCategory(category) {
        this.currentCategory = category;
        return this;
    },
    
    getCategory() {
        return this.currentCategory;
    }
};

// ========================================
// MÓDULO: UI Controller
// ========================================
const UIController = {
    /**
     * Cambiar categoría activa de elementos visuales
     */
    switchCategory(categoryName) {
        // Remover clase active de todos los botones
        document.querySelectorAll('.menu-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Remover clase active de todas las secciones
        document.querySelectorAll('.category-section').forEach(section => {
            section.classList.remove('active');
        });
        
        // Agregar clase active al botón seleccionado
        const activeBtn = document.querySelector(`[data-category="${categoryName}"]`);
        if (activeBtn) {
            activeBtn.classList.add('active');
            gsap.to(activeBtn, { scale: 1.05, duration: 0.2 });
        }
        
        // Agregar clase active a la sección correspondiente
        const activeSection = document.querySelector(`[data-category="${categoryName}"]`).parentElement;
        const targetSection = document.querySelector(`.category-section[data-category="${categoryName}"]`);
        if (targetSection) {
            targetSection.classList.add('active');
        }
        
        // Update state
        StateManager.setCategory(categoryName);
        
        // Scroll suave hacia arriba en mobile
        if (window.innerWidth < 768) {
            gsap.to(window, { 
                scrollTo: { y: '.category-section.active' }, 
                duration: 0.5 
            });
        }
    },
    
    /**
     * Setup de event listeners para el menú
     */
    setupMenuListeners() {
        document.querySelectorAll('.menu-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const category = e.currentTarget.dataset.category;
                this.switchCategory(category);
                
                // Feedback háptico si disponible
                if (navigator.vibrate) {
                    navigator.vibrate(100);
                }
            });
        });
    },
    
    /**
     * Setup del personaje flotante interactivo
     */
    setupCharacterInteraction() {
        const characterBtn = document.getElementById('character-toggle');
        const speechBubble = document.getElementById('speech-bubble');
        const messages = [
            '¡Pura Vida! 🇨🇷',
            '¡Hacé tu pedido! 🥐',
            '¡Qué buen sabor! 😋',
            'Tico fino 🎉',
            '¡Síguenos! 📱'
        ];
        
        if (characterBtn && speechBubble) {
            characterBtn.addEventListener('click', () => {
                // Animación del botón
                gsap.to(characterBtn, {
                    scale: 1.3,
                    duration: 0.1,
                    yoyo: true,
                    repeat: 1
                });
                
                // Mensaje aleatorio
                const randomMessage = messages[Math.floor(Math.random() * messages.length)];
                speechBubble.textContent = randomMessage;
                
                // Mostrar burbuja
                gsap.to(speechBubble, {
                    opacity: 1,
                    y: -10,
                    duration: 0.3
                });
                
                // Ocultar después de 2.5 segundos
                setTimeout(() => {
                    gsap.to(speechBubble, {
                        opacity: 0,
                        y: 0,
                        duration: 0.3
                    });
                }, 2500);
                
                // Feedback háptico
                if (navigator.vibrate) {
                    navigator.vibrate([100, 50, 100]);
                }
            });
        }
    },
    
    /**
     * Setup del formulario de contacto
     */
    setupFormHandling() {
        const contactForm = document.getElementById('contactForm');
        if (contactForm) {
            contactForm.addEventListener('submit', (e) => {
                e.preventDefault();
                
                // Validación simple
                const inputs = contactForm.querySelectorAll('input, textarea');
                let isValid = true;
                
                inputs.forEach(input => {
                    if (!input.value.trim()) {
                        isValid = false;
                        gsap.to(input, { 
                            duration: 0.2,
                            borderColor: '#E91350'
                        });
                    }
                });
                
                if (isValid) {
                    // Simulación de envío
                    const submitBtn = contactForm.querySelector('button[type="submit"]');
                    const originalText = submitBtn.textContent;
                    
                    gsap.to(submitBtn, {
                        scale: 0.95,
                        duration: 0.2
                    });
                    
                    submitBtn.textContent = '✓ Enviado!';
                    submitBtn.disabled = true;
                    
                    setTimeout(() => {
                        contactForm.reset();
                        submitBtn.textContent = originalText;
                        submitBtn.disabled = false;
                        gsap.to(submitBtn, {
                            scale: 1,
                            duration: 0.2
                        });
                    }, 2000);
                }
            });
        }
    }
};

// ========================================
// MÓDULO: Animations Engine
// ========================================
const AnimationEngine = {
    /**
     * Animación de entrada principal
     */
    playIntroAnimation() {
        const tl = gsap.timeline({
            delay: 0.2
        });
        
        // Logo desciende con bounce
        tl.from('#main-logo', {
            duration: 1.2,
            y: -60,
            opacity: 0,
            ease: 'bounce.out'
        })
        
        // Eslogan aparece y escala
        .to('#slogan', {
            duration: 0.8,
            opacity: 1,
            scale: 1.1,
            ease: 'back.out'
        }, '-=0.4')
        
        // Botones del menú entran con stagger
        .from('.menu-btn', {
            duration: 0.6,
            opacity: 0,
            y: 20,
            stagger: 0.1,
            ease: 'power3.out'
        }, '-=0.3')
        
        // Tarjetas iniciales con efecto ondulante
        .from('.featured-card', {
            duration: 0.8,
            x: -50,
            opacity: 0,
            ease: 'power4.out'
        }, '-=0.3');
    },
    
    /**
     * Animación de cambio de sección
     */
    playSectionTransition(sectionElement) {
        if (sectionElement) {
            const children = sectionElement.querySelectorAll(
                '.catalog-card, .social-link-card, .product-card, .contact-card'
            );
            
            gsap.from(children, {
                duration: 0.5,
                opacity: 0,
                y: 20,
                stagger: 0.1,
                ease: 'power2.out'
            });
        }
    },
    
    /**
     * Animación continua de elementos flotantes
     */
    setupFloatingElements() {
        // Botones del menú con hover float
        gsap.utils.toArray('.menu-btn').forEach((btn) => {
            gsap.to(btn, {
                y: 0,
                repeat: -1,
                yoyo: true,
                duration: 2,
                ease: 'sine.inOut',
                paused: true,
                opacity: 1
            }).pause();
            
            btn.addEventListener('mouseenter', function() {
                gsap.to(this, { y: -5, duration: 0.3 });
            });
            
            btn.addEventListener('mouseleave', function() {
                gsap.to(this, { y: 0, duration: 0.3 });
            });
        });
        
        // Emojis en tarjetas de productos flotando
        gsap.to('.image-placeholder', {
            y: -8,
            repeat: -1,
            yoyo: true,
            duration: 3,
            ease: 'sine.inOut'
        });

        // 🧠 NEUROMARKETING: Efecto latido (heartbeat) sutil en el botón CTA principal
        // Atrae el ojo periférico del usuario
        gsap.to('.cta-pulse', {
            scale: 1.03,
            repeat: -1,
            yoyo: true,
            duration: 1.5,
            ease: 'power1.inOut'
        });
    },
    
    /**
     * Efecto parallax en movimiento del mouse
     */
    setupParallax() {
        if (window.innerWidth >= 768) {
            document.addEventListener('mousemove', (e) => {
                const moveX = (e.clientX - window.innerWidth / 2) * 0.002;
                const moveY = (e.clientY - window.innerHeight / 2) * 0.002;
                
                gsap.to('.catalog-card', {
                    x: moveX * 10,
                    y: moveY * 10,
                    duration: 0.5,
                    overwrite: 'auto',
                    stagger: 0.05
                });
            });
        }
    }
};

// ========================================
// MÓDULO: Responsive Handler
// ========================================
const ResponsiveHandler = {
    /**
     * Detectar cambios de viewport
     */
    setupResponsiveListeners() {
        let lastWidth = window.innerWidth;
        
        window.addEventListener('resize', () => {
            const currentWidth = window.innerWidth;
            
            // Solo re-inicializar si cambió entre mobile y desktop
            if ((lastWidth < 768 && currentWidth >= 768) ||
                (lastWidth >= 768 && currentWidth < 768)) {
                
                // Reiniciar animaciones basadas en breakpoint
                if (currentWidth >= 768) {
                    AnimationEngine.setupParallax();
                } else {
                    // Limpiar parallax en mobile
                    gsap.killTweensOf('.catalog-card');
                }
                
                lastWidth = currentWidth;
            }
        });
    },
    
    /**
     * Detectar orientación en mobile
     */
    setupOrientationListener() {
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                // Rescan de elementos animables
                AnimationEngine.setupFloatingElements();
            }, 100);
        });
    }
};

// ========================================
// MÓDULO: Initialization
// ========================================
const AppInitializer = {
    /**
     * Verificar soporte de características
     */
    checkBrowserSupport() {
        const support = {
            gsap: typeof gsap !== 'undefined',
            intersectionObserver: 'IntersectionObserver' in window,
            vibration: 'vibrate' in navigator,
            localStorage: typeof localStorage !== 'undefined'
        };
        
        console.log('🚀 Browser Support:', support);
        return support;
    },
    
    /**
     * Inicializar todas las funcionalidades
     */
    initialize() {
        console.log('🎬 Inicializando Sr. & Sra. Pinto Hub...');
        
        // Verificar soporte
        this.checkBrowserSupport();
        
        // Ejecutar en DOMContentLoaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.run());
        } else {
            this.run();
        }
    },
    
    /**
     * Función principal de ejecución
     */
    run() {
        console.log('✅ DOM Cargado - Iniciando aplicación');
        
        // 1. Setup UI
        UIController.setupMenuListeners();
        UIController.setupCharacterInteraction();
        UIController.setupFormHandling();
        
        // 2. Animaciones
        AnimationEngine.playIntroAnimation();
        AnimationEngine.setupFloatingElements();
        
        if (window.innerWidth >= 768) {
            AnimationEngine.setupParallax();
        }
        
        // 3. Responsive
        ResponsiveHandler.setupResponsiveListeners();
        ResponsiveHandler.setupOrientationListener();
        
        // Setup first section animation
        const firstSection = document.querySelector('.category-section.active');
        if (firstSection) {
            AnimationEngine.playSectionTransition(firstSection);
        }
        
        console.log('🎉 Aplicación lista!');
    }
};

// ========================================
// PUNTO DE ENTRADA
// ========================================
AppInitializer.initialize();
