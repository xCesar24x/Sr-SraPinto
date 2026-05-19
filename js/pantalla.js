document.addEventListener("DOMContentLoaded", () => {

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
    const ordersGrid = document.getElementById('orders-grid');

    if (!window.FirebaseDB) {
        ordersGrid.innerHTML = `<div class="empty-display"><i class="fas fa-exclamation-triangle" style="color:red;"></i><p>Error de conexión</p></div>`;
        return;
    }

    const db = window.FirebaseDB;
    
    // Obtenemos la fecha de hoy (inicio del día) para filtrar solo pedidos de hoy
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    // Map para rastrear pedidos completados y removerlos después de un rato
    const completedTimers = new Map();

    // Escuchar pedidos pendientes (en proceso)
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

            // Ordenar: pendientes primero, luego listos. Dentro de cada grupo, por fecha
            orders.sort((a, b) => {
                if (a.estado === 'pendiente' && b.estado === 'listo') return -1;
                if (a.estado === 'listo' && b.estado === 'pendiente') return 1;
                return new Date(a.fecha) - new Date(b.fecha);
            });

            renderOrders(orders);

            // Programar auto-desaparición de los pedidos completados
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
            ordersGrid.innerHTML = `
                <div class="empty-display">
                    <i class="fas fa-mug-hot"></i>
                    <p>¡Aún no hay pedidos!</p>
                    <span>Hacé tu pedido y mirá acá cuándo está listo</span>
                </div>`;
            return;
        }

        ordersGrid.innerHTML = orders.map(order => {
            const isPendiente = order.estado === 'pendiente';
            const cardClass = isPendiente ? 'en-proceso' : 'completado';
            
            // Items list
            const itemsHtml = order.items.map(item => 
                `<li><span class="qty">${item.cantidad}x</span> ${item.nombre}</li>`
            ).join('');

            // Status badge
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
        }).join('');
    }
});
