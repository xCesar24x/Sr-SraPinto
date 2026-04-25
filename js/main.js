/**
 * Sr. & Sra. Pinto - Hub de Enlaces Interactivo
 * Sistema modular con GSAP animations
 * Mobile-first responsive architecture
 */

// ========================================
// MÓDULO: State Management
// ========================================
const StateManager = {
    currentCategory: 'menu1',
    
    setCategory(category) {
        this.currentCategory = category;
        return this;
    },
    
    getCategory() {
        return this.currentCategory;
    }
};

// ========================================
// MÓDULO: Cart Manager (Motor del Carrito)
// ========================================
const CartManager = {
    items: [],
    selectedPaymentMethod: 'Efectivo',
    customerName: '',
    
    init() {
        const savedCart = localStorage.getItem('srysrapinto_cart');
        if (savedCart) {
            try {
                this.items = JSON.parse(savedCart);
            } catch (e) {
                this.items = [];
            }
        }
        this.updateCartUI();
    },
    
    save() {
        localStorage.setItem('srysrapinto_cart', JSON.stringify(this.items));
    },
    
    addItem(productId) {
        const product = MenuController.getProductById(productId);
        if (!product) return;
        
        const existingItem = this.items.find(item => item.id === productId);
        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            this.items.push({
                ...product,
                quantity: 1
            });
        }
        
        this.save();
        this.updateCartUI();
        this.notifyAdd(product.nombre);
    },
    
    removeItem(productId) {
        const index = this.items.findIndex(item => item.id === productId);
        if (index > -1) {
            if (this.items[index].quantity > 1) {
                this.items[index].quantity -= 1;
            } else {
                this.items.splice(index, 1);
            }
        }
        this.save();
        this.updateCartUI();
    },

    deleteItem(productId) {
        this.items = this.items.filter(item => item.id !== productId);
        this.save();
        this.updateCartUI();
    },
    
    getTotal() {
        return this.items.reduce((sum, item) => sum + (item.precio * item.quantity), 0);
    },
    
    getCount() {
        return this.items.reduce((sum, item) => sum + item.quantity, 0);
    },
    
    updateCartUI() {
        const countBadge = document.getElementById('cart-count');
        const drawerCount = document.getElementById('drawer-count');
        const totalDisplay = document.getElementById('cart-total');
        const cartContent = document.getElementById('cart-items-container');
        
        if (countBadge) countBadge.textContent = this.getCount();
        if (drawerCount) drawerCount.textContent = this.getCount();
        if (totalDisplay) totalDisplay.textContent = `₡${this.getTotal().toLocaleString()}`;
        
        if (cartContent) {
            if (this.items.length === 0) {
                cartContent.innerHTML = `
                    <div style="text-align:center; padding: 40px 20px; opacity: 0.5;">
                        <i class="fas fa-shopping-basket" style="font-size: 3rem; margin-bottom: 15px;"></i>
                        <p>Tu carrito está vacío.<br>¡Antojate de algo!</p>
                    </div>
                `;
            } else {
                cartContent.innerHTML = this.items.map(item => `
                    <div class="cart-item">
                        <div class="cart-item-info">
                            <span class="cart-item-name">${item.nombre}</span>
                            <span class="cart-item-price">₡${(item.precio * item.quantity).toLocaleString()}</span>
                        </div>
                        <div class="cart-item-controls">
                            <button onclick="CartManager.removeItem('${item.id}')"><i class="fas fa-minus"></i></button>
                            <span>${item.quantity}</span>
                            <button onclick="CartManager.addItem('${item.id}')"><i class="fas fa-plus"></i></button>
                            <button class="delete-btn" onclick="CartManager.deleteItem('${item.id}')"><i class="fas fa-trash"></i></button>
                        </div>
                    </div>
                `).join('');
            }
        }

        // Update visual de chips de pago
        document.querySelectorAll('.pay-chip').forEach(chip => {
            const method = chip.dataset.method;
            if (this.selectedPaymentMethod === method) {
                chip.classList.add('active');
            } else {
                chip.classList.remove('active');
            }
        });

        // Actualizar los botones de agregar en el menú
        document.querySelectorAll('.mch-add-btn').forEach(btn => {
            btn.innerHTML = '<i class="fas fa-plus"></i>';
        });
        this.items.forEach(item => {
            const btn = document.getElementById(`add-btn-${item.id}`);
            if (btn) {
                btn.innerHTML = `<span style="font-weight: bold; font-size: 1.2rem;">${item.quantity}</span>`;
            }
        });

        // Toggle visibility of checkout button
        const checkoutBtn = document.getElementById('btn-checkout');
        if (checkoutBtn) {
            checkoutBtn.style.display = this.items.length > 0 ? 'flex' : 'none';
        }
    },

    setPaymentMethod(method) {
        this.selectedPaymentMethod = method;
        this.updateCartUI();
        
        if (navigator.vibrate) {
            navigator.vibrate(50);
        }
    },

    updateName(name) {
        this.customerName = name;
    },

    notifyAdd(productName) {
        const toast = document.createElement('div');
        toast.className = 'cart-toast';
        toast.innerHTML = `<i class="fas fa-check-circle"></i> ${productName} añadido`;
        document.body.appendChild(toast);
        
        setTimeout(() => toast.classList.add('show'), 100);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 500);
        }, 2000);
    },

    enviarPedidoWhatsApp() {
        if (this.items.length === 0) return;

        let itemsList = '';
        this.items.forEach(item => {
            itemsList += `* ✅ ${item.quantity}x ${item.nombre} — ₡${(item.precio * item.quantity).toLocaleString()}\n`;
        });

        let message = `☕ *NUEVO PEDIDO — Sr. & Sra. Pinto*\n\n`;
        
        if (this.customerName) {
            message += `👤 *Cliente:* ${this.customerName}\n\n`;
        }

        message += `📝 *Detalle del pedido:*\n${itemsList}\n`;
        message += `💰 *TOTAL: ₡${this.getTotal().toLocaleString()}*\n`;
        message += `💳 *Método de pago:* ${this.selectedPaymentMethod}\n\n`;
        
        if (this.selectedPaymentMethod === 'SINPE Móvil') {
            message += `📌 _Realizar SINPE al 8802-5793 y enviar comprobante._\n\n`;
        }

        message += `_Por favor confirmar disponibilidad 🙏_`;

        const encodedMessage = encodeURIComponent(message);
        // Usamos la API de envío directo para garantizar que el texto dinámico se procese correctamente
        const whatsappUrl = `https://api.whatsapp.com/send?phone=50688025793&text=${encodedMessage}`;
        
        // Neuro-selling: Feedback visual antes de redirigir
        const checkoutBtn = document.getElementById('btn-checkout');
        if (checkoutBtn) {
            checkoutBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Preparando tu pedido...';
            checkoutBtn.style.background = 'var(--negro)';
        }

        setTimeout(() => {
            console.log('🔗 Abriendo WhatsApp:', whatsappUrl);
            window.open(whatsappUrl, '_blank');
            
            if (checkoutBtn) {
                checkoutBtn.innerHTML = '<i class="fab fa-whatsapp"></i> Finalizar Pedido';
                checkoutBtn.style.background = '';
            }

            // Mostrar Modal de Éxito
            const successModal = document.getElementById('success-overlay');
            if (successModal) {
                successModal.classList.add('active');
            }
            
            // Cerrar el Drawer del carrito
            UIController.toggleCart();
        }, 800);
    },

    resetAndClose() {
        // Limpiar items
        this.items = [];
        this.save();
        this.updateCartUI();
        
        // Limpiar nombre y campos
        this.customerName = '';
        const nameInput = document.getElementById('order-name');
        if (nameInput) nameInput.value = '';

        // Cerrar modal
        const successModal = document.getElementById('success-overlay');
        if (successModal) {
            successModal.classList.remove('active');
        }

        // Feedback visual
        window.scrollTo({ top: 0, behavior: 'smooth' });
    },
};

