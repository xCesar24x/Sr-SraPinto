document.addEventListener("DOMContentLoaded", () => {

    // ─── AUTOMATIZACIONES Y SOPORTE SMART TV (Sankey, etc.) ───
    // 1. Evitar la desconexión por reposo de la TV: forzar recarga cada 15 minutos
    setTimeout(() => {
        window.location.reload();
    }, 15 * 60 * 1000);

    // 2. Watchdog de suspensión mejorado: umbral ajustado a 35s para evitar falsos positivos por lag de reproducción de video en TVs de bajo procesador
    //    Si el intervalo de 8s tarda más de 35s, el navegador estuvo congelado/suspendido
    let lastTime = Date.now();
    setInterval(() => {
        const currentTime = Date.now();
        if (currentTime - lastTime > 35000) {
            console.log("🔄 TV despertada de suspensión. Recargando para reconectar base de datos...");
            window.location.reload();
        }
        lastTime = currentTime;
    }, 8000);

    // 3. Forzar refresco si el dispositivo recupera conexión a Internet o se enfoca de nuevo la pantalla
    //    (muchas TVs Sankey no implementan visibilitychange, pero se deja por compatibilidad)
    window.addEventListener("online", () => window.location.reload());
    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") {
            window.location.reload();
        }
    });

    // ─── CHEQUEAR ROTACIÓN FORZADA (Por URL o localStorage guardado) ───
    const urlParams = new URLSearchParams(window.location.search);
    let rotationType = urlParams.get('rotate') || urlParams.get('rotar');
    
    // Si se especifica "none" o "reset", eliminamos la preferencia guardada
    if (rotationType === 'none' || rotationType === 'normal' || rotationType === 'reset') {
        localStorage.removeItem('pantalla_rotation');
        rotationType = null;
    } else if (rotationType) {
        // Si viene un parámetro de rotación válido, lo recordamos en esta TV/pantalla
        localStorage.setItem('pantalla_rotation', rotationType);
    } else {
        // Si no se pasó parámetro, recordamos la configuración del último uso
        rotationType = localStorage.getItem('pantalla_rotation');
    }
    
    if (rotationType === 'true' || rotationType === 'clockwise' || rotationType === '90') {
        document.body.classList.add('force-rotated');
    } else if (rotationType === 'counter' || rotationType === 'counter-clockwise' || rotationType === '-90' || rotationType === '270') {
        document.body.classList.add('force-rotated-counter');
    }

    // ─── AJUSTE DINÁMICO DE ROTACIÓN (Evita recortes en pantallas con barras de navegador) ───
    function adjustRotationDimensions() {
        if (document.body.classList.contains('force-rotated')) {
            const w = window.innerWidth;
            const h = window.innerHeight;
            document.body.style.width = h + "px";
            document.body.style.height = w + "px";
            document.body.style.left = w + "px";
            document.body.style.top = "0px";
        } else if (document.body.classList.contains('force-rotated-counter')) {
            const w = window.innerWidth;
            const h = window.innerHeight;
            document.body.style.width = h + "px";
            document.body.style.height = w + "px";
            document.body.style.left = "0px";
            document.body.style.top = h + "px";
        } else {
            document.body.style.width = "";
            document.body.style.height = "";
            document.body.style.left = "";
            document.body.style.top = "";
        }
    }
    adjustRotationDimensions();
    window.addEventListener("resize", adjustRotationDimensions);

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

    // ─── HEARTBEAT: Ping liviano a Firestore cada 2 minutos ───
    // Mantiene viva la conexión WebSocket en TVs con navegadores de bajo recurso
    // que tienden a cortar conexiones inactivas silenciosamente
    let lastSnapshotReceived = Date.now();
    setInterval(async () => {
        try {
            // Lectura liviana: solo 1 documento para hacer ping a Firestore
            await db.collection("pedidos").limit(1).get();
            console.log("💓 Heartbeat Firestore OK");

            // ─── LISTENER HEALTH CHECK ───
            // Si el onSnapshot lleva más de 90 segundos sin recibir ningún evento
            // (ni cambios ni el pulso inicial), significa que el WebSocket está muerto.
            // En ese caso recargamos para reconectar limpiamente.
            const silentMs = Date.now() - lastSnapshotReceived;
            if (silentMs > 90000) {
                console.warn("⚠️ Listener de Firebase silencioso por " + Math.round(silentMs/1000) + "s. Recargando...");
                window.location.reload();
            }
        } catch(e) {
            console.error("❌ Heartbeat falló. Sin conexión a Firestore:", e);
            window.location.reload();
        }
    }, 2 * 60 * 1000); // cada 2 minutos

    // Escuchar pedidos pendientes (en proceso) e inyectar en tiempo real
    db.collection("pedidos")
        .where("estado", "in", ["pendiente", "listo"])
        .onSnapshot((snapshot) => {

            // Registrar el momento del último evento recibido (para el health check)
            lastSnapshotReceived = Date.now();
            
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
                    }, 210000)); // Desaparece después de 3.5 minutos (210,000 ms)
                }
            });
        }, (error) => {
            // Manejar errores del listener explícitamente (ej. pérdida de permisos o conexión)
            console.error("❌ Error en listener de Firestore:", error);
            setTimeout(() => window.location.reload(), 3000); // Reconectar tras 3 segundos
        });

    const videoScreensaver = document.getElementById('video-screensaver');
    const videoEl = videoScreensaver ? videoScreensaver.querySelector('video') : null;

    if (videoEl) {
        // Bucle manual para solventar fallas del atributo 'loop' nativo en Smart TVs
        videoEl.addEventListener('ended', () => {
            console.log("🎬 Video finalizado. Reiniciando bucle de reproducción...");
            videoEl.load(); // Forzar recarga completa del decodificador en la TV
            videoEl.play().catch(err => console.error("Error al reiniciar video:", err));
        });

        // Watchdog de reproducción específico para evitar congelamiento al final o a mitad en TVs lentas
        let lastVideoTime = -1;
        let freezeCounter = 0;

        setInterval(() => {
            // Solo evaluar si el salvapantallas está activo y visible
            if (videoScreensaver && videoScreensaver.classList.contains('active')) {
                const currentTime = videoEl.currentTime;

                // Si se supone que está reproduciéndose pero el tiempo se congela
                if (!videoEl.paused) {
                    if (currentTime === lastVideoTime) {
                        freezeCounter++;
                        // Si el tiempo no cambia durante 3 segundos, forzamos recarga
                        if (freezeCounter >= 3) {
                            console.warn("⚠️ Reproducción congelada detectada. Forzando recarga de video...");
                            videoEl.load();
                            videoEl.play().catch(err => console.error(err));
                            freezeCounter = 0;
                        }
                    } else {
                        freezeCounter = 0;
                    }
                }

                // Si llega al puro final (menos de 0.8s para terminar) y la TV se traba sin disparar 'ended'
                if (videoEl.duration && (videoEl.duration - currentTime < 0.8)) {
                    console.log("🎬 Video cerca del final. Forzando ciclo de reinicio de stream...");
                    videoEl.load();
                    videoEl.play().catch(err => console.error(err));
                }

                lastVideoTime = currentTime;
            }
        }, 1000);
    }

    function renderOrders(orders) {
        if (orders.length === 0) {
            emptyDisplay.style.display = 'flex';
            displayColumns.style.display = 'none';
            if (videoScreensaver) {
                videoScreensaver.classList.add('active');
                if (videoEl && videoEl.paused) {
                    videoEl.play().catch(err => console.error("Error al reproducir video:", err));
                }
            }
            return;
        }

        emptyDisplay.style.display = 'none';
        displayColumns.style.display = 'grid';
        if (videoScreensaver) {
            videoScreensaver.classList.remove('active');
            if (videoEl && !videoEl.paused) {
                videoEl.pause();
            }
        }

        const preparingOrders = orders.filter(o => o.estado === 'pendiente').slice(0, 4);
        const readyOrders = orders.filter(o => o.estado === 'listo').slice(0, 4);

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
        const cleanNum = (order.num_pedido !== undefined && order.num_pedido !== null) ? order.num_pedido.toString().replace(/['"]/g, '') : '';
        const ticketId = cleanNum || order.id.slice(-5).toUpperCase();

        return `
            <div class="order-card ${cardClass}">
                <div class="card-status-bar"></div>
                <div class="card-body" style="padding: 12px 20px; display: flex; align-items: center; justify-content: space-between; gap: 15px;">
                    <div class="card-customer" style="margin-bottom: 0; display: flex; align-items: center; gap: 12px; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                        <i class="fas fa-user-circle"></i> 
                        <span style="font-weight: 900; letter-spacing: 0.5px;">${order.cliente}</span>
                    </div>
                    <div class="card-order-id" style="font-size: 1.5rem; font-weight: 900; color: var(--mostaza); font-family: 'Rotio', sans-serif; background: rgba(255,255,255,0.06); padding: 6px 12px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); letter-spacing: 1px; flex-shrink: 0;">
                        ${ticketId}
                    </div>
                </div>
            </div>
        `;
    }

    // ─── MENSAJES PROMOCIONALES ROTATIVOS (Cada 2 minutos) ───
    const promoMessages = [
        { title: "¡Qué rico un pinto con huevo!", subtitle: "Pedí el tuyo y mirá acá cuándo está listo" },
        { title: "¡Tome pal pinto!", subtitle: "Aprovechá y pedí algo delicioso para acompañar" },
        { title: "¡El gallo pinto te está esperando!", subtitle: "Hacé tu pedido y disfrutá del mejor sabor" },
        { title: "¡Tome pal pinto!", subtitle: "¿Ya pediste tu cafecito o prefieres algo más?" },
        { title: "¿Antojo de pinto?", subtitle: "¡Nosotros te lo preparamos! Pedí ya tu combo" },
        { title: "¡Soy más que un pinto!", subtitle: "¿Ya probaste mi burrote?" },
        { title: "¡Tome pal pinto!", subtitle: "Pedí en la caja y mirá acá cuándo está listo" },
        { title: "¡Un cafecito con pinto es ideal!", subtitle: "Hacé tu pedido y mirá acá cuándo está listo" }
    ];
    let currentPromoIndex = 0;

    setInterval(() => {
        // Solo actualizamos si el empty display está visible y no es un error de conexión
        if (emptyDisplay && emptyDisplay.style.display !== 'none' && !emptyDisplay.innerHTML.includes('fa-exclamation-triangle')) {
            currentPromoIndex = (currentPromoIndex + 1) % promoMessages.length;
            const msg = promoMessages[currentPromoIndex];
            const pElement = emptyDisplay.querySelector('p');
            const spanElement = emptyDisplay.querySelector('span');
            
            if (pElement && spanElement) {
                pElement.style.opacity = 0;
                spanElement.style.opacity = 0;
                
                setTimeout(() => {
                    pElement.innerText = msg.title;
                    spanElement.innerText = msg.subtitle;
                    pElement.style.opacity = 1;
                    spanElement.style.opacity = 1;
                }, 500);
            }
        }
    }, 2 * 60 * 1000); // Cada 2 minutos
});
