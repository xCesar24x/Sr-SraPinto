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

        // Feedback visual: destello verde en la tarjeta
        const card = document.getElementById(`card-${productId}`);
        if (card) {
            card.classList.remove('card-added');
            void card.offsetWidth; // reflow para reiniciar animación
            card.classList.add('card-added');
        }
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

        // Actualizar total en el FAB
        const fabTotal = document.getElementById('cart-fab-total');
        if (fabTotal) {
            fabTotal.textContent = this.getTotal() > 0 ? `₡${this.getTotal().toLocaleString()}` : '₡0';
        }
        
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
        
        const url = `https://wa.me/message/OJWZEA6DWF35L1?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
    }
};

// ========================================
// MÓDULO: Menu Controller (Motor de Carga)
// ========================================
const MenuController = {
    MENU_DATA: [
        // ── PINTOS ──
        {
            id: 'p-senor-pinto',
            categoria: 'pintos',
            nombre: 'Señor Pinto',
            desc: 'Tradicional gallo pinto con queso frito, huevo y maduros.',
            precio: 3500,
            img: '<img src="images-catalogo/Señor Pinto.jpeg" alt="Señor Pinto">'
        },
        {
            id: 'c-senor-pinto-cafe',
            categoria: 'pintos',
            nombre: 'Combo: Señor Pinto + Café',
            desc: 'Lleválo en combo: Señor Pinto + Café Premium Grande.',
            precio: 4000,
            img: '<img src="images-catalogo/ComboSeñorPintoCafé.jpg" alt="Combo Señor Pinto + Café" class="img-fit">',
            badge: 'Combo',
            badgeClass: 'badge-value'
        },
        {
            id: 'p-burrote',
            categoria: 'pintos',
            nombre: 'Burrote de Pinto',
            desc: 'Delicioso gallo pinto con queso, huevo y natilla.',
            precio: 3000,
            img: '<img src="images-catalogo/BurrotedePinto.jpg" alt="Burrote de Pinto">'
        },
        {
            id: 'c-burrote-cafe',
            categoria: 'pintos',
            nombre: 'Combo: Burrote de Pinto + Café',
            desc: 'Lleválo en combo: Burrote de Pinto + Café Premium Grande.',
            precio: 3500,
            img: '<img src="images-catalogo/BurrotedePintocafe.jpg" alt="Combo Burrote de Pinto + Café" class="img-fit">',
            badge: 'Combo',
            badgeClass: 'badge-value'
        },
        {
            id: 'p-empanada-pinto',
            categoria: 'pintos',
            nombre: 'Empanada de Pinto',
            desc: 'Crujiente empanada rellena de nuestro famoso gallo pinto.',
            precio: 2500,
            img: '<img src="images-catalogo/empanadas.jpeg" alt="Empanada de Pinto">'
        },
        {
            id: 'p-sra-empanada-m1',
            categoria: 'pintos',
            nombre: 'Sra. Empanada Arreglada',
            desc: 'Empanada de pinto con ensalada, carne mechada y salsas.',
            precio: 3500,
            img: '<img src="images-catalogo/Sra. Empanada Arreglada .jpeg" alt="Sra. Empanada Arreglada">'
        },
        {
            id: 'p-queso-pinto',
            categoria: 'pintos',
            nombre: 'Queso Pinto',
            desc: 'Delicioso gallo pinto con abundante queso.',
            precio: 3500,
            img: '<img src="images-catalogo/Queso Pinto.jpeg" alt="Queso Pinto">'
        },

        // ── SNACKS & ANTOJOS ──
        {
            id: 'p-sr-patacon',
            categoria: 'snacks',
            nombre: 'Sr. Patacón',
            desc: 'Patacones crujientes con frijoles molidos y queso.',
            precio: 4000,
            img: '<img src="images-catalogo/Sr. Patacón.jpeg" alt="Sr. Patacón">'
        },
        {
            id: 'p-sra-quesadilla',
            categoria: 'snacks',
            nombre: 'Sra. Quesadilla',
            desc: 'Tortilla de harina con queso fundido y carne.',
            precio: 4000,
            img: '<img src="images-catalogo/Sra. Quesadilla.jpeg" alt="Sra. Quesadilla">'
        },
        {
            id: 'p-sra-hamburguesa',
            categoria: 'snacks',
            nombre: 'Sra. Hamburguesa con Papas',
            desc: 'Hamburguesa casera con papas fritas crujientes.',
            precio: 5000,
            img: '<img src="images-catalogo/Sra. Hamburguesa con Papas.jpeg" alt="Sra. Hamburguesa con Papas">'
        },
        {
            id: 'p-empanada-carne',
            categoria: 'snacks',
            nombre: 'Empanada de Carne',
            desc: 'Empanada artesanal rellena de carne bien sazonada.',
            precio: 2500,
            img: '<img src="images-catalogo/empanadas.jpeg" alt="Empanada de Carne">'
        },
        {
            id: 'p-empanada-queso',
            categoria: 'snacks',
            nombre: 'Empanada de Queso Mozzarella',
            desc: 'Empanada artesanal rellena de queso mozzarella derretido.',
            precio: 2500,
            img: '<img src="images-catalogo/empanadas.jpeg" alt="Empanada de Queso Mozzarella">'
        },
        {
            id: 'p-empanada-birria',
            categoria: 'snacks',
            nombre: 'Empanada de Birria - Carne Res',
            desc: 'Empanada artesanal rellena de jugosa carne de birria de res.',
            precio: 2500,
            img: '<img src="images-catalogo/empanadas.jpeg" alt="Empanada de Birria - Carne Res">'
        },
        {
            id: 'p-sra-empanada-m2',
            categoria: 'snacks',
            nombre: 'Sra. Empanada Arreglada',
            desc: 'Empanada de Carne o Queso con ensalada y salsas.',
            precio: 3500,
            img: '<img src="images-catalogo/Sra. Empanada Arreglada .jpeg" alt="Sra. Empanada Arreglada">'
        },
        {
            id: 'p-cono-salchipapa',
            categoria: 'snacks',
            nombre: 'Sr. Cono de SalchiPapas',
            desc: 'Papas fritas con salchicha y salsas de la casa.',
            precio: 3000,
            img: '<img src="images-catalogo/Sr. Cono de SalchiPapas.jpeg" alt="Sr. Cono de SalchiPapas">'
        },
        {
            id: 'p-sr-papi-carne',
            categoria: 'snacks',
            nombre: 'Sr. Papi Carne',
            desc: 'Deliciosa porción de carne preparada al estilo de la casa.',
            precio: 3500,
            img: '<img src="images-catalogo/Sr. Papi Carne.jpeg" alt="Sr. Papi Carne">'
        },


        // ── BEBIDAS (compartidas) ──
        {
            id: 'b-cafe-premium',
            categoria: 'bebidas',
            nombre: 'Café Premium Grande (12 onzas)',
            desc: 'Café de calidad premium, recién hecho.',
            precio: 1000,
            img: '<img src="images-catalogo/12onzas.jpg" alt="Café Premium" class="img-fit">'
        },
        {
            id: 'b-agua',
            categoria: 'bebidas',
            nombre: 'Agua',
            desc: 'Agua embotellada fresca.',
            precio: 1000,
            img: '<img src="images-catalogo/agua.jpg" alt="Agua" class="img-fit">'
        },
        {
            id: 'b-gaseosas',
            categoria: 'bebidas',
            nombre: 'Gaseosas',
            desc: 'Refrescantes gaseosas bien frías.',
            precio: 1200,
            img: '<img src="images-catalogo/gaseosas.jpg" alt="Gaseosas" class="img-fit">'
        },
        {
            id: 'b-hidratante',
            categoria: 'bebidas',
            nombre: 'Bebidas Hidratantes',
            desc: 'Para recuperar energías y mantenerte hidratado.',
            precio: 1300,
            img: '<img src="images-catalogo/hidratantes.jpg?v=1.1" alt="Bebidas Hidratantes" class="img-fit">'
        }
    ],

    getProductById(id) {
        return this.MENU_DATA.find(p => p.id === id);
    },

    CATEGORIAS: [
        { id: 'pintos',  nombre: 'Desayunos',  icon: '🍳', subtitle: 'Gallo pinto hecho con amor, igual de malo pa\u2019 la dieta 😉' },
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
                    ? `<span>${categoryInfo.subtitle}</span>`
                    : ''
            }`;
        }

        const filtered = this.MENU_DATA.filter(p => p.categoria === categoryId);
        if (countEl) countEl.innerText = `${filtered.length} opciones`;
        
        container.style.opacity = '1';
        container.style.transform = 'none';
        
        setTimeout(() => {
            container.innerHTML = filtered.map(product => {
                const cartItem = CartManager.items.find(i => i.id === product.id);
                const btnContent = cartItem ? `<span style="font-weight: bold; font-size: 1.2rem;">${cartItem.quantity}</span>` : `<i class="fas fa-plus"></i>`;
                return `
                <div class="menu-card-h ${product.badgeClass ? 'highlight-item' : ''}" id="card-${product.id}">
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

            // Stagger animation: aparecen una tras otra
            const cards = container.querySelectorAll('.menu-card-h');
            cards.forEach((card, index) => {
                setTimeout(() => {
                    card.style.transition = `opacity 0.3s ease ${index * 0.07}s, transform 0.3s ease ${index * 0.07}s`;
                    card.classList.add('card-visible');
                }, 50);
            });
        }, 100);
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
        // Lógica de animación...
    },
    
    setupFloatingElements() {
        // Lógica de flotación...
    },
    
    setupParallax() {
        // Lógica parallax...
    },
    
    playSectionTransition(section) {
        gsap.from(section, {
            duration: 0.8,
            y: 30,
            opacity: 0,
            ease: 'power3.out'
        });
    }
};

// ========================================
// MÓDULO: Responsive & Event Handlers
// ========================================
const ResponsiveHandler = {
    setupResponsiveListeners() {
        // Listener logic...
    },
    setupOrientationListener() {
        // Orientation logic...
    }
};

// ========================================
// MÓDULO: Inicializador Global
// ========================================
const AppInitializer = {
    initialize() {
        // 1. Core Managers
        CartManager.init();
        
        // Los listeners del carrito se manejan en DOMContentLoaded
        // 2. Animaciones
        AnimationEngine.playIntroAnimation();
        AnimationEngine.setupFloatingElements();
        
        if (window.innerWidth >= 768) {
            AnimationEngine.setupParallax();
        }
        
        // 3. Responsive
        ResponsiveHandler.setupResponsiveListeners();
        ResponsiveHandler.setupOrientationListener();
        
        console.log('🎉 Aplicación lista!');
    }
};

// ========================================
// PUNTO DE ENTRADA
// ========================================
AppInitializer.initialize();