// ========================================
// MÓDULO: Menu Controller (Renderizado)
// ========================================
const MenuController = {
    MENU_DATA: [

        // ── PINTOS: Desayunos con gallo pinto ──
        {
            id: 'p-senor-pinto',
            categoria: 'pintos',
            nombre: 'Señor Pinto',
            desc: 'Delicioso gallo pinto con queso, plátano, huevo y natilla.',
            precio: 3500,
            img: '<img src="images-catalogo/arreglada.jpeg" alt="Señor Pinto">',
            badge: 'Recomendado',
            badgeClass: 'badge-chef'
        },
        {
            id: 'c-senor-pinto-cafe',
            categoria: 'pintos',
            nombre: 'Combo: Señor Pinto + Café',
            desc: 'Lleválo en combo: Señor Pinto + Café Premium Grande.',
            precio: 4000,
            img: '<div style="font-size: 3rem; display: flex; align-items: center; justify-content: center; width: 100%; height: 100%;">☕🍳</div>',
            badge: 'Combo',
            badgeClass: 'badge-value'
        },
        {
            id: 'p-burrote',
            categoria: 'pintos',
            nombre: 'Burrote de Pinto',
            desc: 'Delicioso gallo pinto con queso, huevo y natilla.',
            precio: 3000,
            img: '<div style="font-size: 3rem; display: flex; align-items: center; justify-content: center; width: 100%; height: 100%;">🌯</div>'
        },
        {
            id: 'c-burrote-cafe',
            categoria: 'pintos',
            nombre: 'Combo: Burrote de Pinto + Café',
            desc: 'Lleválo en combo: Burrote de Pinto + Café Premium Grande.',
            precio: 3500,
            img: '<div style="font-size: 3rem; display: flex; align-items: center; justify-content: center; width: 100%; height: 100%;">🌯☕</div>',
            badge: 'Combo',
            badgeClass: 'badge-value'
        },
        {
            id: 'p-empanada-pinto',
            categoria: 'pintos',
            nombre: 'Empanada de Pinto',
            desc: 'Deliciosa empanada rellena de gallo pinto.',
            precio: 2000,
            img: '<img src="images-catalogo/empanadas.jpeg" alt="Empanada de Pinto">'
        },
        {
            id: 'p-sra-empanada-m1',
            categoria: 'pintos',
            nombre: 'Sra. Empanada Arreglada',
            desc: 'Empanada de Pinto acompañada de papas fritas, repollo y nuestra salsa especial de la casa.',
            precio: 3000,
            img: '<img src="images-catalogo/papas.jpeg" alt="Sra. Empanada Arreglada">',
            badge: '¡El más pedido!',
            badgeClass: 'badge-popular'
        },

        // ── SNACKS: Empanadas, Patacones y más ──
        {
            id: 'p-empanada-mozzarella',
            categoria: 'snacks',
            nombre: 'Empanada de Queso Mozzarella',
            desc: 'Empanada artesanal rellena de queso mozzarella derretido.',
            precio: 2000,
            img: '<img src="images-catalogo/empanadas.jpeg" alt="Empanada de Queso Mozzarella">'
        },
        {
            id: 'p-empanada-birria',
            categoria: 'snacks',
            nombre: 'Empanada de Birria - Carne Res',
            desc: 'Empanada artesanal rellena de jugosa carne de birria de res.',
            precio: 2000,
            img: '<div style="font-size: 3rem; display: flex; align-items: center; justify-content: center; width: 100%; height: 100%;">🥩</div>'
        },
        {
            id: 'p-sra-empanada-m2',
            categoria: 'snacks',
            nombre: 'Sra. Empanada Arreglada',
            desc: '(Queso o Carne) — Acompañada de papas fritas, repollo y nuestra salsa especial de la casa.',
            precio: 3000,
            img: '<img src="images-catalogo/papas.jpeg" alt="Sra. Empanada Arreglada">',
            badge: '¡El más pedido!',
            badgeClass: 'badge-popular'
        },
        {
            id: 'p-sr-patacon',
            categoria: 'snacks',
            nombre: 'Sr. Patacón',
            desc: 'Con carne de birria y queso mozzarella.',
            precio: 3000,
            img: '<div style="font-size: 3rem; display: flex; align-items: center; justify-content: center; width: 100%; height: 100%;">🫓</div>',
            badge: 'Especial',
            badgeClass: 'badge-chef'
        },
        {
            id: 'p-sra-quesadilla',
            categoria: 'snacks',
            nombre: 'Sra. Quesadilla',
            desc: 'Con carne de birria y queso mozzarella.',
            precio: 3000,
            img: '<div style="font-size: 3rem; display: flex; align-items: center; justify-content: center; width: 100%; height: 100%;">🫔</div>'
        },
        {
            id: 'p-sra-hamburguesa',
            categoria: 'snacks',
            nombre: 'Sra. Hamburguesa con Papas',
            desc: 'Jugosa hamburguesa acompañada de papas fritas.',
            precio: 4000,
            img: '<img src="images-catalogo/burguer.jpeg" alt="Sra. Hamburguesa con Papas">',
            badge: 'Favorito',
            badgeClass: 'badge-popular'
        },
        {
            id: 'p-sr-cono-salchipapas',
            categoria: 'snacks',
            nombre: 'Sr. Cono de SalchiPapas',
            desc: 'Cono generoso de salchipapas, perfecto para compartir.',
            precio: 2500,
            img: '<div style="font-size: 3rem; display: flex; align-items: center; justify-content: center; width: 100%; height: 100%;">🌭🍟</div>'
        },
        {
            id: 'p-aros-cebolla',
            categoria: 'snacks',
            nombre: 'Aros de Cebolla',
            desc: 'Crujientes aros de cebolla dorados al momento.',
            precio: 2000,
            img: '<div style="font-size: 3rem; display: flex; align-items: center; justify-content: center; width: 100%; height: 100%;">🧅</div>'
        },
        {
            id: 'p-palitos-queso',
            categoria: 'snacks',
            nombre: 'Palitos de Queso Mozzarella',
            desc: 'Palitos de mozzarella crujientes por fuera y derretidos por dentro.',
            precio: 2000,
            img: '<div style="font-size: 3rem; display: flex; align-items: center; justify-content: center; width: 100%; height: 100%;">🧀</div>'
        },

        // ── BEBIDAS (compartidas) ──
        {
            id: 'b-cafe-premium',
            categoria: 'bebidas',
            nombre: 'Café Premium Grande (12 onzas)',
            desc: 'Café de calidad premium, recién hecho.',
            precio: 1000,
            img: '<img src="assets/images/logo2.png" alt="Café" style="object-fit: contain;">'
        },
        {
            id: 'b-agua',
            categoria: 'bebidas',
            nombre: 'Agua',
            desc: 'Agua embotellada fresca.',
            precio: 1000,
            img: '<div style="font-size: 3rem; display: flex; align-items: center; justify-content: center; width: 100%; height: 100%;">💧</div>'
        },
        {
            id: 'b-gaseosas',
            categoria: 'bebidas',
            nombre: 'Gaseosas',
            desc: 'Refrescantes gaseosas bien frías.',
            precio: 1200,
            img: '<div style="font-size: 3rem; display: flex; align-items: center; justify-content: center; width: 100%; height: 100%;">🥤</div>'
        },
        {
            id: 'b-hidratante',
            categoria: 'bebidas',
            nombre: 'Bebidas Hidratantes',
            desc: 'Para recuperar energías y mantenerte hidratado.',
            precio: 1300,
            img: '<div style="font-size: 3rem; display: flex; align-items: center; justify-content: center; width: 100%; height: 100%;">🧃</div>'
        }
    ],

    getProductById(id) {
        return this.MENU_DATA.find(p => p.id === id);
    },

    CATEGORIAS: [
        { id: 'pintos',  nombre: 'Pintos',  icon: '🍳', subtitle: 'Gallo pinto hecho con amor, igual de malo pa' la dieta 😉' },
        { id: 'snacks',  nombre: 'Snacks',  icon: '🥟', subtitle: 'Empanadas, patacones y más antojos irresistibles' },
        { id: 'bebidas', nombre: 'Bebidas', icon: '☕' }
    ],

    init() {
        this.renderSidebar();
        this.renderCategory('pintos');
    },

    renderSidebar() {
        const sidebar = document.getElementById('sidebar-categories');
        if (!sidebar) return;

        sidebar.innerHTML = this.CATEGORIAS.map(cat => `
            <button class="sidebar-btn ${cat.id === StateManager.currentCategory ? 'active' : ''}" onclick="MenuController.renderCategory('${cat.id}')" data-cat="${cat.id}">
                <span>${cat.icon}</span> ${cat.nombre}
            </button>
        `).join('');
    },

    renderCategory(categoryId) {
        StateManager.setCategory(categoryId);
        const container = document.getElementById('menu-dynamic-content');
        const titleEl = document.getElementById('current-category-title');
        const countEl = document.getElementById('current-category-count');
        if (!container) return;

        // Update sidebar active state
        document.querySelectorAll('.sidebar-btn').forEach(btn => {
            if (btn.dataset.cat === categoryId) btn.classList.add('active');
            else btn.classList.remove('active');
        });

        const categoryInfo = this.CATEGORIAS.find(c => c.id === categoryId);
        if (titleEl) {
            titleEl.innerHTML = `${categoryInfo.icon} ${categoryInfo.nombre}${
                categoryInfo.subtitle
                    ? ` <span style="font-size:0.75rem; font-weight:500; opacity:0.6; font-family:'Montserrat',sans-serif; letter-spacing:0;">${categoryInfo.subtitle}</span>`
                    : ''
            }`;
        }

        const filtered = this.MENU_DATA.filter(p => p.categoria === categoryId);
        if (countEl) countEl.innerText = `${filtered.length} opciones`;
        
        container.style.opacity = '0';
        container.style.transform = 'translateY(10px)';
        
        setTimeout(() => {
            container.innerHTML = filtered.map(product => {
                const cartItem = CartManager.items.find(i => i.id === product.id);
                const btnContent = cartItem ? `<span style="font-weight: bold; font-size: 1.2rem;">${cartItem.quantity}</span>` : `<i class="fas fa-plus"></i>`;
                return `
                <div class="menu-card-h ${product.badgeClass ? 'highlight-item' : ''}">
                    <div class="mch-img">${product.img}</div>
                    <div class="mch-info">
                        <div class="mch-title">${product.nombre} ${product.badge ? `<span class="mch-badge">${product.badge}</span>` : ''}</div>
                        <div class="mch-desc">${product.desc}</div>
                        <div class="mch-price-row">
                            <span class="mch-price">₡${product.precio.toLocaleString()}</span>
                        </div>
                    </div>
                    <button class="mch-add-btn" id="add-btn-${product.id}" onclick="CartManager.addItem('${product.id}')">
                        ${btnContent}
                    </button>
                </div>
            `}).join('');
            
            gsap.to(container, { opacity: 1, y: 0, duration: 0.4 });
        }, 150);
    }
};


// ========================================
// MÓDULO: UI Controller (Views & Cart)
// ========================================
const UIController = {
    showMenu() {
        const hub = document.getElementById('view-hub');
        const menu = document.getElementById('view-menu');
        if(!hub || !menu) return;
        
        hub.classList.remove('active');
        hub.classList.add('hidden');
        
        menu.classList.remove('hidden');
        menu.classList.add('active');
        
        window.scrollTo(0,0);
        
        if (navigator.vibrate) navigator.vibrate(50);
    },
    
    showHub() {
        const hub = document.getElementById('view-hub');
        const menu = document.getElementById('view-menu');
        if(!hub || !menu) return;
        
        menu.classList.remove('active');
        menu.classList.add('hidden');
        
        hub.classList.remove('hidden');
        hub.classList.add('active');
        
        if (navigator.vibrate) navigator.vibrate(50);
    },
    
    toggleCart() {
        const drawer = document.getElementById('cart-drawer');
        if(drawer) drawer.classList.toggle('hidden');
    }
};

// Toggle cart from FAB
document.addEventListener('DOMContentLoaded', () => {
    const cartFab = document.getElementById('cart-fab');
    if (cartFab) {
        cartFab.addEventListener('click', () => UIController.toggleCart());
    }
    const cartCloseBtn = document.getElementById('cart-close-btn');
    if (cartCloseBtn) {
        cartCloseBtn.addEventListener('click', () => UIController.toggleCart());
    }
    
    // Initialize Menu
    MenuController.init();
});

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
        .from('.tab-btn', {
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
                '.menu-item-card, .link-card'
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
        gsap.utils.toArray('.tab-btn').forEach((btn) => {
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
        gsap.to('.menu-img', {
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
                
                gsap.to('.menu-item-card', {
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
                    gsap.killTweensOf('.menu-item-card');
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
        
        // 1.5 Setup Cart & Menu
        CartManager.init();
        MenuController.renderCategory('pintos'); 

        // Setup Drawer
        const cartToggle = document.getElementById('cart-fab');
        const cartClose = document.getElementById('cart-close-btn');
        const cartDrawer = document.getElementById('cart-drawer');

        if (cartToggle && cartDrawer) {
            cartToggle.addEventListener('click', () => {
                cartDrawer.classList.remove('hidden');
            });
        }

        if (cartClose && cartDrawer) {
            cartClose.addEventListener('click', () => {
                cartDrawer.classList.add('hidden');
            });
        }

        
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
