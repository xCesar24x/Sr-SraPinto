/**
 * Sr. & Sra. Pinto - Hub de Enlaces Interactivo
 * Sistema modular con GSAP animations
 * Mobile-first responsive architecture
 */

// ========================================
// REGLAS GLOBALES DE PLATILLOS Y OPCIONES
// ========================================
window.isEmpanadaDish = function(dish) {
    if (!dish) return false;
    if (dish.requiresOptions === true) return true;
    const id = (dish.id || '').toLowerCase();
    const nombre = (dish.nombre || '').toLowerCase();
    return id.includes('empanada') || nombre.includes('empanada');
};

window.isCafeCombo = function(dish) {
    if (!dish) return false;
    const id = (dish.id || '').toLowerCase();
    const nombre = (dish.nombre || '').toLowerCase();
    return id.includes('cafe') || id.includes('café') || nombre.includes('+ café') || nombre.includes('+ cafe') || (nombre.includes('combo') && (nombre.includes('café') || nombre.includes('cafe')));
};

window.isComboDish = function(dish) {
    if (!dish) return false;
    if (dish.badge && dish.badge.toLowerCase().includes('combo')) return true;
    if (dish.badgeClass && (dish.badgeClass.includes('highlight') || dish.badgeClass.includes('badge-value'))) return true;
    const id = (dish.id || '').toLowerCase();
    const nombre = (dish.nombre || '').toLowerCase();
    if (id.startsWith('b-cafe') || id === 'b-cafe-8oz' || id === 'b-cafe-12oz') return false;
    return nombre.includes('combo') || id.includes('combo') || nombre.includes('+ café') || nombre.includes('+ cafe') || (id.includes('cafe') && (id.includes('pinto') || id.includes('empanada') || id.includes('burrote')));
};

// ========================================
// 6 OPCIONES OFICIALES DE EMPANADAS (CANÓNICAS)
// ========================================
window.CANONICAL_EMPANADAS = [
    {
        id: 'p-empanada-sencilla',
        nombre: 'Empanada Sencilla',
        categoria: 'snacks',
        desc: 'Crujiente empanada artesanal de maíz frita. Elige tu relleno favorito.',
        ingredientes: 'Masa de maíz sazonada, relleno a elegir (queso, carne o pinto)',
        precio: 1400,
        costo: 800,
        img: 'images-catalogo/empanadas.jpeg',
        requiresOptions: true,
        options: ['Queso', 'Carne', 'Pinto', 'Carne y Queso']
    },
    {
        id: 'v-1791030289012',
        nombre: 'Combo: Empanada Sencilla + Café',
        categoria: 'desayuno',
        desc: 'Empanada sencilla a elegir + Café Premium Grande.',
        ingredientes: 'Empanada sencilla a elegir + café chorreado 12oz',
        precio: 1900,
        costo: 1050,
        img: 'images-catalogo/empanadas.jpeg',
        badge: 'Combo',
        badgeClass: 'badge-value',
        requiresOptions: true,
        options: ['Queso', 'Carne', 'Pinto', 'Carne y Queso']
    },
    {
        id: 'p-empanada-arreglada',
        nombre: 'Empanada Arreglada',
        categoria: 'snacks',
        desc: 'Empanada crujiente con repollo arreglado, salsas y relleno a elegir.',
        ingredientes: 'Empanada artesanal, ensalada de repollo, salsas de la casa',
        precio: 1800,
        costo: 950,
        img: 'images-catalogo/Sra. Empanada Arreglada .jpeg',
        requiresOptions: true,
        options: ['Queso', 'Carne', 'Pinto', 'Carne y Queso']
    },
    {
        id: 'v-1790059042629',
        nombre: 'Combo: Empanada Arreglada + Café',
        categoria: 'desayuno',
        desc: 'Empanada arreglada con repollo y salsas + Café Premium Grande.',
        ingredientes: 'Empanada arreglada a elegir + café chorreado 12oz',
        precio: 2300,
        costo: 1200,
        img: 'images-catalogo/Sra. Empanada Arreglada .jpeg',
        badge: 'Combo',
        badgeClass: 'badge-value',
        requiresOptions: true,
        options: ['Queso', 'Carne', 'Pinto', 'Carne y Queso']
    },
    {
        id: 'v-1790058848755',
        nombre: 'Señora Empanada',
        categoria: 'snacks',
        desc: 'Nuestra empanada insignia con repollo, carne mechada extra por encima y salsas.',
        ingredientes: 'Empanada grande, ensalada de repollo fresco, carne mechada extra, salsas de la casa',
        precio: 2300,
        costo: 1100,
        img: 'images-catalogo/Sra. Empanada Arreglada .jpeg',
        requiresOptions: true,
        options: ['Queso', 'Carne', 'Pinto', 'Carne y Queso']
    },
    {
        id: 'v-1790059143341',
        nombre: 'Combo: Señora Empanada + Café',
        categoria: 'desayuno',
        desc: 'Señora empanada arreglada con carne extra + Café Premium Grande.',
        ingredientes: 'Señora empanada a elegir + café chorreado 12oz',
        precio: 2800,
        costo: 1350,
        img: 'images-catalogo/Sra. Empanada Arreglada .jpeg',
        badge: 'Combo',
        badgeClass: 'badge-value',
        requiresOptions: true,
        options: ['Queso', 'Carne', 'Pinto', 'Carne y Queso']
    }
];


