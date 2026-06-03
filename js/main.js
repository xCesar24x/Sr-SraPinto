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
        this.updateCartUI();
    },
    
    save() {
        localStorage.setItem('srysrapinto_cart', JSON.stringify(this.items));
    },
    
    addItem(productId, option = null) {
        const product = MenuController.getProductById(productId);
        if (!product) return;
        
        if (product.requiresOptions && !option) {
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
        
        message += `🔗 Visítanos en: https://sr-sra-pinto.vercel.app/\n`;

        const url = `https://wa.me/50688224763?text=${encodeURIComponent(message)}`;
        window.open(url, '_blank');
        
        // Opcional: mostrar modal de éxito después de enviarlo por WA
        document.getElementById('success-overlay').classList.add('active');
    },

    async procesarPedido() {
        if (this.items.length === 0) return;

        const btn = document.getElementById('btn-checkout');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...';
        btn.style.pointerEvents = 'none';

        try {
            const isSalesPOS = window.location.pathname.includes('ventas.html');
            const estadoInicial = isSalesPOS ? 'pendiente' : 'pendiente_aprobacion';

            const pedido = {
                cliente: this.customerName || 'Cliente sin nombre',
                alergias: this.hasAllergies ? this.allergiesText : '',
                metodoPago: this.selectedPaymentMethod,
                total: this.getTotal(),
                items: this.items.map(item => ({
                    id: item.id,
                    nombre: item.nombre,
                    cantidad: item.quantity,
                    precio: item.precio
                })),
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
                        estado: 'pendiente', // Al modificarlo va directo a cocina
                        fechaModificacion: new Date().toISOString()
                    });
                    console.log("✅ Pedido modificado y enviado a cocina");
                    
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
                            textEl.innerHTML = `La comanda fue modificada con éxito.<br>Los cambios se enviaron directamente a la cocina.<br>¡Buen trabajo!`;
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
                    }

                    // Crear nuevo pedido
                    const docRef = await window.Firestore.addDoc(
                        window.Firestore.collection(window.FirebaseDB, "pedidos"),
                        pedido
                    );
                    console.log("✅ Pedido creado en Firebase");
                    window.lastProcessedOrder = { ...pedido, id: docRef.id };

                    // Mostrar modal de éxito
                    const successOverlay = document.getElementById('success-overlay');
                    if (successOverlay) {
                        successOverlay.classList.add('active');
                        const textEl = successOverlay.querySelector('.success-text');
                        if(textEl) {
                            if (isSalesPOS) {
                                const displayNum = pedido.num_pedido ? `#${pedido.num_pedido}` : `#${docRef.id.slice(-5).toUpperCase()}`;
                                textEl.innerHTML = `El pedido fue enviado directamente a la cocina con la comanda <strong>${displayNum}</strong>.<br>En breves momentos comenzará su preparación.<br>¡Buen provecho!`;
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
                        if (this.customerName) { message += `👤 *Cliente:* ${this.customerName}\n\n`; }
                        if (this.hasAllergies && this.allergiesText.trim() !== '') { message += `⚠️ *Alergias / Restricciones:*\n${this.allergiesText.trim()}\n\n`; }
                        message += `📝 *Detalle del pedido:*\n${itemsList}\n`;
                        message += `💰 *TOTAL: ₡${this.getTotal().toLocaleString()}*\n`;
                        message += `💳 *Método de pago:* ${this.selectedPaymentMethod}\n\n`;
                        message += `🔗 Visítanos en: https://sr-sra-pinto.vercel.app/\n`;

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
        // Vaciar carrito
        this.items = [];
        this.customerName = '';
        this.hasAllergies = false;
        this.allergiesText = '';
        this.editingOrderId = null;
        
        // Reset inputs
        const nameInput = document.getElementById('order-name');
        if (nameInput) nameInput.value = '';
        const allergiesCheck = document.getElementById('has-allergies');
        if (allergiesCheck) { allergiesCheck.checked = false; this.toggleAllergies(false); }
        const allergiesText = document.getElementById('allergies-text');
        if (allergiesText) allergiesText.value = '';

        // Ocultar banner de edición si existe
        const banner = document.getElementById('editing-order-banner');
        if (banner) banner.style.display = 'none';

        this.save();
        this.updateCartUI();
        
        const successOverlay = document.getElementById('success-overlay');
        if (successOverlay) successOverlay.classList.remove('active');
        
        UIController.toggleCart(); // Cierra el carrito
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

    imprimirTiquete(pedido) {
        if (!pedido) {
            alert("No hay ningún pedido cargado para imprimir.");
            return;
        }

        // Obtener el nombre del empleado que inició sesión
        const empleadoName = localStorage.getItem('srsrapinto_cedula') || 'Vendedor 1';

        this.convertirLogoYEjecutar((logoBase64) => {
            let logoHtml = '';
            if (logoBase64) {
                logoHtml = `<img class="logo" src="${logoBase64}" style="display: block; margin: 0 auto 5px; width: 140px;" />`;
            }

            const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body {
            width: 270px;
            font-family: 'Courier New', monospace;
            font-size: 13px;
            color: #000;
            margin: 0;
            padding: 0;
            background-color: #fff;
        }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .bold { font-weight: bold; }
        .divider { border-top: 1px dashed #000; margin: 8px 0; }
        .flex { display: flex; justify-content: space-between; }
        .item-row { margin-bottom: 6px; }
        .item-qty { font-size: 11px; margin-top: 1px; }
    </style>
</head>
<body>
    <div class="text-center">
        ${logoHtml}
        <div class="bold" style="font-size: 14px; margin-top: 5px;">Sr & Sra Pinto</div>
        <div style="font-size: 10px; margin-top: 2px; letter-spacing: 0.5px;">EL SABOR DE SER TICO</div>
    </div>
    
    <div class="divider"></div>
    
    <div>
        <div>Empleado: ${empleadoName}</div>
        <div>TPV: POS tablet B</div>
        <div class="bold" style="margin-top: 4px;">Comer dentro</div>
        ${pedido.alergias && pedido.alergias.trim() !== '' ? `
            <div style="background: #000; color: #fff; padding: 4px; font-weight: bold; margin-top: 4px; font-size: 11px;">
                ⚠️ ALERGIAS: ${pedido.alergias}
            </div>
        ` : ''}
    </div>
    
    <div class="divider"></div>
    
    <div>
        ${pedido.items.map(item => `
            <div class="item-row">
                <div class="flex">
                    <span class="bold">${item.nombre}</span>
                    <span class="bold">₡${(item.precio * item.quantity || item.precio * item.cantidad).toLocaleString()}</span>
                </div>
                <div class="item-qty">${item.quantity || item.cantidad} x ₡${item.precio.toLocaleString()}</div>
            </div>
        `).join('')}
    </div>
    
    <div class="divider"></div>
    
    <div class="bold">
        <div class="flex" style="font-size: 14px;">
            <span>Total</span>
            <span>₡${pedido.total.toLocaleString()}</span>
        </div>
        <div class="flex" style="margin-top: 4px;">
            <span>${pedido.metodoPago}</span>
            <span>₡${pedido.total.toLocaleString()}</span>
        </div>
    </div>
    
    <div class="divider"></div>
    
    <div class="text-center" style="font-size: 11px;">
        <div>Gracias por tu compra!</div>
        <div style="margin-top: 2px;">Dios te bendiga :)</div>
        <div style="margin-top: 8px; font-size: 9px; opacity: 0.8;">
            ${new Date(pedido.fecha).toLocaleDateString('es-CR')} ${new Date(pedido.fecha).toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' })}
        </div>
    </div>
    
    <div style="height: 35px;"></div>
</body>
</html>
            `;

            try {
                // Codificar HTML en Base64
                const encodedContent = btoa(unescape(encodeURIComponent(htmlContent)));
                
                // Android Intent para disparar impresión directa con RawBT
                const intentUrl = 'intent://#Intent;' +
                    'action=android.intent.action.SEND;' +
                    'type=text/html;' +
                    'component=ru.a402d.rawbtprinter/.activity.PrintDownloadActivity;' +
                    'package=ru.a402d.rawbtprinter;' +
                    'S.android.intent.extra.TEXT=' + encodeURIComponent(encodedContent) + ';' +
                    'end;';
                
                window.location.href = intentUrl;
            } catch (error) {
                console.error("Error al disparar la impresión de RawBT:", error);
                alert("Error al enviar el ticket a la impresora. Revisa la configuración de RawBT.");
            }
        });
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
            img: '<img src="images-catalogo/Quesopinto.jpeg" alt="Queso Pinto">'
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
            id: 'p-empanada-carne-queso',
            categoria: 'snacks',
            nombre: 'Empanada de Carne y Queso Mozzarella',
            desc: 'Empanada artesanal rellena de carne y queso mozzarella derretido.',
            precio: 2500,
            img: '<img src="images-catalogo/empanadas.jpeg" alt="Empanada de Carne y Queso Mozzarella">'
        },
        {
            id: 'p-sra-empanada-m2',
            categoria: 'snacks',
            nombre: 'Sra. Empanada Arreglada',
            desc: 'Empanada con ensalada y salsas. Elige tu relleno.',
            precio: 3500,
            img: '<img src="images-catalogo/Sra. Empanada Arreglada .jpeg" alt="Sra. Empanada Arreglada">',
            requiresOptions: true,
            options: ['Carne', 'Queso Mozzarella', 'Carne y Queso Mozzarella']
        },
        {
            id: 'c-empanada-cafe',
            categoria: 'snacks',
            nombre: 'Combo: Empanada + Café',
            desc: 'Llévatelo en combo: Empanada a elegir + Café Premium Grande.',
            precio: 3000,
            img: '<img src="images-catalogo/empanadas.jpeg" alt="Combo Empanada + Café">',
            badge: 'Combo',
            badgeClass: 'badge-value',
            requiresOptions: true,
            options: ['Carne', 'Queso Mozzarella', 'Carne y Queso Mozzarella']
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
            options: ['Coca Cola', 'Fresca', 'Fanta', 'Gingerale', 'Coca Zero']
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

    inventario: {},
    customPrices: {},
    feriaConfig: { active: false, combos_active: false },
    feriaCustomPrices: null,

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
        }
        this.renderSidebar();
        this.renderCategory('pintos');
    },

    applyStateAndRender() {
        // 1. Restaurar al estado original
        this.MENU_DATA = JSON.parse(JSON.stringify(this.ORIGINAL_MENU_DATA));
        this.CATEGORIAS = JSON.parse(JSON.stringify(this.ORIGINAL_CATEGORIAS));

        // 2. Aplicar Modo Feria si está activo
        if (this.feriaConfig && this.feriaConfig.active) {
            // Precios de Feria (mezcla entre los estáticos y los editados)
            const baseFeriaPrices = {
                'p-senor-pinto': 4000, 'c-senor-pinto-cafe': 4000, 'c-burrote-cafe': 3000,
                'p-sr-patacon': 4000, 'p-sra-quesadilla': 4000, 'p-empanada-carne': 2000,
                'p-empanada-queso': 2000, 'p-empanada-carne-queso': 2000, 'p-sra-empanada-m1': 3500,
                'p-sra-empanada-m2': 3500, 'p-sra-hamburguesa': 5000, 'p-cono-salchipapa': 3000,
                'p-sr-papi-carne': 3500, 'b-cafe-premium': 1300, 'p-patacon-caribeno': 4000,
                'c-queso-pinto-cafe': 4000, 'b-cafe-8oz': 1000, 'ce-empanada-fresco': 2000,
                'ce-salchipapa-fresco': 2500, 'ce-hamburguesa-jr-fresco': 2500, 'ce-hotdog-fresco': 2000
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
                    requiresOptions: true, options: ['Carne', 'Queso', 'Carne y Queso']
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

        // 4. Aplicar Precios Manuales (sobreescriben cualquier precio anterior)
        if (this.customPrices) {
            this.MENU_DATA.forEach(p => {
                if (this.customPrices[p.id] !== undefined) {
                    p.precio = this.customPrices[p.id];
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
        // Sincronizar UI del carrito
        if (window.CartManager && typeof window.CartManager.updateCartUI === 'function') {
            window.CartManager.updateCartUI();
        }
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
        
        // Ordenar por precio de mayor a menor (excepto bebidas para mantener cafés juntos)
        if (categoryId !== 'bebidas') {
            filtered.sort((a, b) => b.precio - a.precio);
        }
        
        if (countEl) countEl.innerText = `${filtered.length} opciones`;
        
        container.style.opacity = '1';
        container.style.transform = 'none';
        
        setTimeout(() => {
            container.innerHTML = filtered.map(product => {
                const isAgotado = this.inventario[product.id] === false;
                const cartItem = CartManager.items.find(i => i.id === product.id);
                const btnContent = cartItem ? `<span style="font-weight: bold; font-size: 1.2rem;">${cartItem.quantity}</span>` : `<i class="fas fa-plus"></i>`;
                return `
                <div class="menu-card-h ${product.badgeClass ? 'highlight-item' : ''} ${isAgotado ? 'agotado' : ''}" id="card-${product.id}" ${isAgotado ? 'style="opacity: 0.5; filter: grayscale(1); pointer-events: none;"' : ''}>
                    <div class="mch-img">${product.img}</div>
                    <div class="mch-info">
                        <div class="mch-title">${product.nombre} ${product.badge ? `<span class="mch-badge">${product.badge}</span>` : ''} ${isAgotado ? '<span style="color: #ff3b30; font-weight: 900; font-size: 0.75rem; margin-left: 6px; padding: 2px 6px; border: 1px solid #ff3b30; border-radius: 4px;">AGOTADO</span>' : ''}</div>
                        <div class="mch-desc">${product.desc}</div>
                        <div class="mch-price-row">
                            <span class="mch-price">₡${product.precio.toLocaleString()}</span>
                        </div>
                    </div>
                    <button class="mch-add-btn" id="add-btn-${product.id}" ${isAgotado ? 'disabled style="background: #ccc; color: #666;"' : ''} onclick="CartManager.addItem('${product.id}')">
                        ${isAgotado ? '<i class="fas fa-ban"></i>' : btnContent}
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
            modal.className = 'success-overlay active';
            modal.style.zIndex = '10000';
            modal.innerHTML = `
                <div class="success-modal" style="padding: 30px;">
                    <div style="font-size: 2rem; color: var(--mostaza); margin-bottom: 10px;"><i class="fas fa-list"></i></div>
                    <h2 class="success-title" id="options-title" style="font-size: 1.5rem; margin-bottom: 20px;">Elige una opción</h2>
                    <div id="options-list" style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 20px;">
                    </div>
                    <button class="success-btn" style="padding: 10px; border-color: rgba(255,255,255,0.1);" onclick="document.getElementById('options-modal').classList.remove('active')">
                        CANCELAR
                    </button>
                </div>
            `;
            document.body.appendChild(modal);
        } else {
            modal.classList.add('active');
        }
        
        document.getElementById('options-title').innerText = product.nombre;
        const list = document.getElementById('options-list');
        list.innerHTML = product.options.map(opt => `
            <button class="success-btn" style="padding: 12px; font-size: 1rem; border-color: var(--mostaza); color: var(--mostaza);" onclick="CartManager.addItem('${product.id}', '${opt}'); document.getElementById('options-modal').classList.remove('active');">
                ${opt}
            </button>
        `).join('');
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