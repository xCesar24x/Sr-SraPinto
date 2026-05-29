document.addEventListener("DOMContentLoaded", () => {

    // ─── CHEQUEAR ROTACIÓN FORZADA (Por URL ?rotate=true) ───
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('rotate') === 'true' || urlParams.get('rotar') === 'true') {
        document.body.classList.add('force-rotated');
    }

    // ─── RELOJ ───
    const clockEl = document.getElementById('clock');
    function updateClock() {
        const now = new Date();
        clockEl.innerText = now.toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' });
    }
    updateClock();
    setInterval(updateClock, 1000);

    // ─── SLIDESHOW DE FONDO (cada 5 segundos) ───
    const slides = document.querySelectorAll('.bg-slide');
    let currentSlide = 0;
    if (slides.length > 1) {
        setInterval(() => {
            slides[currentSlide].classList.remove('active');
            currentSlide = (currentSlide + 1) % slides.length;
            slides[currentSlide].classList.add('active');
        }, 5000);
    }

    // ─── FIREBASE: ESCUCHAR PEDIDOS EN TIEMPO REAL ───
    const emptyDisplay = document.getElementById('empty-display');
    const displayColumns = document.getElementById('display-columns');
    const preparingList = document.getElementById('preparing-list');
    const readyList = document.getElementById('ready-list');

    if (!window.FirebaseDB) {
        if (emptyDisplay) {
            emptyDisplay.innerHTML = `<i class="fas fa-exclamation-triangle" style="color:red; font-size: 5rem;"></i><p>Error de conexión</p><span>No se pudo cargar la base de datos de Firebase.</span>`;
        }
        return;
    }

    const db = window.FirebaseDB;
    
    // Obtenemos la fecha de hoy (inicio del día) para filtrar solo pedidos de hoy
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    // Map para rastrear pedidos completados y removerlos después de un rato
    const completedTimers = new Map();

    // Escuchar pedidos pendientes (en proceso) e inyectar en tiempo real
    db.collection("pedidos")
        .where("estado", "in", ["pendiente", "listo"])
        .onSnapshot((snapshot) => {
            
            const orders = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                data.id = doc.id;
                // Solo mostrar pedidos de hoy
                if (data.fecha >= todayISO) {
                    orders.push(data);
                }
            });

            // Ordenar: por fecha ascendente para que los más antiguos queden arriba
            orders.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

            renderOrders(orders);

            // Programar auto-desaparición de los pedidos listos/completados
            orders.forEach(order => {
                if (order.estado === 'listo' && !completedTimers.has(order.id)) {
                    completedTimers.set(order.id, setTimeout(async () => {
                        // Cambiar estado a "retirado" para que desaparezca de la pantalla
                        try {
                            await db.collection("pedidos").doc(order.id).update({ estado: "retirado" });
                        } catch(e) { console.error(e); }
                        completedTimers.delete(order.id);
                    }, 120000)); // Desaparece después de 2 minutos (120,000 ms)
                }
            });
        });

    function renderOrders(orders) {
        if (orders.length === 0) {
            emptyDisplay.style.display = 'flex';
            displayColumns.style.display = 'none';
            return;
        }

        emptyDisplay.style.display = 'none';
        displayColumns.style.display = 'grid';

        const preparingOrders = orders.filter(o => o.estado === 'pendiente');
        const readyOrders = orders.filter(o => o.estado === 'listo');

        // 1. Renderizar Columna: EN PREPARACIÓN
        if (preparingOrders.length === 0) {
            preparingList.innerHTML = `
                <div class="column-empty-state">
                    <i class="fas fa-check-double"></i>
                    <p>¡Sin pendientes!</p>
                    <span>Todo lo solicitado está listo para retirar</span>
                </div>`;
        } else {
            preparingList.innerHTML = preparingOrders.map(order => renderOrderCard(order)).join('');
        }

        // 2. Renderizar Columna: LISTO PARA RETIRAR
        if (readyOrders.length === 0) {
            readyList.innerHTML = `
                <div class="column-empty-state">
                    <i class="fas fa-clock"></i>
                    <p>Esperando entregas</p>
                    <span>Los pedidos aparecerán aquí cuando estén listos</span>
                </div>`;
        } else {
            readyList.innerHTML = readyOrders.map(order => renderOrderCard(order)).join('');
        }
    }

    function renderOrderCard(order) {
        const isPendiente = order.estado === 'pendiente';
        const cardClass = isPendiente ? 'en-proceso' : 'completado';
        
        // Lista de platillos
        const itemsHtml = order.items.map(item => 
            `<li><span class="qty">${item.cantidad}x</span> ${item.nombre}</li>`
        ).join('');

        // Badge de estado específico
        const statusHtml = isPendiente
            ? `<div class="card-status status-proceso"><i class="fas fa-fire"></i> En Preparación</div>`
            : `<div class="card-status status-listo"><i class="fas fa-check-circle"></i> ¡Listo para retirar!</div>`;

        return `
            <div class="order-card ${cardClass}">
                <div class="card-status-bar"></div>
                <div class="card-body">
                    <div class="card-customer">
                        <i class="fas fa-user-circle"></i> ${order.cliente}
                    </div>
                    <ul class="card-items">${itemsHtml}</ul>
                    ${statusHtml}
                </div>
            </div>
        `;
    }
});
