document.addEventListener("DOMContentLoaded", () => {

    // ─── AUTOMATIZACIONES Y SOPORTE DE CONEXIÓN KDS (Cocina) ───
    // 1. Recarga de seguridad cada 15 minutos para asegurar reconexión
    setTimeout(() => {
        window.location.reload();
    }, 15 * 60 * 1000);

    // 2. Watchdog de suspensión (para tablets o TVs que entran en ahorro de energía)
    let lastTime = Date.now();
    setInterval(() => {
        const currentTime = Date.now();
        if (currentTime - lastTime > 25000) {
            console.log("🔄 KDS Cocina despertado de suspensión. Recargando...");
            window.location.reload();
        }
        lastTime = currentTime;
    }, 10000);

    // 3. Recargar al volver a estar online
    window.addEventListener("online", () => window.location.reload());
    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") {
            window.location.reload();
        }
    });
    // 1. Iniciar reloj
    const clockEl = document.getElementById('clock');
    setInterval(() => {
        const now = new Date();
        clockEl.innerText = now.toLocaleTimeString('es-CR');
    }, 1000);

    const ticketsContainer = document.getElementById('tickets-container');
    const bellSound = document.getElementById('bell-sound');
    
    // Almacenar pedidos actuales para saber cuándo hay uno nuevo
    let currentOrders = new Map();
    let initialLoad = true;

    if (!window.FirebaseDB || !window.Firestore) {
        ticketsContainer.innerHTML = `<div class="empty-state" style="color:red;"><i class="fas fa-exclamation-triangle"></i><p>Error conectando a Firebase. Revisa firebase-init.js</p></div>`;
        return;
    }

    const pedidosRef = window.Firestore.collection(window.FirebaseDB, "pedidos");
    
    // Escuchar cambios en tiempo real
    pedidosRef.where("estado", "==", "pendiente").onSnapshot((snapshot) => {
        let hasNewOrders = false;
        
        // Convertir docs a array para ordenarlos por fecha (del más antiguo al más reciente)
        const orders = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            data.id = doc.id;
            orders.push(data);
            
            // Si es un ID que no teníamos, es nuevo
            if (!initialLoad && !currentOrders.has(doc.id)) {
                hasNewOrders = true;
            }
        });
        
        // Ordenar: los más viejos primero (FIFO)
        orders.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

        // Actualizar nuestro mapa local
        currentOrders.clear();
        orders.forEach(o => currentOrders.set(o.id, o));

        // Reproducir sonido si hay nuevos
        if (hasNewOrders) {
            playBell();
        }

        renderTickets(orders);
        initialLoad = false;
    });

    function renderTickets(orders) {
        if (orders.length === 0) {
            ticketsContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-mug-hot"></i>
                    <p>Esperando comandas...</p>
                </div>`;
            return;
        }

        ticketsContainer.innerHTML = orders.map(order => {
            // Formatear hora
            const timeObj = new Date(order.fecha);
            const timeString = timeObj.toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' });
            
            // Evaluar si es "nuevo" (menos de 1 minuto) para ponerle borde brillante
            const isNew = (new Date() - timeObj) < 60000;
            
            let allergiesHtml = '';
            if (order.alergias && order.alergias.trim() !== '') {
                allergiesHtml = `
                    <div class="ticket-allergies">
                        <i class="fas fa-exclamation-triangle"></i> ${order.alergias}
                    </div>
                `;
            }

            // Ordenar items para que las bebidas (id empieza con 'b-') queden al final
            const sortedItems = [...order.items].sort((a, b) => {
                const isDrinkA = a.id.startsWith('b-') ? 1 : 0;
                const isDrinkB = b.id.startsWith('b-') ? 1 : 0;
                return isDrinkA - isDrinkB;
            });

            let itemsHtml = sortedItems.map(item => `
                <li class="ticket-item">
                    <span class="item-qty">${item.cantidad}</span>
                    <span class="item-name">${item.nombre}</span>
                </li>
            `).join('');

            return `
                <div class="ticket ${isNew ? 'new-ticket' : ''}" id="ticket-${order.id}">
                    <div class="ticket-header">
                        <span class="ticket-id">#${order.num_pedido || order.id.slice(-5).toUpperCase()}</span>
                        <span class="ticket-time">${timeString}</span>
                    </div>
                    <div class="ticket-body">
                        <div class="ticket-customer">
                            <i class="fas fa-user"></i> ${order.cliente}
                        </div>
                        ${allergiesHtml}
                        <ul class="ticket-items">
                            ${itemsHtml}
                        </ul>
                    </div>
                    <div class="ticket-footer" style="display: flex; gap: 10px;">
                        <button class="btn-return" onclick="CocinaManager.regresar('${order.id}')" style="flex: 1; background: linear-gradient(135deg, var(--rojo), var(--alerta)); border: none; color: white; padding: 12px; border-radius: 8px; font-weight: 700; font-family: inherit; cursor: pointer; transition: 0.2s; display: flex; align-items: center; justify-content: center; gap: 5px;">
                            <i class="fas fa-undo"></i> Regresar
                        </button>
                        <button class="btn-complete" onclick="CocinaManager.completar('${order.id}')" style="flex: 2; padding: 12px; font-size: 1.1rem;">
                            <i class="fas fa-check-circle"></i> Listo
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    function playBell() {
        if(bellSound) {
            // Chrome requiere interacción previa para reproducir audio a veces,
            // pero en pantallas KDS de uso dedicado se suelen configurar los permisos.
            bellSound.currentTime = 0;
            bellSound.play().catch(e => console.log("Auto-play bloqueado por el navegador:", e));
        }
    }
});