// ========================================
// MÓDULO: State Management
// ========================================
const StateManager = {
    currentCategory: 'desayuno',
    
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
    customerPhone: '',
    isDefaultName: true,
    siguienteNumeroComanda: 1,
    hasAllergies: false,
    allergiesText: '',
    editingOrderId: null,
    
    init() {
        const savedCart = localStorage.getItem('srysrapinto_cart');
        if (savedCart) {
            try {
                this.items = JSON.parse(savedCart);
            } catch (e) {
                this.items = [];
            }
        }

        const isSalesPOS = window.location.pathname.includes('ventas') || window.location.href.includes('ventas');
        if (isSalesPOS) {
            const listenToTurno = () => {
                if (window.FirebaseDB) {
                    window.FirebaseDB.collection('config').doc('turno').onSnapshot((doc) => {
                        if (doc.exists) {
                            const data = doc.data();
                            this.siguienteNumeroComanda = data.siguiente_numero || 1;
                        } else {
                            this.siguienteNumeroComanda = 1;
                        }
                        this.syncDefaultCustomerName();
                    }, (err) => {
                        console.warn("Aviso al escuchar turno:", err);
                    });
                } else {
                    setTimeout(listenToTurno, 300);
                }
            };
            listenToTurno();
        }

        this.updateCartUI();
    },

    syncDefaultCustomerName() {
        const isSalesPOS = window.location.pathname.includes('ventas') || window.location.href.includes('ventas');
        if (!isSalesPOS) return;
        if (this.editingOrderId) return; // Si estamos modificando, respetar el cliente existente

        const defaultName = `Comanda #${this.siguienteNumeroComanda || 1}`;
        const nameInput = document.getElementById('order-name');

        if (!this.customerName || this.customerName.trim() === '' || this.isDefaultName || this.customerName.startsWith('Comanda #')) {
            this.customerName = defaultName;
            this.isDefaultName = true;
            if (nameInput) {
                nameInput.value = defaultName;
            }
        }
    },
    
    save() {
        localStorage.setItem('srysrapinto_cart', JSON.stringify(this.items));
    },
    
    addItem(productId, option = null) {
        const product = MenuController.getProductById(productId);
        if (!product) return;
        
        const isEmp = (window.isEmpanadaDish && window.isEmpanadaDish(product)) ||
                      product.requiresOptions === true ||
                      (product.id && product.id.toLowerCase().includes('empanada')) ||
                      (product.nombre && product.nombre.toLowerCase().includes('empanada'));

        if (isEmp && !option) {
            product.requiresOptions = true;
            if (!product.options || product.options.length === 0) {
                product.options = ['Queso', 'Carne', 'Pinto', 'Carne y Queso'];
            }
            UIController.showOptionsModal(product);
            return;
        }

        const cartItemId = option ? `${productId}-${option.replace(/\s+/g, '-')}` : productId;
        const cartItemName = option ? `${product.nombre} (${option})` : product.nombre;

        const existingItem = this.items.find(item => item.cartId === cartItemId || (!item.cartId && item.id === cartItemId));
        
        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            this.items.push({
                ...product,
                cartId: cartItemId,
                option: option,
                nombre: cartItemName,
                quantity: 1
            });
        }
        
        this.save();
        this.updateCartUI();
        this.notifyAdd(cartItemName);

        // Feedback visual: destello verde en la tarjeta
        const card = document.getElementById(`card-${productId}`);
        if (card) {
            card.classList.remove('card-added');
            void card.offsetWidth; // reflow para reiniciar animación
            card.classList.add('card-added');
        }
    },
    
    removeItem(cartId) {
        const index = this.items.findIndex(item => item.cartId === cartId || (!item.cartId && item.id === cartId));
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

    deleteItem(cartId) {
        this.items = this.items.filter(item => !(item.cartId === cartId || (!item.cartId && item.id === cartId)));
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
        
        // Update editing banner in cart drawer
        const editBanner = document.getElementById('cart-edit-banner');
        const editBannerText = document.getElementById('cart-edit-banner-text');
        if (editBanner) {
            if (this.editingOrderId) {
                editBanner.style.display = 'flex';
                const bannerName = document.getElementById('editing-customer-name');
                if (editBannerText) {
                    editBannerText.innerText = bannerName ? `Modificando Comanda: ${bannerName.innerText}` : 'Modificando Comanda';
                }
            } else {
                editBanner.style.display = 'none';
            }
        }
        
        if (countBadge) countBadge.textContent = this.getCount();
        if (drawerCount) drawerCount.textContent = this.getCount();
        if (totalDisplay) totalDisplay.textContent = `₡${this.getTotal().toLocaleString()}`;

        // Actualizar total en el FAB
        const fabTotal = document.getElementById('cart-fab-total');
        if (fabTotal) {
            fabTotal.textContent = this.getTotal() > 0 ? `₡${this.getTotal().toLocaleString()}` : '₡0';
        }

        // Sincronizar UI del nuevo panel táctil POS si está activo
        if (window.PosManager && typeof window.PosManager.syncCartUI === 'function') {
            window.PosManager.syncCartUI();
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
                            <button onclick="CartManager.removeItem('${item.cartId || item.id}')"><i class="fas fa-minus"></i></button>
                            <span>${item.quantity}</span>
                            <button onclick="CartManager.addItem('${item.id}', ${item.option ? `'${item.option}'` : 'null'})"><i class="fas fa-plus"></i></button>
                            <button class="delete-btn" onclick="CartManager.deleteItem('${item.cartId || item.id}')"><i class="fas fa-trash"></i></button>
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
                const allOfThis = this.items.filter(i => i.id === item.id);
                const totalQty = allOfThis.reduce((s, i) => s + i.quantity, 0);
                btn.innerHTML = `<span style="font-weight: bold; font-size: 1.2rem;">${totalQty}</span>`;
            }
        });

        // Toggle visibility of checkout button
        const checkoutBtn = document.getElementById('btn-checkout');
        if (checkoutBtn) {
            const isSalesPOS = window.location.pathname.includes('ventas') || window.location.href.includes('ventas');
            if (isSalesPOS) {
                checkoutBtn.style.display = 'flex';
                if (this.items.length === 0) {
                    checkoutBtn.style.opacity = '0.55';
                    checkoutBtn.style.background = 'rgba(255, 255, 255, 0.15)';
                    checkoutBtn.style.color = '#ffffff';
                    checkoutBtn.style.boxShadow = 'none';
                    checkoutBtn.innerHTML = '<i class="fas fa-shopping-basket"></i> Agrega platillos para cobrar';
                } else {
                    checkoutBtn.style.opacity = '1';
                    checkoutBtn.style.background = 'linear-gradient(135deg, #25d366, #20bf6b)';
                    checkoutBtn.style.color = '#0b2212';
                    checkoutBtn.style.boxShadow = '0 6px 20px rgba(37, 211, 102, 0.45)';
                    checkoutBtn.innerHTML = `<i class="fas fa-bolt"></i> Cobrar ₡${this.getTotal().toLocaleString()} / Guardar Comanda`;
                }
            } else {
                checkoutBtn.style.display = this.items.length > 0 ? 'flex' : 'none';
            }
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
        const defaultName = `Comanda #${this.siguienteNumeroComanda || 1}`;
        if (!name || name.trim() === '') {
            this.customerName = '';
            this.isDefaultName = true;
        } else {
            this.customerName = name.trim();
            this.isDefaultName = (this.customerName === defaultName);
        }
        const nameInput = document.getElementById('order-name');
        if (nameInput && name && name.trim() !== '') {
            nameInput.style.borderColor = '';
            nameInput.style.boxShadow = '';
        }
    },

    handleNameBlur() {
        const isSalesPOS = window.location.pathname.includes('ventas') || window.location.href.includes('ventas');
        if (!isSalesPOS) return;
        const nameInput = document.getElementById('order-name');
        if (!nameInput) return;
        if (!nameInput.value || nameInput.value.trim() === '') {
            const defaultName = `Comanda #${this.siguienteNumeroComanda || 1}`;
            nameInput.value = defaultName;
            this.customerName = defaultName;
            this.isDefaultName = true;
        }
    },

    updatePhone(phone) {
        this.customerPhone = phone ? phone.trim() : '';
    },

    toggleAllergies(checked) {
        this.hasAllergies = checked;
        const textArea = document.getElementById('allergies-text');
        if (textArea) {
            textArea.style.display = checked ? 'block' : 'none';
        }
    },

    updateAllergies(text) {
        this.allergiesText = text;
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

        if (this.hasAllergies && this.allergiesText.trim() !== '') {
            message += `⚠️ *Alergias / Restricciones:*\n${this.allergiesText.trim()}\n\n`;
        }

        message += `📝 *Detalle del pedido:*\n${itemsList}\n`;
        message += `💰 *TOTAL: ₡${this.getTotal().toLocaleString()}*\n`;
        message += `💳 *Método de pago:* ${this.selectedPaymentMethod}\n\n`;
        
        message += `🔗 Visítanos en: https://srysrapinto.com/\n`;

        const url = `https://wa.me/50688224763?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
        
        // Opcional: mostrar modal de éxito después de enviarlo por WA
        document.getElementById('success-overlay').classList.add('active');
    },

    async descontarInventarioPedido(items, db) {
        // Deducción automática de inventario desactivada temporalmente a solicitud del usuario
        return;
    },

    async procesarPedido() {
        const isSalesPOS = window.location.pathname.includes('ventas') || window.location.href.includes('ventas');
        if (this.items.length === 0) {
            if (isSalesPOS) {
                alert("⚠️ La comanda está vacía. Por favor agregá al menos un platillo.");
            }
            return;
        }

        if (!this.customerName || this.customerName.trim() === '') {
            if (isSalesPOS) {
                this.customerName = `Comanda #${this.siguienteNumeroComanda || 1}`;
                this.isDefaultName = true;
                const nameInput = document.getElementById('order-name');
                if (nameInput) nameInput.value = this.customerName;
            } else {
                alert("⚠️ Por favor, ingresá el nombre del cliente para continuar con el pedido.");
                const nameInput = document.getElementById('order-name');
                if (nameInput) {
                    nameInput.focus();
                    nameInput.style.borderColor = 'var(--rojo)';
                    nameInput.style.boxShadow = '0 0 10px rgba(233, 19, 80, 0.5)';
                }
                return;
            }
        }

        const btn = document.getElementById('btn-checkout');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...';
        btn.style.pointerEvents = 'none';

        try {
            const estadoInicial = isSalesPOS ? 'en_proceso' : 'pendiente_aprobacion';

            const pedido = {
                cliente: this.customerName || (isSalesPOS ? `Comanda #${this.siguienteNumeroComanda || 1}` : 'Cliente sin nombre'),
                telefono: this.customerPhone ? this.customerPhone.trim() : '',
                alergias: this.hasAllergies ? this.allergiesText : '',
                metodoPago: this.selectedPaymentMethod,
                total: this.getTotal(),
                items: this.items.map(item => ({
                    id: item.id,
                    nombre: item.nombre,
                    cantidad: item.quantity,
                    precio: item.precio
                })),
                esWeb: !isSalesPOS,
                origen: isSalesPOS ? 'pos' : 'web',
                estado: estadoInicial,
                fecha: new Date().toISOString()
            };

            const db = window.FirebaseDB;
            if (window.FirebaseDB && window.Firestore) {
                if (this.editingOrderId) {
                    // Modificar pedido existente (se preserva el num_pedido original automáticamente por .update)
                    await db.collection("pedidos").doc(this.editingOrderId).update({
                        cliente: pedido.cliente,
                        alergias: pedido.alergias,
                        metodoPago: pedido.metodoPago,
                        total: pedido.total,
                        items: pedido.items,
                        estado: 'en_proceso', // Al modificarlo queda en proceso activo
                        fechaModificacion: new Date().toISOString()
                    });
                    console.log("✅ Pedido modificado y guardado en proceso");
                    
                    // Recuperar el comanda ID o usar fallback para el ticket
                    const originalSnap = await db.collection("pedidos").doc(this.editingOrderId).get();
                    const originalData = originalSnap.data() || {};
                    window.lastProcessedOrder = { ...pedido, id: this.editingOrderId, num_pedido: originalData.num_pedido };

                    // Ocultar banner de edición si existe
                    const banner = document.getElementById('editing-order-banner');
                    if (banner) banner.style.display = 'none';
                    
                    // Mostrar modal de éxito
                    const successOverlay = document.getElementById('success-overlay');
                    if (successOverlay) {
                        successOverlay.classList.add('active');
                        const textEl = successOverlay.querySelector('.success-text');
                        if(textEl) {
                            textEl.innerHTML = `La venta fue modificada con éxito.<br>Los cambios se guardaron correctamente en el sistema.<br>¡Buen trabajo!`;
                        }
                    }
                    this.editingOrderId = null;
                } else {
                    // Si es venta en POS, obtenemos comanda secuencial atómicamente
                    if (isSalesPOS) {
                        let numPedido = null;
                        try {
                            const turnoRef = db.collection('config').doc('turno');
                            await db.runTransaction(async (transaction) => {
                                const turnoDoc = await transaction.get(turnoRef);
                                if (!turnoDoc.exists) {
                                    transaction.set(turnoRef, { activo: true, siguiente_numero: 2, fecha: new Date().toISOString() });
                                    numPedido = 1;
                                } else {
                                    const data = turnoDoc.data();
                                    if (data.activo) {
                                        numPedido = data.siguiente_numero || 1;
                                        transaction.update(turnoRef, { 
                                            siguiente_numero: numPedido + 1,
                                            fechaActualizacion: new Date().toISOString()
                                        });
                                    } else {
                                        throw new Error("turno_cerrado");
                                    }
                                }
                            });
                        } catch (e) {
                            if (e.message === "turno_cerrado") {
                                alert("⚠️ EL TURNO ESTÁ CERRADO.\n\nPor favor, ve al panel de Administración e inicia el Turno del Día para poder procesar comandas (esto reseteará el contador a la número #1).");
                            } else {
                                console.error("Error en transacción de turno:", e);
                                alert("Hubo un error de conexión al verificar el turno. Intenta de nuevo.");
                            }
                            throw e; // Interrumpir flujo
                        }
                        
                        // Añadir número de comanda secuencial
                        pedido.num_pedido = numPedido;
                        if (this.isDefaultName || !pedido.cliente || pedido.cliente.startsWith('Comanda #')) {
                            pedido.cliente = `Comanda #${numPedido}`;
                        }
                    }

                    // Crear nuevo pedido
                    const docRef = await window.Firestore.addDoc(
                        window.Firestore.collection(window.FirebaseDB, "pedidos"),
                        pedido
                    );
                    console.log("✅ Pedido creado en Firebase");
                    window.lastProcessedOrder = { ...pedido, id: docRef.id };

                    // Limpieza inmediata del carrito en POS para evitar que la próxima orden herede platillos
                    if (isSalesPOS) {
                        this.items = [];
                        this.hasAllergies = false;
                        this.allergiesText = '';
                        this.editingOrderId = null;
                        this.customerPhone = '';
                        this.save();
                        this.updateCartUI();
                        if (window.PosManager) {
                            if (typeof window.PosManager.renderDishes === 'function') window.PosManager.renderDishes();
                            if (typeof window.PosManager.syncCartUI === 'function') window.PosManager.syncCartUI();
                        }
                    }

                    // Disparar auto-impresión inmediata en Sunmi V2 si está activada
                    const autoPrintVal = localStorage.getItem('pos_auto_print');
                    const shouldAutoPrint = autoPrintVal === null ? true : (autoPrintVal === 'true');
                    if (isSalesPOS && shouldAutoPrint) {
                        setTimeout(() => {
                            this.imprimirTiquete(window.lastProcessedOrder);
                        }, 200);
                    }

                    // Mostrar modal de éxito
                    const successOverlay = document.getElementById('success-overlay');
                    if (successOverlay) {
                        successOverlay.classList.add('active');
                        const textEl = successOverlay.querySelector('.success-text');
                        if(textEl) {
                            if (isSalesPOS) {
                                const displayNum = pedido.num_pedido ? `#${pedido.num_pedido}` : `#${docRef.id.slice(-5).toUpperCase()}`;
                                textEl.innerHTML = `Venta registrada con éxito bajo la comanda <strong>${displayNum}</strong>.<br>Guardada en <em>Comandas en Proceso</em> e <em>Historial</em>.<br>¡Buen trabajo!`;
                            } else {
                                textEl.innerHTML = `Tu pedido fue guardado y enviado por WhatsApp.<br>Espera la aprobación por parte de la caja.<br>¡Gracias por preferir a Sr. & Sra. Pinto!`;
                            }
                        }
                    }

                    // Enviar por WhatsApp si NO es ventas (para mantener el hilo de chat con el cliente)
                    if (!isSalesPOS) {
                        let itemsList = '';
                        this.items.forEach(item => {
                            itemsList += `* ✅ ${item.quantity}x ${item.nombre} — ₡${(item.precio * item.quantity).toLocaleString()}\n`;
                        });

                        let message = `☕ *NUEVO PEDIDO — Sr. & Sra. Pinto*\n\n`;
                        if (this.customerName) { message += `👤 *Cliente:* ${this.customerName}\n`; }
                        if (this.customerPhone) { message += `📞 *Teléfono:* ${this.customerPhone}\n`; }
                        message += `\n`;
                        if (this.hasAllergies && this.allergiesText.trim() !== '') { message += `⚠️ *Alergias / Restricciones:*\n${this.allergiesText.trim()}\n\n`; }
                        message += `📝 *Detalle del pedido:*\n${itemsList}\n`;
                        message += `💰 *TOTAL: ₡${this.getTotal().toLocaleString()}*\n`;
                        message += `💳 *Método de pago:* ${this.selectedPaymentMethod}\n\n`;
                        message += `🔗 Visítanos en: https://srysrapinto.com/\n`;

                        const url = `https://wa.me/50688224763?text=${encodeURIComponent(message)}`;
                        window.open(url, '_blank');
                    }
                }
            } else {
                console.error("Firebase no está listo. El pedido no se pudo guardar.");
                alert("Hubo un problema de conexión. Intenta nuevamente.");
            }
        } catch (error) {
            console.error("Error al guardar en Firebase:", error);
            if (error.message !== "turno_cerrado") {
                alert("Error al procesar el pedido. Revisa tu conexión a internet.");
            }
        } finally {
            btn.innerHTML = originalText;
            btn.style.pointerEvents = 'auto';
        }
    },

    resetAndClose() {
        const isSalesPOS = window.location.pathname.includes('ventas') || window.location.href.includes('ventas');

        // Vaciar carrito
        this.items = [];
        this.hasAllergies = false;
        this.allergiesText = '';
        this.editingOrderId = null;
        
        // Reset inputs
        const nameInput = document.getElementById('order-name');
        if (isSalesPOS) {
            const defaultName = `Comanda #${this.siguienteNumeroComanda || 1}`;
            this.customerName = defaultName;
            this.isDefaultName = true;
            if (nameInput) nameInput.value = defaultName;
        } else {
            this.customerName = '';
            this.isDefaultName = true;
            if (nameInput) nameInput.value = '';
        }

        this.customerPhone = '';
        const phoneInput = document.getElementById('order-phone');
        if (phoneInput) phoneInput.value = '';

        const allergiesCheck = document.getElementById('has-allergies');
        if (allergiesCheck) { allergiesCheck.checked = false; this.toggleAllergies(false); }
        const allergiesText = document.getElementById('allergies-text');
        if (allergiesText) allergiesText.value = '';

        // Ocultar banner de edición si existe
        const banner = document.getElementById('editing-order-banner');
        if (banner) banner.style.display = 'none';

        this.save();
        this.updateCartUI();
        
        if (window.PosManager) {
            if (typeof window.PosManager.syncCartUI === 'function') window.PosManager.syncCartUI();
            if (typeof window.PosManager.renderDishes === 'function') window.PosManager.renderDishes();
            if (typeof window.PosManager.closeComandaModal === 'function') window.PosManager.closeComandaModal();
        }

        const successOverlay = document.getElementById('success-overlay');
        if (successOverlay) successOverlay.classList.remove('active');
        
        if (!isSalesPOS && typeof UIController !== 'undefined' && typeof UIController.toggleCart === 'function') {
            UIController.toggleCart(); // Cierra el carrito solo en web externa
        }
    },

    convertirLogoYEjecutar(callback) {
        const logoUrl = 'logo-brand/PNG/Logo vertical Rojo.png';
        const img = new Image();
        img.src = logoUrl;
        img.crossOrigin = 'Anonymous';
        
        img.onload = () => {
            try {
                const canvas = document.createElement("canvas");
                // Scale to 180px width for 58mm ticket
                const targetWidth = 180;
                const scale = targetWidth / img.width;
                canvas.width = targetWidth;
                canvas.height = img.height * scale;
                
                const ctx = canvas.getContext("2d");
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                
                const dataURL = canvas.toDataURL("image/png");
                callback(dataURL);
            } catch (e) {
                console.error("Error al convertir logo a base64:", e);
                callback(null);
            }
        };
        
        img.onerror = () => {
            console.warn("No se pudo cargar el logo de la marca para el ticket.");
            callback(null);
        };
    },

    generarTextoTiquete(pedido) {
        const empleadoName = localStorage.getItem('srsrapinto_cedula') || 'Cajero';
        const numComanda = pedido.num_pedido ? `#${pedido.num_pedido}` : (pedido.id ? `#${pedido.id.slice(-5).toUpperCase()}` : '#1');
        const fechaObj = pedido.fecha ? new Date(pedido.fecha) : new Date();
        const fechaStr = fechaObj.toLocaleDateString('es-CR');
        const horaStr = fechaObj.toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' });

        const W = 32; // Ancho estándar térmico 58mm
        const lineSep = "-".repeat(W);
        const dblSep  = "=".repeat(W);

        const centrar = (txt) => {
            txt = (txt || '').trim();
            if (txt.length >= W) return txt.substring(0, W);
            const padLeft = Math.floor((W - txt.length) / 2);
            return " ".repeat(padLeft) + txt;
        };

        const formatearFila = (izq, der) => {
            izq = (izq || '').toString();
            der = (der || '').toString();
            const esp = W - izq.length - der.length;
            if (esp <= 0) {
                const maxIzq = Math.max(1, W - der.length - 1);
                return izq.substring(0, maxIzq) + " " + der;
            }
            return izq + " ".repeat(esp) + der;
        };

        let t = "";
        t += dblSep + "\n";
        t += centrar("SR. & SRA. PINTO") + "\n";
        t += centrar("EL SABOR DE SER TICO") + "\n";
        t += dblSep + "\n";
        t += `Fecha:   ${fechaStr}\n`;
        t += `Hora:    ${horaStr}\n`;
        t += `Cajero:  ${empleadoName}\n`;
        t += `COMANDA: ${numComanda}\n`;
        
        if (pedido.cliente && pedido.cliente.trim() !== '') {
            t += `Cliente: ${pedido.cliente.trim()}\n`;
        }
        if (pedido.alergias && pedido.alergias.trim() !== '') {
            t += lineSep + "\n";
            t += `* ALERGIAS: ${pedido.alergias.trim().toUpperCase()}\n`;
        }
        t += lineSep + "\n";
        t += formatearFila("CANT  PRODUCTO", "TOTAL") + "\n";
        t += lineSep + "\n";

        const items = pedido.items || [];
        items.forEach(item => {
            const cant = item.quantity || item.cantidad || 1;
            const precio = item.precio || 0;
            const subtotal = precio * cant;
            let nombre = (item.nombre || '').toUpperCase().trim();
            const totalStr = `c.${subtotal.toLocaleString()}`;

            const cantPrefijo = `${cant} x `;
            const maxNomLen = W - cantPrefijo.length - totalStr.length - 1;
            if (nombre.length <= maxNomLen) {
                t += formatearFila(`${cantPrefijo}${nombre}`, totalStr) + "\n";
            } else {
                t += `${cantPrefijo}${nombre}\n`;
                t += formatearFila(`  ${cant} x c.${precio.toLocaleString()}`, totalStr) + "\n";
            }

            if (item.notas && item.notas.trim() !== '') {
                t += `  * ${item.notas.trim()}\n`;
            }
        });

        t += lineSep + "\n";
        const total = pedido.total || 0;
        t += formatearFila("TOTAL:", `c.${total.toLocaleString()}`) + "\n";

        const metodoPago = (pedido.metodoPago || 'EFECTIVO').toUpperCase();
        t += formatearFila(`PAGO (${metodoPago}):`, `c.${total.toLocaleString()}`) + "\n";
        t += dblSep + "\n";

        t += centrar("Gracias por tu compra!") + "\n";
        t += centrar("Dios te bendiga :)") + "\n\n";
        t += centrar("Para pedidos:") + "\n";
        t += centrar("WhatsApp: +506 8822-4763") + "\n";
        t += centrar("srysrapinto.com") + "\n";
        t += dblSep + "\n";
        t += "\n\n\n\n";

        return t;
    },

    imprimirConRawBT(texto) {
        try {
            // Conversión segura de caracteres UTF-8 a Base64
            const base64Data = window.btoa(unescape(encodeURIComponent(texto)));

            // Protocolo directo oficial registrado por la app RawBT en Android: rawbt:base64,<datos>
            // Al usar el esquema nativo registrado, Android abre RawBT directamente SIN pasar por Play Store ni vista previa
            const url = "rawbt:base64," + base64Data;

            console.log("🖨️ Despachando a RawBT:", url.substring(0, 80) + "...");
            this.mostrarToast('<i class="fas fa-print"></i> Imprimiendo en RawBT...');

            window.location.href = url;
            return true;
        } catch (err) {
            console.error("Error al enviar a RawBT:", err);
            return false;
        }
    },

    imprimirTiquete(pedido) {
        if (!pedido) {
            alert("No hay ningún pedido cargado para imprimir.");
            return;
        }

        const texto = this.generarTextoTiquete(pedido);
        const isAndroid = /Android/i.test(navigator.userAgent);

        if (isAndroid) {
            // En Android / terminal Sunmi: Despacho directo a RawBT
            this.imprimirConRawBT(texto);
        } else {
            // En PC / Laptop: Apertura limpia de impresión nativa del sistema
            this.imprimirTiqueteNativo(pedido);
        }
    },

    imprimirTiquetePrueba() {
        const dummyOrder = {
            num_pedido: 99,
            cliente: "Cliente de Prueba",
            alergias: "Ninguna",
            fecha: new Date().toISOString(),
            metodoPago: "SINPE MÓVIL",
            total: 4700,
            items: [
                { nombre: "Señor Pinto Clásico", cantidad: 1, precio: 3500 },
                { nombre: "Café Chorreado", cantidad: 1, precio: 1200 }
            ]
        };
        this.imprimirTiquete(dummyOrder);
    },

    mostrarToast(msg) {
        let toast = document.getElementById('pos-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'pos-toast';
            toast.style.cssText = 'position: fixed; bottom: 25px; left: 50%; transform: translateX(-50%); background: #120003; border: 1px solid #2ecc71; color: #fff; padding: 10px 22px; border-radius: 30px; font-size: 0.85rem; font-weight: 800; box-shadow: 0 10px 30px rgba(0,0,0,0.7); z-index: 99999; display: flex; align-items: center; gap: 8px; transition: opacity 0.3s, transform 0.3s; opacity: 0; pointer-events: none;';
            document.body.appendChild(toast);
        }
        toast.innerHTML = msg;
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(-50%) translateY(0)';
        clearTimeout(this._toastTimer);
        this._toastTimer = setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(-50%) translateY(10px)';
        }, 2800);
    },

    imprimirTiqueteNativo(pedido) {
        const empleadoName = localStorage.getItem('srsrapinto_cedula') || 'Cajero';
        const numComanda = pedido.num_pedido ? `#${pedido.num_pedido}` : (pedido.id ? `#${pedido.id.slice(-5).toUpperCase()}` : '#1');
        const fechaObj = pedido.fecha ? new Date(pedido.fecha) : new Date();
        const fechaStr = fechaObj.toLocaleDateString('es-CR');
        const horaStr = fechaObj.toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' });
        const total = pedido.total || 0;
        const metodoPago = (pedido.metodoPago || 'EFECTIVO').toUpperCase();

        let receiptEl = document.getElementById('thermal-receipt-area');
        if (!receiptEl) {
            receiptEl = document.createElement('div');
            receiptEl.id = 'thermal-receipt-area';
            document.body.appendChild(receiptEl);
        }

        let itemsHtml = '';
        (pedido.items || []).forEach(item => {
            const cant = item.quantity || item.cantidad || 1;
            const precio = item.precio || 0;
            const subtotal = precio * cant;
            itemsHtml += `
                <div style="margin-bottom: 5px;">
                    <div style="display: flex; justify-content: space-between; font-weight: 900; font-size: 11px;">
                        <span style="max-width: 70%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${(item.nombre || '').toUpperCase()}</span>
                        <span>₡${subtotal.toLocaleString()}</span>
                    </div>
                    <div style="font-size: 9.5px; color: #333;">${cant} x ₡${precio.toLocaleString()}</div>
                </div>
            `;
        });

        receiptEl.innerHTML = `
            <div style="text-align: center; margin-bottom: 6px;">
                <img src="logo-brand/PNG/Logo vertical Rojo.png" class="ticket-logo" style="width: 125px; margin: 0 auto; display: block; filter: brightness(0);" alt="Logo">
                <div style="font-size: 13px; font-weight: 900; letter-spacing: 0.5px; margin-top: 3px;">SR. & SRA. PINTO</div>
                <div style="font-size: 9px; font-weight: bold; letter-spacing: 0.5px;">EL SABOR DE SER TICO</div>
            </div>

            <div style="border-top: 1px dashed #000; margin: 6px 0;"></div>

            <div style="font-size: 10.5px; line-height: 1.35;">
                <div><strong>Fecha:</strong> ${fechaStr}</div>
                <div><strong>Hora:</strong> ${horaStr}</div>
                <div><strong>Cajero:</strong> ${empleadoName}</div>
                <div style="margin-top: 2px;"><strong>COMANDA:</strong> <span style="font-size: 13.5px; font-weight: 900;">${numComanda}</span></div>
                ${pedido.cliente && pedido.cliente.trim() !== '' ? `<div><strong>Cliente:</strong> ${pedido.cliente}</div>` : ''}
                ${pedido.alergias && pedido.alergias.trim() !== '' ? `
                    <div style="border: 1px solid #000; padding: 2px 4px; margin-top: 3px; font-weight: 900; font-size: 10px;">
                        ⚠️ ALERGIAS: ${pedido.alergias.toUpperCase()}
                    </div>
                ` : ''}
            </div>

            <div style="border-top: 1px dashed #000; margin: 6px 0;"></div>

            <div style="font-size: 10.5px;">
                <div style="display: flex; justify-content: space-between; font-weight: 900; margin-bottom: 4px; border-bottom: 1px dotted #999; padding-bottom: 2px;">
                    <span>PRODUCTO</span>
                    <span>TOTAL</span>
                </div>
                ${itemsHtml}
            </div>

            <div style="border-top: 1px dashed #000; margin: 6px 0;"></div>

            <div style="font-size: 11px;">
                <div style="display: flex; justify-content: space-between; font-weight: 900; font-size: 13.5px;">
                    <span>TOTAL:</span>
                    <span>₡${total.toLocaleString()}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-top: 3px; font-size: 11px;">
                    <span>PAGO (${metodoPago}):</span>
                    <span>₡${total.toLocaleString()}</span>
                </div>
            </div>

            <div style="border-top: 1px dashed #000; margin: 6px 0;"></div>

            <div style="text-align: center; font-size: 10.5px; margin-top: 6px;">
                <div>¡Muchas gracias por su compra!</div>
                <div style="margin-top: 2px; font-weight: bold;">Dios le bendiga :)</div>
                <div style="margin-top: 6px; font-size: 10px;">Para pedidos:</div>
                <div style="font-size: 10px;">WhatsApp: +506 8822-4763</div>
                <div style="font-size: 10px; font-weight: bold; margin-top: 1px;">srysrapinto.com</div>
            </div>
            <div style="height: 12mm;"></div>
        `;

        setTimeout(() => {
            window.print();
        }, 150);
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
            img: '<img src="images-catalogo/señorpintocombo.jpeg" alt="Combo Señor Pinto + Café" class="img-fit">',
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
            id: 'p-queso-pinto',
            categoria: 'pintos',
            nombre: 'Queso Pinto',
            desc: 'Delicioso gallo pinto con abundante queso.',
            precio: 3500,
            img: '<img src="images-catalogo/Quesopinto.jpeg" alt="Queso Pinto">'
        },
        {
            id: 'c-queso-pinto-cafe',
            categoria: 'pintos',
            nombre: 'Combo: Queso Pinto + Café',
            desc: 'Gallo pinto envuelto en queso mozzarella, con huevo y natilla, acompañado de Café Grande.',
            precio: 3000,
            img: '<img src="images-catalogo/promo_quesopinto.jpg" alt="Combo: Queso Pinto + Café" class="img-fit">',
            badge: 'Combo',
            badgeClass: 'badge-value'
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
        // ── 6 OPCIONES OFICIALES DE EMPANADAS (CON SELECCIÓN DE RELLENO: QUESO, CARNE, PINTO) ──
        {
            id: 'p-empanada-sencilla',
            categoria: 'snacks',
            nombre: 'Empanada Sencilla',
            desc: 'Crujiente empanada artesanal de maíz frita. Elige tu relleno favorito.',
            precio: 1400,
            img: '<img src="images-catalogo/empanadas.jpeg" alt="Empanada Sencilla">',
            requiresOptions: true,
            options: ['Queso', 'Carne', 'Pinto', 'Carne y Queso']
        },
        {
            id: 'v-1791030289012',
            categoria: 'desayuno',
            nombre: 'Combo: Empanada Sencilla + Café',
            desc: 'Empanada sencilla a elegir + Café Premium Grande.',
            precio: 1900,
            img: '<img src="images-catalogo/empanadas.jpeg" alt="Combo Empanada Sencilla + Café">',
            badge: 'Combo',
            badgeClass: 'badge-value',
            requiresOptions: true,
            options: ['Queso', 'Carne', 'Pinto', 'Carne y Queso']
        },
        {
            id: 'p-empanada-arreglada',
            categoria: 'snacks',
            nombre: 'Empanada Arreglada',
            desc: 'Empanada crujiente con repollo arreglado, salsas y relleno a elegir.',
            precio: 1800,
            img: '<img src="images-catalogo/Sra. Empanada Arreglada .jpeg" alt="Empanada Arreglada">',
            requiresOptions: true,
            options: ['Queso', 'Carne', 'Pinto', 'Carne y Queso']
        },
        {
            id: 'v-1790059042629',
            categoria: 'desayuno',
            nombre: 'Combo: Empanada Arreglada + Café',
            desc: 'Empanada arreglada con repollo y salsas + Café Premium Grande.',
            precio: 2300,
            img: '<img src="images-catalogo/Sra. Empanada Arreglada .jpeg" alt="Combo Empanada Arreglada + Café">',
            badge: 'Combo',
            badgeClass: 'badge-value',
            requiresOptions: true,
            options: ['Queso', 'Carne', 'Pinto', 'Carne y Queso']
        },
        {
            id: 'v-1790058848755',
            categoria: 'snacks',
            nombre: 'Señora Empanada',
            desc: 'Nuestra empanada insignia con repollo, carne mechada extra por encima y salsas.',
            precio: 2300,
            img: '<img src="images-catalogo/Sra. Empanada Arreglada .jpeg" alt="Señora Empanada">',
            requiresOptions: true,
            options: ['Queso', 'Carne', 'Pinto', 'Carne y Queso']
        },
        {
            id: 'v-1790059143341',
            categoria: 'desayuno',
            nombre: 'Combo: Señora Empanada + Café',
            desc: 'Señora empanada arreglada con carne extra + Café Premium Grande.',
            precio: 2800,
            img: '<img src="images-catalogo/Sra. Empanada Arreglada .jpeg" alt="Combo Señora Empanada + Café">',
            badge: 'Combo',
            badgeClass: 'badge-value',
            requiresOptions: true,
            options: ['Queso', 'Carne', 'Pinto', 'Carne y Queso']
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
            img: '<img src="images-catalogo/Srpapicarne.jpeg" alt="Sr. Papi Carne">'
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
            desc: 'Refrescantes gaseosas bien frías. Elige tu favorita.',
            precio: 1200,
            img: '<img src="images-catalogo/gaseosas.jpg" alt="Gaseosas" class="img-fit">',
            requiresOptions: true,
            options: ['Coca Cola', 'Fresca', 'Fanta', 'Gingerale', 'Coca Zero', 'Té Blanco']
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
        // Alias de compatibilidad para comandas históricas
        const ALIASES = {
            'p-empanada-carne': 'p-empanada-sencilla',
            'p-empanada-queso': 'p-empanada-sencilla',
            'p-empanada-pinto': 'p-empanada-sencilla',
            'p-empanada-carne-queso': 'p-empanada-sencilla',
            'p-sra-empanada-m1': 'v-1790058848755',
            'p-sra-empanada-m2': 'p-empanada-arreglada',
            'p-sra-empanada': 'v-1790058848755',
            'c-empanada-cafe': 'v-1791030289012',
            'c-empanada-sencilla-cafe': 'v-1791030289012',
            'c-empanada-arreglada-cafe': 'v-1790059042629',
            'c-sra-empanada-cafe': 'v-1790059143341'
        };
        const searchId = ALIASES[id] || id;
        let p = (this.MENU_DATA || []).find(item => item.id === searchId);
        if (!p && this.volioDishes && this.volioDishes.length > 0) {
            const v = this.volioDishes.find(item => item.id === id);
            if (v) {
                const isEmp = (window.isEmpanadaDish && window.isEmpanadaDish(v)) ||
                              (v.id && v.id.toLowerCase().includes('empanada')) ||
                              (v.nombre && v.nombre.toLowerCase().includes('empanada'));
                p = {
                    id: v.id,
                    categoria: v.categoria,
                    nombre: v.nombre,
                    desc: v.desc || '',
                    ingredientes: v.ingredientes || '',
                    precio: v.precio || 0,
                    costo: v.costo || 0,
                    requiresOptions: v.requiresOptions !== undefined ? v.requiresOptions : isEmp,
                    options: v.options || (isEmp ? ['Queso', 'Carne', 'Pinto', 'Carne y Queso'] : null),
                    img: v.img || 'images-catalogo/Señor Pinto.jpeg'
                };
            }
        }
        if (!p && this.ORIGINAL_MENU_DATA) {
            p = this.ORIGINAL_MENU_DATA.find(item => item.id === id);
        }
        if (!p && window.CANONICAL_EMPANADAS) {
            const canonical = window.CANONICAL_EMPANADAS.find(c => c.id === searchId || c.id === id);
            if (canonical) p = { ...canonical };
        }
        if (p) {
            // Garantizar flags de opciones en cualquier empanada
            const isEmp = (window.isEmpanadaDish && window.isEmpanadaDish(p)) ||
                          (p.requiresOptions === true) ||
                          (p.id && p.id.toLowerCase().includes('empanada')) ||
                          (p.nombre && p.nombre.toLowerCase().includes('empanada'));
            if (isEmp) {
                p.requiresOptions = true;
                if (!p.options || p.options.length === 0) {
                    p.options = ['Queso', 'Carne', 'Pinto', 'Carne y Queso'];
                }
            }

            // Garantizar el precio más actualizado: Catálogo Maestro siempre toma prioridad
            if (this.volioDishes && this.volioDishes.length > 0) {
                const vd = this.volioDishes.find(item => item.id === id);
                if (vd && vd.precio !== undefined && !isNaN(vd.precio)) {
                    p.precio = vd.precio;
                } else if (this.customPrices && this.customPrices[id] !== undefined) {
                    p.precio = this.customPrices[id];
                }
            } else if (this.customPrices && this.customPrices[id] !== undefined) {
                p.precio = this.customPrices[id];
            }
        }
        // Enriquecer ingredientes desde volioDishes si existen
        if (p && this.volioDishes) {
            const v = this.volioDishes.find(item => item.id === id);
            if (v && v.ingredientes && !p.ingredientes) {
                p.ingredientes = v.ingredientes;
            }
        }
        return p;
    },

    CATEGORIAS: [
        { id: 'desayuno', nombre: 'Desayunos', icon: '🍳', subtitle: 'Deliciosos desayunos tradicionales para arrancar el día' },
        { id: 'almuerzo',  nombre: 'Almuerzos',  icon: '🍲', subtitle: 'Casados completos y platillos del día preparados con amor casero' },
        { id: 'snacks',    nombre: 'Snacks',    icon: '🥟', subtitle: 'Empanadas arregladas, patacones y antojos irresistibles' },
        { id: 'bebidas',   nombre: 'Bebidas',   icon: '☕', subtitle: 'Café fresquito y bebidas frías' }
    ],

    inventario: {},
    customPrices: {},
    feriaConfig: { active: false, combos_active: false },
    feriaCustomPrices: null,
    volioConfig: { active: true },
    volioDishes: [],
    volioSchedule: { lunes: [], martes: [], miercoles: [], jueves: [], viernes: [] },

    init() {
        this.ORIGINAL_MENU_DATA = JSON.parse(JSON.stringify(this.MENU_DATA));
        this.ORIGINAL_CATEGORIAS = JSON.parse(JSON.stringify(this.CATEGORIAS));

        if (window.FirebaseDB) {
            // Escuchar disponibilidad de inventario
            window.FirebaseDB.collection('config').doc('inventario').onSnapshot((doc) => {
                if (doc.exists) {
                    this.inventario = doc.data();
                } else {
                    this.inventario = {};
                }
                if (StateManager.currentCategory) {
                    this.renderCategory(StateManager.currentCategory);
                }
            });

            // Escuchar precios modificados en tiempo real
            window.FirebaseDB.collection('config').doc('precios').onSnapshot((doc) => {
                if (doc.exists) {
                    this.customPrices = doc.data();
                } else {
                    this.customPrices = {};
                }
                this.applyStateAndRender();
            });

            // Escuchar Modo Feria
            window.FirebaseDB.collection('config').doc('feria').onSnapshot((doc) => {
                if (doc.exists) {
                    this.feriaConfig = doc.data();
                } else {
                    this.feriaConfig = { active: false, combos_active: false };
                }
                this.applyStateAndRender();
            });

            // Escuchar Precios de Feria
            window.FirebaseDB.collection('config').doc('feria_precios').onSnapshot((doc) => {
                if (doc.exists) {
                    this.feriaCustomPrices = doc.data();
                } else {
                    this.feriaCustomPrices = null;
                }
                this.applyStateAndRender();
            });

            // Escuchar Modo Volio en tiempo real (activo por defecto)
            window.FirebaseDB.collection('config').doc('volio').onSnapshot((doc) => {
                if (doc.exists) {
                    const data = doc.data();
                    this.volioConfig = { active: data.active !== false };
                } else {
                    this.volioConfig = { active: true };
                }
                this.applyStateAndRender();
            });

            // Escuchar Catálogo de Platillos Volio
            window.FirebaseDB.collection('volio_platillos').onSnapshot((snapshot) => {
                this.volioDishes = [];
                snapshot.forEach(d => this.volioDishes.push({ id: d.id, ...d.data() }));
                this.applyStateAndRender();
            });

            // Escuchar Programación Semanal de Volio
            window.FirebaseDB.collection('config_volio').doc('programacion_semanal').onSnapshot((doc) => {
                if (doc.exists) {
                    this.volioSchedule = doc.data();
                }
                this.applyStateAndRender();
            });
        }
        this.renderSidebar();
        this.renderCategory('desayuno');
    },

    applyStateAndRender() {
        const deprecatedEmpanadas = new Set([
            'c-empanada-sencilla-cafe', 'c-empanada-arreglada-cafe',
            'c-sra-empanada-cafe', 'p-sra-empanada',
            'p-sra-empanada-m1', 'p-sra-empanada-m2',
            'c-empanada-cafe', 'p-empanada-carne',
            'p-empanada-queso', 'p-empanada-pinto',
            'p-empanada-carne-queso', 'p-empanada-birria'
        ]);

        // 1. Restaurar al estado original
        this.MENU_DATA = (JSON.parse(JSON.stringify(this.ORIGINAL_MENU_DATA))).filter(p => !deprecatedEmpanadas.has(p.id));
        this.CATEGORIAS = JSON.parse(JSON.stringify(this.ORIGINAL_CATEGORIAS));

        // 2. Aplicar Modo Feria si está activo
        if (this.feriaConfig && this.feriaConfig.active) {
            // Precios de Feria (mezcla entre los estáticos y los editados)
            const baseFeriaPrices = {
                'p-senor-pinto': 4000, 'c-senor-pinto-cafe': 4000, 'c-burrote-cafe': 3000,
                'p-sr-patacon': 4000, 'p-sra-quesadilla': 4000, 'p-empanada-sencilla': 2500,
                'p-empanada-arreglada': 3000, 'p-sra-empanada': 3500, 'p-sra-hamburguesa': 5000,
                'p-cono-salchipapa': 3000, 'p-sr-papi-carne': 3500, 'b-cafe-premium': 1300,
                'p-patacon-caribeno': 4000, 'c-queso-pinto-cafe': 4000, 'b-cafe-8oz': 1000,
                'ce-empanada-fresco': 2000, 'ce-salchipapa-fresco': 2500,
                'ce-hamburguesa-jr-fresco': 2500, 'ce-hotdog-fresco': 2000
            };
            
            const activeFeriaPrices = this.feriaCustomPrices ? { ...baseFeriaPrices, ...this.feriaCustomPrices } : baseFeriaPrices;

            // Ocultar Burrote de Pinto regular en modo feria
            this.MENU_DATA = this.MENU_DATA.filter(p => p.id !== 'p-burrote');

            this.MENU_DATA.forEach(p => {
                if (activeFeriaPrices[p.id] !== undefined) {
                    p.precio = activeFeriaPrices[p.id];
                }
            });

            // Añadir nuevos productos generales de feria
            this.MENU_DATA.push({
                id: 'p-patacon-caribeno', categoria: 'snacks', nombre: 'Patacón Caribeño',
                desc: 'Patacones crujientes estilo caribeño con frijoles, queso fundido y pico de gallo.',
                precio: activeFeriaPrices['p-patacon-caribeno'] || 4000, img: '<img src="images-catalogo/pataconcaribeño.jpeg" alt="Patacón Caribeño" class="img-fit">'
            });
            this.MENU_DATA.push({
                id: 'c-queso-pinto-cafe', categoria: 'pintos', nombre: 'Combo: Queso Pinto + Café',
                desc: 'Delicioso gallo pinto con abundante queso, acompañado de un café.',
                precio: activeFeriaPrices['c-queso-pinto-cafe'] || 4000, img: '<img src="images-catalogo/promo_quesopinto.jpg" alt="Queso Pinto + Café" class="img-fit">', badge: 'Combo', badgeClass: 'badge-value'
            });
            
            const premiumCafeIndex = this.MENU_DATA.findIndex(p => p.id === 'b-cafe-premium');
            const cafe8oz = {
                id: 'b-cafe-8oz', categoria: 'bebidas', nombre: 'Café (8 onzas)',
                desc: 'Café de calidad premium en presentación de 8 onzas.',
                precio: activeFeriaPrices['b-cafe-8oz'] || 1000, img: '<img src="images-catalogo/12onzas.jpg" alt="Café 8 onzas" class="img-fit">' // reusando imagen de cafe
            };
            if (premiumCafeIndex !== -1) {
                this.MENU_DATA.splice(premiumCafeIndex + 1, 0, cafe8oz);
            } else {
                this.MENU_DATA.push(cafe8oz);
            }

            // 3. Aplicar Combos Estudiantiles si está activo
            if (this.feriaConfig.combos_active) {
                // Insertar categoría después de bebidas
                this.CATEGORIAS.push({ id: 'combos', nombre: 'Combos Estudiantiles', icon: '🎓', subtitle: '¡Combos especiales a precios de estudiante!' });
                
                // Añadir combos
                this.MENU_DATA.push({
                    id: 'ce-empanada-fresco', categoria: 'combos', nombre: 'Empanada + Té Frío',
                    desc: 'Empanada a tu elección acompañada de un refrescante té frío.',
                    precio: activeFeriaPrices['ce-empanada-fresco'] || 2000, img: '<img src="images-catalogo/empanadas.jpeg" alt="Empanada + Té Frío" class="img-fit">',
                    requiresOptions: true, options: ['Queso', 'Carne', 'Pinto', 'Carne y Queso']
                });
                this.MENU_DATA.push({
                    id: 'ce-salchipapa-fresco', categoria: 'combos', nombre: 'Salchipapas + Té Frío',
                    desc: 'Nuestras famosas salchipapas con un delicioso té frío.',
                    precio: activeFeriaPrices['ce-salchipapa-fresco'] || 2500, img: '<img src="images-catalogo/Sr. Cono de SalchiPapas.jpeg" alt="Salchipapas + Té Frío" class="img-fit">'
                });
                this.MENU_DATA.push({
                    id: 'ce-hamburguesa-jr-fresco', categoria: 'combos', nombre: 'Hamburguesa Jr + Té Frío',
                    desc: 'Hamburguesa Junior clásica con papas y té frío.',
                    precio: activeFeriaPrices['ce-hamburguesa-jr-fresco'] || 2500, img: '<img src="images-catalogo/Hamburguesajr.jpeg" alt="Hamburguesa Jr + Té Frío" class="img-fit">'
                });
                this.MENU_DATA.push({
                    id: 'ce-hotdog-fresco', categoria: 'combos', nombre: 'Hot Dog + Té Frío',
                    desc: 'Clásico hot dog con papas tostadas, salsas y té frío.',
                    precio: activeFeriaPrices['ce-hotdog-fresco'] || 2000, img: '<img src="images-catalogo/hotdog.jpeg" alt="Hot Dog + Té Frío" class="img-fit">'
                });
            }
        }

        // 3.5. APLICAR MODO VOLIO (Activo por defecto)
        const isVolioActive = !this.volioConfig || this.volioConfig.active !== false;
        if (isVolioActive) {
            // Categorías oficiales de Modo Volio
            this.CATEGORIAS = [
                { id: 'desayuno', nombre: 'Desayunos', icon: '🍳', subtitle: 'Deliciosos desayunos tradicionales para arrancar el día' },
                { id: 'almuerzo',  nombre: 'Almuerzos',  icon: '🍲', subtitle: 'Casados completos y platillos del día preparados con amor casero' },
                { id: 'snacks',    nombre: 'Snacks',    icon: '🥟', subtitle: 'Empanadas arregladas, patacones y antojos irresistibles' },
                { id: 'bebidas',   nombre: 'Bebidas',   icon: '☕', subtitle: 'Café fresquito y bebidas frías' }
            ];

            // Identificar día actual de la semana en Costa Rica (0: Domingo, 1: Lunes, ..., 5: Viernes, 6: Sábado)
            const dayMap = { 1: 'lunes', 2: 'martes', 3: 'miercoles', 4: 'jueves', 5: 'viernes' };
            const currentDayNum = new Date().getDay();
            const currentDayKey = dayMap[currentDayNum] || 'lunes'; // Fallback a lunes si es fin de semana

            // Obtener IDs de platillos programados para el día actual
            const scheduledIds = (this.volioSchedule && this.volioSchedule[currentDayKey]) ? this.volioSchedule[currentDayKey] : [];

            // Filtrar del catálogo de platillos Volio:
            // Desayunos, Snacks y Bebidas están SIEMPRE disponibles durante toda la semana.
            // Solo los Almuerzos rotan según la programación del día actual.
            let activeVolioDishes = [];
            if (this.volioDishes && this.volioDishes.length > 0) {
                const alwaysAvailableDishes = this.volioDishes.filter(d => d.categoria !== 'almuerzo');
                const almuerzosDishes = this.volioDishes.filter(d => d.categoria === 'almuerzo');

                let activeAlmuerzos = [];
                if (scheduledIds.length > 0) {
                    activeAlmuerzos = almuerzosDishes.filter(d => scheduledIds.includes(d.id));
                }
                // Si aún no han asignado almuerzos específicos para este día en la programación,
                // mostrar todos los almuerzos del catálogo para no dejar la categoría vacía
                if (activeAlmuerzos.length === 0) {
                    activeAlmuerzos = almuerzosDishes;
                }

                activeVolioDishes = [...alwaysAvailableDishes, ...activeAlmuerzos];
            } else {
                activeVolioDishes = [...(this.ORIGINAL_MENU_DATA || [])];
            }

            // GARANTIZAR LAS 6 OPCIONES OFICIALES DE EMPANADAS EN activeVolioDishes
            if (window.CANONICAL_EMPANADAS && window.CANONICAL_EMPANADAS.length > 0) {
                window.CANONICAL_EMPANADAS.forEach(canonicalEmp => {
                    const normCanName = (canonicalEmp.nombre || '').toLowerCase().trim();
                    const idx = activeVolioDishes.findIndex(d => d.id === canonicalEmp.id || (d.nombre && d.nombre.toLowerCase().trim() === normCanName));
                    if (idx === -1) {
                        activeVolioDishes.push({ ...canonicalEmp });
                    } else {
                        activeVolioDishes[idx].requiresOptions = true;
                        if (!activeVolioDishes[idx].options || activeVolioDishes[idx].options.length === 0) {
                            activeVolioDishes[idx].options = ['Queso', 'Carne', 'Pinto', 'Carne y Queso'];
                        }
                        if (!activeVolioDishes[idx].desc) {
                            activeVolioDishes[idx].desc = canonicalEmp.desc;
                        }
                    }
                });

                // Si se detectan documentos obsoletos o duplicados en Firestore, eliminarlos permanentemente
                if (window.FirebaseDB && this.volioDishes && this.volioDishes.length > 0) {
                    const badDishesInFirestore = this.volioDishes.filter(d => deprecatedEmpanadas.has(d.id));
                    if (badDishesInFirestore.length > 0) {
                        badDishesInFirestore.forEach(d => {
                            window.FirebaseDB.collection('volio_platillos').doc(d.id).delete().catch(err => console.warn("Clean bad doc:", d.id, err));
                        });
                    }
                }
            }

            // Deduplicar activeVolioDishes por nombre normalizado antes de mapear
            const seenVolioNames = new Set();
            const uniqueActiveVolioDishes = [];
            activeVolioDishes.forEach(d => {
                if (deprecatedEmpanadas.has(d.id)) return;
                const normName = (d.nombre || '').toLowerCase().trim();
                if (!seenVolioNames.has(normName)) {
                    seenVolioNames.add(normName);
                    uniqueActiveVolioDishes.push(d);
                }
            });

            // Convertir al formato estándar MENU_DATA, heredando flags de opciones y filtrando deprecados
            const mappedVolio = uniqueActiveVolioDishes
                .filter(d => !deprecatedEmpanadas.has(d.id))
                .map(d => {
                    const original = (this.ORIGINAL_MENU_DATA || []).find(o => o.id === d.id);
                    const canonical = (window.CANONICAL_EMPANADAS || []).find(c => c.id === d.id || (c.nombre && c.nombre.toLowerCase().trim() === (d.nombre || '').toLowerCase().trim()));
                    const isEmp = (window.isEmpanadaDish ? window.isEmpanadaDish(d) : (d.id && d.id.includes('empanada')));
                    let itemPrecio = d.precio || (original ? original.precio : (canonical ? canonical.precio : 0));
                    if (this.customPrices && this.customPrices[d.id] !== undefined && !isNaN(this.customPrices[d.id])) {
                        itemPrecio = this.customPrices[d.id];
                    }
                    const isCombo = (typeof window.isComboDish === 'function' ? window.isComboDish(d) : false) ||
                                    (d.badge && d.badge.toLowerCase().includes('combo')) ||
                                    (original && original.badge && original.badge.toLowerCase().includes('combo')) ||
                                    (canonical && canonical.badge && canonical.badge.toLowerCase().includes('combo'));

                    const itemBadge = d.badge || (original ? original.badge : (canonical ? canonical.badge : (isCombo ? 'Combo' : null)));
                    const itemBadgeClass = d.badgeClass || (original ? original.badgeClass : (canonical ? canonical.badgeClass : (isCombo ? 'badge-value' : null)));

                    return {
                        id: d.id,
                        categoria: d.categoria,
                        nombre: d.nombre,
                        desc: d.desc || (original ? original.desc : (canonical ? canonical.desc : '')),
                        precio: itemPrecio,
                        costo: d.costo || (original ? original.costo : (canonical ? canonical.costo : 0)),
                        badge: itemBadge,
                        badgeClass: itemBadgeClass,
                        requiresOptions: d.requiresOptions !== undefined ? d.requiresOptions : (canonical ? true : (original ? original.requiresOptions : isEmp)),
                        options: (d.options && d.options.length) ? d.options : (canonical ? canonical.options : (original ? original.options : (isEmp ? ['Queso', 'Carne', 'Pinto', 'Carne y Queso'] : null))),
                        img: d.img && d.img.startsWith('<') ? d.img : `<img src="${d.img || (original && original.img ? (original.img.match(/src="([^"]+)"/) ? original.img.match(/src="([^"]+)"/)[1] : original.img) : (canonical ? canonical.img : 'images-catalogo/Señor Pinto.jpeg'))}" alt="${d.nombre}" class="img-fit">`
                    };
                });

            // Sincronizar badge y badgeClass de combos en Firestore si no los tienen
            if (window.FirebaseDB && this.volioDishes && this.volioDishes.length > 0) {
                this.volioDishes.forEach(vd => {
                    const isCombo = typeof window.isComboDish === 'function' && window.isComboDish(vd);
                    if (isCombo && (!vd.badge || !vd.badgeClass)) {
                        vd.badge = 'Combo';
                        vd.badgeClass = 'badge-value';
                        window.FirebaseDB.collection('volio_platillos').doc(vd.id).update({
                            badge: 'Combo',
                            badgeClass: 'badge-value'
                        }).catch(err => console.warn("Firestore combo badge update skipped:", err));
                    }
                });
            }

            this.MENU_DATA = mappedVolio;

            // Si la categoría actual no existe en Volio, resetear a desayuno
            if (!['desayuno', 'almuerzo', 'snacks', 'bebidas'].includes(StateManager.currentCategory)) {
                StateManager.setCategory('desayuno');
            }
        } else {
            // Sincronizar catálogo maestro con el menú general (precios, descripciones, nombres, opciones e imágenes)
            if (this.volioDishes && this.volioDishes.length > 0) {
                const existingMap = new Map(this.MENU_DATA.map(p => [p.id, p]));
                this.volioDishes.forEach(vd => {
                    if (deprecatedEmpanadas.has(vd.id)) return;
                    const isEmp = (window.isEmpanadaDish && window.isEmpanadaDish(vd)) ||
                                  (vd.id && vd.id.toLowerCase().includes('empanada')) ||
                                  (vd.nombre && vd.nombre.toLowerCase().includes('empanada'));
                    const item = existingMap.get(vd.id);
                    if (item) {
                        if (vd.precio !== undefined && vd.precio !== null && !isNaN(vd.precio)) item.precio = vd.precio;
                        if (vd.nombre) item.nombre = vd.nombre;
                        if (vd.desc) item.desc = vd.desc;
                        if (vd.ingredientes) item.ingredientes = vd.ingredientes;
                        if (vd.img) item.img = vd.img.startsWith('<') ? vd.img : `<img src="${vd.img}" alt="${vd.nombre}" class="img-fit">`;
                        if (isEmp) {
                            item.requiresOptions = true;
                            item.options = (vd.options && vd.options.length) ? vd.options : ['Queso', 'Carne', 'Pinto', 'Carne y Queso'];
                        }
                        const isCombo = typeof window.isComboDish === 'function' ? window.isComboDish(vd) : false;
                        if (isCombo && (!item.badge || !item.badgeClass)) {
                            item.badge = 'Combo';
                            item.badgeClass = 'badge-value';
                        }
                    } else {
                        const isCombo = typeof window.isComboDish === 'function' ? window.isComboDish(vd) : false;
                        const newDish = {
                            id: vd.id,
                            categoria: vd.categoria || 'snacks',
                            nombre: vd.nombre,
                            desc: vd.desc || '',
                            ingredientes: vd.ingredientes || '',
                            precio: vd.precio || 0,
                            costo: vd.costo || 0,
                            badge: vd.badge || (isCombo ? 'Combo' : null),
                            badgeClass: vd.badgeClass || (isCombo ? 'badge-value' : null),
                            requiresOptions: vd.requiresOptions !== undefined ? vd.requiresOptions : isEmp,
                            options: vd.options || (isEmp ? ['Queso', 'Carne', 'Pinto', 'Carne y Queso'] : null),
                            img: vd.img && vd.img.startsWith('<') ? vd.img : `<img src="${vd.img || 'images-catalogo/Señor Pinto.jpeg'}" alt="${vd.nombre}" class="img-fit">`
                        };
                        this.MENU_DATA.push(newDish);
                        existingMap.set(vd.id, newDish);
                    }
                });
            }
        }

        // 4. Aplicar Precios Manuales de contingencia
        if (this.customPrices) {
            this.MENU_DATA.forEach(p => {
                if (this.customPrices[p.id] !== undefined) {
                    p.precio = this.customPrices[p.id];
                }
            });
        }

        // 5. El Catálogo Maestro (volio_platillos) es la fuente definitiva y en tiempo real
        if (this.volioDishes && this.volioDishes.length > 0) {
            this.MENU_DATA.forEach(p => {
                if (deprecatedEmpanadas.has(p.id)) return;
                const vd = this.volioDishes.find(d => d.id === p.id);
                if (vd && vd.precio !== undefined && vd.precio !== null && !isNaN(vd.precio)) {
                    p.precio = vd.precio;
                }
            });
        }

        // 5. Re-renderizar
        this.renderSidebar();
        if (StateManager.currentCategory) {
            this.renderCategory(StateManager.currentCategory);
        }
        
        // Sincronizar UI del panel de ventas
        if (window.SalesDashboard && typeof window.SalesDashboard.renderInventory === 'function') {
            window.SalesDashboard.renderInventory();
        }
        if (window.PosManager && typeof window.PosManager.renderDishes === 'function') {
            window.PosManager.renderDishes();
        }
        // Sincronizar UI del carrito
        if (window.CartManager && typeof window.CartManager.updateCartUI === 'function') {
            window.CartManager.updateCartUI();
        }
    },


    renderSidebar() {
        const sidebar = document.getElementById('sidebar-categories');
        if (!sidebar) return;

        let html = `
            <button class="sidebar-btn ${StateManager.currentCategory === 'semana' ? 'active' : ''}" onclick="MenuController.renderWeeklyMenu()" data-cat="semana" style="border: 1px solid rgba(241, 196, 15, 0.4); background: ${StateManager.currentCategory === 'semana' ? 'linear-gradient(135deg, #f1c40f, #e67e22)' : 'rgba(241, 196, 15, 0.12)'}; color: ${StateManager.currentCategory === 'semana' ? '#111' : '#fff'}; font-weight: 800; margin-bottom: 6px;">
                <span>📅</span> Menú de la Semana
            </button>
            <div style="height: 1px; background: rgba(255,255,255,0.1); margin: 6px 0 10px 0;"></div>
        `;

        html += this.CATEGORIAS.map(cat => `
            <button class="sidebar-btn ${cat.id === StateManager.currentCategory ? 'active' : ''}" onclick="MenuController.renderCategory('${cat.id}')" data-cat="${cat.id}">
                <span>${cat.icon}</span> ${cat.nombre}
            </button>
        `).join('');

        sidebar.innerHTML = html;
    },

    renderWeeklyMenu() {
        StateManager.setCategory('semana');
        const container = document.getElementById('menu-dynamic-content');
        const titleEl = document.getElementById('current-category-title');
        const countEl = document.getElementById('current-category-count');
        if (!container) return;

        // Actualizar botón activo en sidebar
        document.querySelectorAll('.sidebar-btn').forEach(btn => {
            if (btn.dataset.cat === 'semana') {
                btn.classList.add('active');
                btn.style.background = 'linear-gradient(135deg, #f1c40f, #e67e22)';
                btn.style.color = '#111';
            } else {
                btn.classList.remove('active');
                if (btn.dataset.cat === 'semana') {
                    btn.style.background = 'rgba(241, 196, 15, 0.12)';
                    btn.style.color = '#fff';
                }
            }
        });

        if (titleEl) titleEl.innerHTML = `📅 Menú Semanal de Almuerzos<span>Los almuerzos rotan de Lunes a Viernes · Desayunos y snacks disponibles toda la semana</span>`;
        if (countEl) countEl.innerText = 'Lunes a Viernes';

        const dayNames = [
            { key: 'lunes', name: 'Lunes', icon: '☀️' },
            { key: 'martes', name: 'Martes', icon: '🌮' },
            { key: 'miercoles', name: 'Miércoles', icon: '🍲' },
            { key: 'jueves', name: 'Jueves', icon: '🍛' },
            { key: 'viernes', name: 'Viernes', icon: '🎉' }
        ];

        // Determinar si hoy es día de semana (o si se fuerza testDay por URL para pruebas)
        const urlParams = new URLSearchParams(window.location.search);
        const testDayParam = urlParams.get('testDay');
        const todayNum = new Date().getDay(); // 0=Dom, 1=Lun, 2=Mar, 3=Mie, 4=Jue, 5=Vie, 6=Sab
        const dayMap = { 1: 'lunes', 2: 'martes', 3: 'miercoles', 4: 'jueves', 5: 'viernes' };
        const currentTodayKey = testDayParam || dayMap[todayNum] || '';
        const todayNameObj = dayNames.find(d => d.key === currentTodayKey);

        const extractImgSrc = (img) => {
            if (!img) return 'images-catalogo/Señor Pinto.jpeg';
            if (typeof img === 'string') {
                if (img.includes('src="')) {
                    const match = img.match(/src="([^"]+)"/);
                    if (match && match[1]) return match[1];
                }
                return img;
            }
            return 'images-catalogo/Señor Pinto.jpeg';
        };

        let daysHtml = `
            <div style="background: rgba(241, 196, 15, 0.08); border: 1px solid rgba(241, 196, 15, 0.25); border-radius: 14px; padding: 18px 22px; margin-bottom: 24px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 14px;">
                <div style="flex: 1; min-width: 260px;">
                    <h4 style="margin: 0 0 6px 0; color: var(--mostaza); font-size: 1.08rem; display: flex; align-items: center; gap: 8px;">
                        <i class="fas fa-calendar-alt"></i> Menú Semanal de Almuerzos
                    </h4>
                    <p style="margin: 0 0 6px 0; font-size: 0.86rem; color: #fff; line-height: 1.45;">
                        🍲 <strong>En esta programación semanal lo que varía cada día son las opciones de Almuerzo.</strong>
                    </p>
                    <p style="margin: 0; font-size: 0.8rem; color: rgba(255,255,255,0.72); line-height: 1.4;">
                        🍳 Los <strong>Desayunos</strong>, 🥟 <strong>Snacks</strong> y ☕ <strong>Bebidas</strong> están <strong>disponibles todos los días durante toda la semana</strong> en sus categorías del menú.
                    </p>
                </div>
                ${currentTodayKey ? `
                    <span style="background: rgba(39, 174, 96, 0.25); color: #2ecc71; border: 1px solid rgba(39, 174, 96, 0.45); padding: 8px 16px; border-radius: 20px; font-size: 0.8rem; font-weight: 800; display: inline-flex; align-items: center; gap: 6px;">
                        <i class="fas fa-circle" style="font-size: 0.5rem;"></i> Hoy es ${todayNameObj?.name.toUpperCase()} (Almuerzo disponible)
                    </span>
                ` : `
                    <span style="background: rgba(255, 255, 255, 0.08); color: rgba(255, 255, 255, 0.65); border: 1px solid rgba(255, 255, 255, 0.15); padding: 8px 16px; border-radius: 20px; font-size: 0.8rem; font-weight: 700; display: inline-flex; align-items: center; gap: 6px;">
                        <i class="fas fa-eye" style="color: #f1c40f;"></i> Planificación Semanal
                    </span>
                `}
            </div>
            <div style="display: flex; flex-direction: column; gap: 15px;">
        `;

        dayNames.forEach(day => {
            const isToday = (day.key === currentTodayKey);
            const scheduledIds = (this.volioSchedule && this.volioSchedule[day.key]) ? this.volioSchedule[day.key] : [];
            const dayDishes = scheduledIds.map(id => this.getProductById(id)).filter(Boolean);
            const almuerzos = dayDishes.filter(d => (d.categoria || '').toLowerCase() === 'almuerzo');
            const totalOptions = almuerzos.length;

            daysHtml += `
                <div class="weekly-day-box ${isToday ? 'is-today' : ''}">
                    <!-- Encabezado del Día -->
                    <div class="weekly-day-header">
                        <h4 style="margin: 0; font-size: 1.15rem; color: ${isToday ? 'var(--mostaza)' : '#fff'}; display: flex; align-items: center; gap: 8px;">
                            <span>${day.icon}</span> ${day.name}
                            ${isToday 
                                ? '<span style="background: #27ae60; color: white; font-size: 0.65rem; padding: 3px 9px; border-radius: 12px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px;"><i class="fas fa-check-circle"></i> ¡HOY! Puedes ordenar</span>' 
                                : '<span style="background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.5); font-size: 0.65rem; padding: 3px 9px; border-radius: 12px; font-weight: 700; text-transform: uppercase;"><i class="fas fa-eye"></i> Solo visualización</span>'
                            }
                        </h4>
                        <span style="font-size: 0.78rem; color: rgba(255,255,255,0.55); font-weight: 600;">
                            ${totalOptions} ${totalOptions === 1 ? 'almuerzo programado' : 'almuerzos programados'}
                        </span>
                    </div>
            `;

            if (totalOptions === 0) {
                daysHtml += `
                    <div style="padding: 16px; text-align: center; color: rgba(255,255,255,0.4); font-size: 0.82rem; font-style: italic; background: rgba(255,255,255,0.015); border-radius: 12px; border: 1px dashed rgba(255,255,255,0.08);">
                        <i class="fas fa-utensils" style="margin-right: 6px;"></i> Sin almuerzos especiales asignados para este día. ¡Nuestros desayunos y snacks a la carta están disponibles!
                    </div>
                `;
            } else {
                daysHtml += `
                    <div class="weekly-subcat-header">
                        <span class="weekly-subcat-title" style="color: #e67e22;">
                            <span>🍲</span> Almuerzos del Día
                        </span>
                        <span class="weekly-subcat-badge">${totalOptions} ${totalOptions === 1 ? 'opción' : 'opciones'}</span>
                    </div>
                    <div class="menu-list" style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 12px;">
                `;

                almuerzos.forEach(product => {
                    const imgSrc = extractImgSrc(product.img);
                    const ingredientesText = product.ingredientes || product.desc || '';
                    const isAgotado = this.inventario[product.id] === false;

                    // Si es hoy, permitir agregar al carrito
                    const cartItem = CartManager.items.find(i => i.id === product.id);
                    const btnContent = cartItem ? `<span style="font-weight: 900; font-size: 1.1rem;">${cartItem.quantity}</span>` : `<i class="fas fa-plus"></i>`;

                    daysHtml += `
                        <div class="menu-card-h card-visible ${product.badgeClass ? 'highlight-item' : ''} ${isAgotado ? 'agotado' : ''}" id="card-${product.id}" style="opacity: 1; transform: none; padding: 12px 14px; gap: 14px; margin: 0; background: ${isToday ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.02)'}; border: 1px solid ${isToday ? 'rgba(241, 196, 15, 0.22)' : 'rgba(255,255,255,0.05)'};">
                            <div class="mch-img" style="width: 85px; height: 85px; min-width: 85px; max-width: 85px; max-height: 85px; border-radius: 12px; overflow: hidden; background: #130406; flex-shrink: 0; display: flex; align-items: center; justify-content: center; border: 1px solid rgba(255,255,255,0.1);">
                                <img src="${imgSrc}" alt="${product.nombre}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 10px;" onerror="this.src='images-catalogo/Señor Pinto.jpeg'">
                            </div>
                            <div class="mch-info" style="flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: center; gap: 4px;">
                                <div class="mch-title" style="font-size: 1.02rem; font-weight: 800; color: #fff; margin: 0; line-height: 1.25;">
                                    ${product.nombre}
                                    ${product.badge ? `<span class="mch-badge">${product.badge}</span>` : ''}
                                    ${isAgotado ? '<span style="color: #ff3b30; font-weight: 900; font-size: 0.72rem; margin-left: 6px; padding: 2px 6px; border: 1px solid #ff3b30; border-radius: 4px;">AGOTADO</span>' : ''}
                                </div>
                                ${ingredientesText ? `
                                    <div class="mch-desc" style="font-size: 0.74rem; color: rgba(255,255,255,0.68); line-height: 1.35;">
                                        <strong style="color: #f1c40f; font-weight: 700;">Ingredientes:</strong> ${ingredientesText}
                                    </div>
                                ` : ''}
                                <div class="mch-price-row" style="margin-top: 2px;">
                                    <span class="mch-price" style="font-size: 1rem; color: var(--mostaza); font-weight: 900;">₡${(product.precio || 0).toLocaleString()}</span>
                                </div>
                            </div>
                            ${isToday ? `
                                <button class="mch-add-btn" id="add-btn-${product.id}" ${isAgotado ? 'disabled style="background: #555; color: #888;"' : ''} onclick="CartManager.addItem('${product.id}')" title="Agregar a mi orden" style="align-self: center; width: 42px; height: 42px; border-radius: 50%; font-size: 1.2rem; flex-shrink: 0;">
                                    ${isAgotado ? '<i class="fas fa-ban"></i>' : btnContent}
                                </button>
                            ` : `
                                <div class="weekly-view-badge" title="Disponible el ${day.name}">
                                    <i class="fas fa-eye" style="color: rgba(241, 196, 15, 0.75); font-size: 0.75rem;"></i> Visualizar
                                </div>
                            `}
                        </div>
                    `;
                });

                daysHtml += `</div>`; // cierre .menu-list
            }

            daysHtml += `</div>`; // cierre .weekly-day-box
        });

        // Banner informativo inferior con accesos directos
        daysHtml += `
            <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 14px; padding: 18px 22px; margin-top: 15px; text-align: center;">
                <span style="font-size: 1rem; font-weight: 800; color: #fff; display: block; margin-bottom: 4px;">🍳 ¿Buscando Desayunos, Snacks o Bebidas?</span>
                <p style="margin: 0 0 14px 0; font-size: 0.82rem; color: rgba(255,255,255,0.7); max-width: 600px; margin-left: auto; margin-right: auto; line-height: 1.45;">
                    Nuestras famosas empanadas (arregladas, sencillas, señora empanada), burritos, pinto y café están <strong>disponibles todos los días de la semana</strong>.
                </p>
                <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
                    <button class="btn-primary" onclick="MenuController.renderCategory('desayuno'); document.getElementById('menu-dynamic-content')?.scrollIntoView({ behavior: 'smooth', block: 'start' });" style="padding: 9px 20px; font-size: 0.85rem; border-radius: 20px; cursor: pointer; font-weight: 700;">
                        🍳 Ver Desayunos
                    </button>
                    <button class="btn-primary" onclick="MenuController.renderCategory('snacks'); document.getElementById('menu-dynamic-content')?.scrollIntoView({ behavior: 'smooth', block: 'start' });" style="padding: 9px 20px; font-size: 0.85rem; border-radius: 20px; background: linear-gradient(135deg, #e67e22, #d35400); cursor: pointer; font-weight: 700;">
                        🥟 Ver Snacks & Empanadas
                    </button>
                    <button class="btn-primary" onclick="MenuController.renderCategory('bebidas'); document.getElementById('menu-dynamic-content')?.scrollIntoView({ behavior: 'smooth', block: 'start' });" style="padding: 9px 20px; font-size: 0.85rem; border-radius: 20px; background: linear-gradient(135deg, #3498db, #2980b9); cursor: pointer; font-weight: 700;">
                        ☕ Ver Bebidas
                    </button>
                </div>
            </div>
        `;
        daysHtml += `</div>`; // cierre flex column
        container.innerHTML = daysHtml;
    },

    renderCategory(categoryId) {
        if (categoryId === 'semana') {
            this.renderWeeklyMenu();
            return;
        }
        const catKey = (categoryId === 'pintos' || categoryId === 'desayuno') ? 'desayuno' : categoryId;
        StateManager.setCategory(catKey);
        const container = document.getElementById('menu-dynamic-content');
        const titleEl = document.getElementById('current-category-title');
        const countEl = document.getElementById('current-category-count');
        if (!container) return;

        // Reset de estilo del botón semana si no está activo
        const semanaBtn = document.querySelector('.sidebar-btn[data-cat="semana"]');
        if (semanaBtn) {
            semanaBtn.classList.remove('active');
            semanaBtn.style.background = 'rgba(241, 196, 15, 0.12)';
            semanaBtn.style.color = '#fff';
        }

        // Update sidebar active state
        document.querySelectorAll('.sidebar-btn').forEach(btn => {
            const isMatch = btn.dataset.cat === catKey || 
                            (catKey === 'desayuno' && btn.dataset.cat === 'pintos') ||
                            (catKey === 'pintos' && btn.dataset.cat === 'desayuno');
            if (isMatch) btn.classList.add('active');
            else if (btn.dataset.cat !== 'semana') btn.classList.remove('active');
        });

        const categoryInfo = (this.CATEGORIAS && this.CATEGORIAS.find(c => c.id === catKey || c.id === categoryId)) ||
                             (this.CATEGORIAS && this.CATEGORIAS.find(c => (catKey === 'desayuno' && c.id === 'pintos'))) ||
                             { icon: '🍳', nombre: 'Desayunos', subtitle: 'Deliciosos desayunos tradicionales' };
        if (titleEl) {
            titleEl.innerHTML = `${categoryInfo.icon || '🍳'} ${categoryInfo.nombre || 'Menú'}${
                categoryInfo.subtitle
                    ? `<span>${categoryInfo.subtitle}</span>`
                    : ''
            }`;
        }

        const isDesayunoCat = (categoryId === 'pintos' || categoryId === 'desayuno');
        const isSnacksCat = (categoryId === 'snacks' || categoryId === 'snack');

        let filtered = this.MENU_DATA.filter(p => {
            const dishCat = (p.categoria || '').toLowerCase();
            const id = (p.id || '').toLowerCase();
            const nombre = (p.nombre || '').toLowerCase();
            const isEmp = typeof window.isEmpanadaDish === 'function' ? window.isEmpanadaDish(p) : (id.includes('empanada') || nombre.includes('empanada'));
            const isCafe = typeof window.isCafeCombo === 'function' ? window.isCafeCombo(p) : (id.includes('cafe') || id.includes('café') || nombre.includes('+ café') || nombre.includes('+ cafe') || (nombre.includes('combo') && (nombre.includes('café') || nombre.includes('cafe'))));

            if (isDesayunoCat) {
                // En Desayunos van los desayunos y todas las 6 opciones de empanadas (sencillas y + café)
                if (isEmp) return true;
                return dishCat === 'pintos' || dishCat === 'desayuno';
            }
            if (isSnacksCat) {
                // En Snacks van las 3 empanadas individuales (SIN café) y los demás snacks
                if (isEmp) return !isCafe;
                return dishCat === 'snacks' || dishCat === 'snack' || dishCat === 'combos';
            }
            return dishCat === categoryId;
        });

        // Deduplicar productos en la categoría por nombre normalizado
        const seenCatNames = new Set();
        const dedupedFiltered = [];
        filtered.forEach(item => {
            const norm = (item.nombre || '').toLowerCase().trim();
            if (!seenCatNames.has(norm)) {
                seenCatNames.add(norm);
                dedupedFiltered.push(item);
            }
        });
        filtered = dedupedFiltered;
        
        // Ordenamiento específico solicitado para empanadas
        if (isDesayunoCat) {
            const empanadaOrder = {
                'p-empanada-sencilla': 10,
                'v-1791030289012': 11,
                'c-empanada-sencilla-cafe': 11,
                'p-empanada-arreglada': 12,
                'v-1790059042629': 13,
                'c-empanada-arreglada-cafe': 13,
                'v-1790058848755': 14,
                'p-sra-empanada': 14,
                'v-1790059143341': 15,
                'c-sra-empanada-cafe': 15
            };
            filtered.sort((a, b) => {
                const getOrder = (item) => {
                    if (empanadaOrder[item.id] !== undefined) return empanadaOrder[item.id];
                    const id = (item.id || '').toLowerCase();
                    const nom = (item.nombre || '').toLowerCase();
                    if (id.includes('empanada') || nom.includes('empanada')) {
                        if (nom.includes('sencilla') && (nom.includes('café') || nom.includes('cafe'))) return 11;
                        if (nom.includes('sencilla')) return 10;
                        if (nom.includes('arreglada') && (nom.includes('café') || nom.includes('cafe'))) return 13;
                        if (nom.includes('arreglada')) return 12;
                        if (nom.includes('señora') && (nom.includes('café') || nom.includes('cafe'))) return 15;
                        if (nom.includes('señora')) return 14;
                        return 16;
                    }
                    return 0; // Desayunos tradicionales primero
                };
                const oA = getOrder(a);
                const oB = getOrder(b);
                if (oA !== oB) return oA - oB;
                return b.precio - a.precio;
            });
        } else if (isSnacksCat) {
            const empanadaOrder = {
                'p-empanada-sencilla': 1,
                'p-empanada-arreglada': 2,
                'p-sra-empanada': 3
            };
            filtered.sort((a, b) => {
                const getOrder = (item) => {
                    if (empanadaOrder[item.id] !== undefined) return empanadaOrder[item.id];
                    const id = (item.id || '').toLowerCase();
                    const nom = (item.nombre || '').toLowerCase();
                    if (id.includes('empanada') || nom.includes('empanada')) {
                        if (nom.includes('sencilla')) return 1;
                        if (nom.includes('arreglada')) return 2;
                        if (nom.includes('señora')) return 3;
                        return 4;
                    }
                    return 99; // Otros snacks después
                };
                const oA = getOrder(a);
                const oB = getOrder(b);
                if (oA !== oB) return oA - oB;
                return b.precio - a.precio;
            });
        } else if (categoryId !== 'bebidas') {
            filtered.sort((a, b) => b.precio - a.precio);
        }
        
        if (countEl) countEl.innerText = `${filtered.length} opciones`;
        
        container.style.opacity = '1';
        container.style.transform = 'none';
        
        setTimeout(() => {
            container.innerHTML = filtered.map((product, index) => {
                const isAgotado = this.inventario[product.id] === false;
                const cartItem = CartManager.items.find(i => i.id === product.id);
                const btnContent = cartItem ? `<span style="font-weight: bold; font-size: 1.2rem;">${cartItem.quantity}</span>` : `<i class="fas fa-plus"></i>`;
                return `
                <div class="menu-card-h ${product.badgeClass ? 'highlight-item' : ''} ${isAgotado ? 'agotado' : ''}" id="card-${product.id}" onclick="CartManager.addItem('${product.id}')" style="cursor: pointer; --index: ${index}; ${isAgotado ? 'opacity: 0.5; filter: grayscale(1); pointer-events: none;' : ''}">
                    <div class="mch-img">${product.img}</div>
                    <div class="mch-info">
                        <div class="mch-title">${product.nombre} ${product.badge ? `<span class="mch-badge">${product.badge}</span>` : ''} ${isAgotado ? '<span style="color: #ff3b30; font-weight: 900; font-size: 0.75rem; margin-left: 6px; padding: 2px 6px; border: 1px solid #ff3b30; border-radius: 4px;">AGOTADO</span>' : ''}</div>
                        <div class="mch-desc">${product.desc}</div>
                        <div class="mch-price-row">
                            <span class="mch-price">₡${product.precio.toLocaleString()}</span>
                        </div>
                    </div>
                    <button class="mch-add-btn" id="add-btn-${product.id}" ${isAgotado ? 'disabled style="background: #ccc; color: #666;"' : ''} onclick="event.stopPropagation(); CartManager.addItem('${product.id}')">
                        ${isAgotado ? '<i class="fas fa-ban"></i>' : btnContent}
                    </button>
                </div>
            `}).join('');

            // Stagger animation trigger
            const cards = container.querySelectorAll('.menu-card-h');
            setTimeout(() => {
                cards.forEach(card => card.classList.add('card-visible'));
            }, 50);
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
        
        window.scrollTo(0, 0);
        setTimeout(() => {
            window.scrollTo(0, 0);
            document.body.scrollTop = 0;
            document.documentElement.scrollTop = 0;
        }, 150);
        
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
        
        window.scrollTo(0, 0);
        setTimeout(() => {
            window.scrollTo(0, 0);
            document.body.scrollTop = 0;
            document.documentElement.scrollTop = 0;
        }, 150);
        
        if (navigator.vibrate) navigator.vibrate(50);
    },
    
    toggleCart() {
        const drawer = document.getElementById('cart-drawer');
        if(drawer) drawer.classList.toggle('hidden');
    },

    showOptionsModal(product) {
        let modal = document.getElementById('options-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'options-modal';
            modal.style.cssText = `
                position: fixed;
                inset: 0;
                background: rgba(10, 0, 3, 0.88);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 999999;
                padding: 15px;
                opacity: 0;
                pointer-events: none;
                transition: opacity 0.15s ease;
            `;
            modal.innerHTML = `
                <div id="options-modal-card" style="
                    background: #190107;
                    border: 2px solid #f7b731;
                    border-radius: 20px;
                    padding: 22px 20px;
                    width: 100%;
                    max-width: 360px;
                    box-shadow: 0 15px 45px rgba(0,0,0,0.85);
                    text-align: center;
                    transform: scale(0.95);
                    transition: transform 0.15s ease;
                    display: flex;
                    flex-direction: column;
                    gap: 12px;
                ">
                    <div style="font-size: 0.75rem; text-transform: uppercase; letter-spacing: 1.5px; color: #f7b731; font-weight: 800;">
                        🥟 Selecciona el Relleno
                    </div>
                    <h3 id="options-title" style="
                        color: #ffffff;
                        font-size: 1.25rem;
                        font-weight: 900;
                        margin: 0;
                        line-height: 1.2;
                        font-family: 'Gotham', sans-serif;
                    "></h3>
                    <div id="options-price" style="font-size: 1rem; color: #2ecc71; font-weight: 800; margin-bottom: 4px;"></div>
                    <div id="options-list" style="display: flex; flex-direction: column; gap: 9px;"></div>
                    <button type="button" id="options-cancel-btn" style="
                        background: rgba(255,255,255,0.06);
                        border: 1px solid rgba(255,255,255,0.15);
                        color: rgba(255,255,255,0.7);
                        padding: 10px;
                        border-radius: 12px;
                        font-size: 0.82rem;
                        font-weight: 800;
                        cursor: pointer;
                        margin-top: 5px;
                        font-family: inherit;
                        transition: background 0.2s;
                    ">
                        CANCELAR
                    </button>
                </div>
            `;
            document.body.appendChild(modal);

            // Cerrar al hacer clic fuera o en botón cancelar
            modal.addEventListener('click', (e) => {
                if (e.target === modal || e.target.id === 'options-cancel-btn') {
                    UIController.closeOptionsModal();
                }
            });
        }

        // Poblar contenido
        const titleEl = document.getElementById('options-title');
        const priceEl = document.getElementById('options-price');
        const listEl = document.getElementById('options-list');
        const card = document.getElementById('options-modal-card');

        if (titleEl) titleEl.innerText = product.nombre;
        if (priceEl) priceEl.innerText = `₡${(product.precio || 0).toLocaleString()}`;

        // Mapeo de emojis para cada opción
        const flavorIcons = {
            'Queso': '🧀',
            'Carne': '🥩',
            'Pinto': '🍚',
            'Carne y Queso': '🧀🥩',
            'Coca Cola': '🥤',
            'Fresca': '🥤',
            'Fanta': '🥤',
            'Gingerale': '🥤',
            'Coca Zero': '🥤',
            'Té Blanco': '🧃'
        };

        const optionsToRender = (product.options && product.options.length) ? product.options : ['Queso', 'Carne', 'Pinto', 'Carne y Queso'];
        if (listEl) {
            listEl.innerHTML = optionsToRender.map(opt => {
                const icon = flavorIcons[opt] || '✨';
                return `
                    <button type="button" style="
                        background: linear-gradient(135deg, rgba(247, 183, 49, 0.15), rgba(243, 156, 18, 0.08));
                        border: 1.5px solid rgba(247, 183, 49, 0.5);
                        color: #ffffff;
                        padding: 13px 16px;
                        border-radius: 14px;
                        font-size: 1rem;
                        font-weight: 800;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        transition: background 0.15s, border-color 0.15s, transform 0.1s;
                        font-family: inherit;
                    "
                    onmousedown="this.style.transform='scale(0.98)'"
                    onmouseup="this.style.transform='scale(1)'"
                    onclick="CartManager.addItem('${product.id}', '${opt}'); UIController.closeOptionsModal();">
                        <span style="display: flex; align-items: center; gap: 10px;">
                            <span style="font-size: 1.25rem;">${icon}</span>
                            <span>${opt}</span>
                        </span>
                        <i class="fas fa-plus-circle" style="color: #f7b731; font-size: 1.1rem;"></i>
                    </button>
                `;
            }).join('');
        }

        modal.style.opacity = '1';
        modal.style.pointerEvents = 'auto';
        if (card) card.style.transform = 'scale(1)';
        if (navigator.vibrate) navigator.vibrate(20);
    },

    closeOptionsModal() {
        const modal = document.getElementById('options-modal');
        const card = document.getElementById('options-modal-card');
        if (modal) {
            modal.style.opacity = '0';
            modal.style.pointerEvents = 'none';
            if (card) card.style.transform = 'scale(0.95)';
        }
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
// MÓDULO: Image Expand Manager (Lupa)
// ========================================
const ImageExpandManager = {
    overlayElement: null,
    isExpanded: false,

    init() {
        // Añadir cursor pointer para que se entienda que es clickeable
        const style = document.createElement('style');
        style.innerHTML = `
            .mch-img { cursor: pointer; }
            .mch-img img { cursor: pointer; }
        `;
        document.head.appendChild(style);

        // Contenedor Overlay
        const overlay = document.createElement('div');
        overlay.id = 'fullscreen-image-overlay';
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100vw';
        overlay.style.height = '100vh';
        overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
        overlay.style.zIndex = '99999';
        overlay.style.display = 'flex';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';
        overlay.style.opacity = '0';
        overlay.style.pointerEvents = 'none';
        overlay.style.transition = 'opacity 0.3s ease';
        overlay.style.backdropFilter = 'blur(10px)';
        overlay.style.cursor = 'zoom-out'; // Indicador visual al hacer hover en desktop

        const img = document.createElement('img');
        img.id = 'fullscreen-image-element';
        img.style.maxWidth = '95%';
        img.style.maxHeight = '95%';
        img.style.objectFit = 'contain';
        img.style.borderRadius = '15px';
        img.style.boxShadow = '0 10px 40px rgba(0,0,0,0.8)';
        img.style.transform = 'scale(0.8)';
        img.style.transition = 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)';

        overlay.appendChild(img);
        document.body.appendChild(overlay);
        this.overlayElement = overlay;

        // Listener global para el click
        document.addEventListener('click', this.handleClick.bind(this));
    },

    handleClick(e) {
        // Si el usuario hace clic en el overlay o en la imagen expandida, lo cerramos
        if (e.target.id === 'fullscreen-image-overlay' || e.target.id === 'fullscreen-image-element') {
            this.hideFullscreen();
            return;
        }

        // Si el usuario hace clic en una imagen del menú, la expandimos
        let targetImg = null;
        if (e.target.tagName === 'IMG' && e.target.closest('.mch-img')) {
            targetImg = e.target;
        } else if (e.target.classList && e.target.classList.contains('mch-img')) {
            targetImg = e.target.querySelector('img');
        }

        if (targetImg) {
            this.showFullscreen(targetImg.src);
            if (navigator.vibrate) navigator.vibrate(50);
        }
    },

    showFullscreen(imgSrc) {
        this.isExpanded = true;
        const overlay = this.overlayElement;
        const img = document.getElementById('fullscreen-image-element');
        if (overlay && img) {
            img.src = imgSrc;
            overlay.style.opacity = '1';
            overlay.style.pointerEvents = 'auto';
            setTimeout(() => img.style.transform = 'scale(1)', 50);
        }
    },

    hideFullscreen() {
        this.isExpanded = false;
        const overlay = this.overlayElement;
        const img = document.getElementById('fullscreen-image-element');
        if (overlay && overlay.style.opacity === '1') {
            overlay.style.opacity = '0';
            overlay.style.pointerEvents = 'none';
            if (img) img.style.transform = 'scale(0.8)';
        }
    }
};

// ========================================
// MÓDULO: Inicializador Global
// ========================================
const AppInitializer = {
    initialize() {
        // 1. Core Managers
        CartManager.init();
        ImageExpandManager.init(); // Inicializar el expansor de imágenes
        
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
AppInitializer.initialize();

// Exportar controladores al objeto global window para interacción entre scripts
window.MenuController = MenuController;
window.CartManager = CartManager;
window.StateManager = StateManager;