// Lógica global para el botón de completar y regresar
window.CocinaManager = {
    async regresar(id) {
        const ticketEl = document.getElementById(`ticket-${id}`);
        if(ticketEl) {
            const btn = ticketEl.querySelector('.btn-return');
            if (btn) {
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ...';
                btn.disabled = true;
            }
        }

        try {
            const db = window.FirebaseDB;
            const docRef = db.collection("pedidos").doc(id);
            
            // Actualizar el estado en Firebase a regresado
            await docRef.update({ estado: "regresado" });
            
            // Animación de salida
            if(ticketEl) {
                ticketEl.classList.add('completed-anim');
            }
        } catch(error) {
            console.error("Error al regresar el pedido:", error);
            alert("No se pudo regresar el pedido. Revisa tu conexión.");
            if(ticketEl) {
                const btn = ticketEl.querySelector('.btn-return');
                if (btn) {
                    btn.innerHTML = '<i class="fas fa-undo"></i> Regresar';
                    btn.disabled = false;
                }
            }
        }
    },

    async completar(id) {
        const ticketEl = document.getElementById(`ticket-${id}`);
        if(ticketEl) {
            const btn = ticketEl.querySelector('.btn-complete');
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
            btn.disabled = true;
        }

        try {
            const db = window.FirebaseDB;
            const docRef = db.collection("pedidos").doc(id);
            
            // 1. Obtener la orden para saber qué descontar
            const orderSnap = await docRef.get();
            if (orderSnap.exists) {
                const orderData = orderSnap.data();
                
                // 2. Procesar inventario
                if (window.RECETAS) {
                    const batch = db.batch();
                    let hasDecrements = false;
                    
                    orderData.items.forEach(item => {
                        const receta = window.RECETAS[item.id];
                        if (receta) {
                            receta.forEach(ing => {
                                const inventarioRef = db.collection('inventario').doc(ing.id);
                                // Usar set con merge para crearlo si no existe e incrementar negativamente
                                batch.set(inventarioRef, {
                                    cantidad: firebase.firestore.FieldValue.increment(-(ing.cant * item.cantidad)),
                                    nombre: ing.id.replace(/_/g, ' ') // Para que se cree con un nombre si es nuevo
                                }, { merge: true });
                                hasDecrements = true;
                            });
                        }
                    });
                    
                    if (hasDecrements) {
                        await batch.commit().catch(err => console.error("Error al actualizar inventario:", err));
                    }
                }
            }

            // 3. Actualizar el estado en Firebase a listo
            await docRef.update({ estado: "listo" });
            
            // Animación de salida
            if(ticketEl) {
                ticketEl.classList.add('completed-anim');
            }
        } catch(error) {
            console.error("Error al completar el pedido:", error);
            alert("No se pudo completar el pedido. Revisa tu conexión.");
            if(ticketEl) {
                const btn = ticketEl.querySelector('.btn-complete');
                btn.innerHTML = '<i class="fas fa-check-circle"></i> Listo';
                btn.disabled = false;
            }
        }
    }
};
