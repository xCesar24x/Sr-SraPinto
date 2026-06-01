// Costos base de producción por defecto (fallback e inicialización en la nube)
let COSTOS_PRODUCTOS = {
    // PINTOS
    'p-senor-pinto': 1200,
    'c-senor-pinto-cafe': 1450,
    'p-burrote': 1000,
    'c-burrote-cafe': 1250,
    'p-empanada-pinto': 750,
    'p-sra-empanada-m1': 1100,
    'p-queso-pinto': 1100,

    // SNACKS & ANTOJOS
    'p-sr-patacon': 1300,
    'p-sra-quesadilla': 1400,
    'p-sra-hamburguesa': 1900,
    'p-empanada-carne': 800,
    'p-empanada-queso': 750,
    'p-empanada-carne-queso': 850,
    'p-empanada-birria': 900,
    'p-sra-empanada-m2': 1050,
    'c-empanada-cafe': 1100,
    'p-cono-salchipapa': 950,
    'p-sr-papi-carne': 1200,

    // BEBIDAS
    'b-cafe-premium': 300,
    'b-agua': 200,
    'b-gaseosas': 450,
    'b-hidratante': 500
};

document.addEventListener("DOMContentLoaded", () => {
    
    const inventoryList = document.getElementById('inventory-list');
    const selectItem = document.getElementById('stock-item-select');
    const modal = document.getElementById('stock-modal');
    
    // Stats elements
    const statHuevos = document.getElementById('stat-huevos');
    const statQueso = document.getElementById('stat-queso');
    const statAlertas = document.getElementById('stat-alertas');

    let currentInventory = [];
    let cachedOrders = [];
    let ordersListener = null;

    // INIT
    if (!window.FirebaseDB || !window.Firestore) {
        inventoryList.innerHTML = `<tr><td colspan="4" style="color:red;">Error de conexión a Firebase.</td></tr>`;
        return;
    }

    const db = window.FirebaseDB;

    // Cargar costos desde Firestore en tiempo real para mantener rentabilidades actualizadas
    db.collection('config').doc('costos').onSnapshot((doc) => {
        if (doc.exists) {
            // Mezclar con los locales por si hay nuevos productos agregados
            COSTOS_PRODUCTOS = { ...COSTOS_PRODUCTOS, ...doc.data() };
            console.log("✅ Costos de producción sincronizados desde Firestore:", COSTOS_PRODUCTOS);
        } else {
            // Inicializar el documento en Firestore si no existe
            db.collection('config').doc('costos').set(COSTOS_PRODUCTOS)
                .then(() => console.log("🌱 Documento de costos inicializado en Firestore con valores por defecto."))
                .catch(err => console.error("Error inicializando costos en la nube:", err));
        }
        
        // Recalcular analíticas si estamos en la pestaña activa
        if (document.getElementById('section-reports').classList.contains('active')) {
            ReportsManager.loadAnalytics();
        }
    });

    // ========================================
    // MÓDULO: Inventario
    // ========================================
    db.collection("inventario").onSnapshot((snapshot) => {
        currentInventory = [];
        snapshot.forEach(doc => {
            currentInventory.push({ id: doc.id, ...doc.data() });
        });

        // Ordenar alfabéticamente
        currentInventory.sort((a, b) => (a.nombre || a.id).localeCompare(b.nombre || b.id));

        renderTable(currentInventory);
        updateStats(currentInventory);
        updateSelect(currentInventory);
    });

    function renderTable(items) {
        if (items.length === 0) {
            inventoryList.innerHTML = `<tr><td colspan="4" style="text-align:center;">El inventario está vacío. Los items se crearán automáticamente.</td></tr>`;
            return;
        }

        inventoryList.innerHTML = items.map(item => {
            const nombreStr = item.nombre || item.id.replace(/_/g, ' ');
            const cant = item.cantidad || 0;
            
            let status = '';
            if (cant <= 0) status = '<span class="status-badge status-low">Agotado</span>';
            else if (cant <= 10) status = '<span class="status-badge status-warn">Bajo</span>';
            else status = '<span class="status-badge status-ok">Normal</span>';

            return `
                <tr>
                    <td style="text-transform: capitalize;"><strong>${nombreStr}</strong></td>
                    <td style="font-size: 1.2rem; font-weight: 900;">${cant}</td>
                    <td>${status}</td>
                    <td>
                        <button class="action-btn" onclick="AdminManager.openAddModal('${item.id}')" title="Ajustar">
                            <i class="fas fa-edit"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    function updateStats(items) {
        const huevos = items.find(i => i.id === 'huevos');
        const queso = items.find(i => i.id === 'queso_frito');
        
        statHuevos.innerText = huevos ? huevos.cantidad : 'N/A';
        statQueso.innerText = queso ? queso.cantidad : 'N/A';

        const bajas = items.filter(i => (i.cantidad || 0) <= 10).length;
        statAlertas.innerText = bajas;
        
        // Efecto visual si hay alertas
        const alertEl = document.getElementById('alerts-card');
        if (alertEl) {
            if (bajas > 0) {
                alertEl.style.animation = "pulse 2s infinite";
            } else {
                alertEl.style.animation = "none";
            }
        }
    }

    function updateSelect(items) {
        selectItem.innerHTML = items.map(item => {
            const nombreStr = item.nombre || item.id.replace(/_/g, ' ');
            return `<option value="${item.id}">${nombreStr} (Actual: ${item.cantidad || 0})</option>`;
        }).join('');
    }

    // ========================================
    // MÓDULO: Navegación & Admin Manager
    // ========================================
    window.AdminManager = {
        // Cambiar entre pestañas
        switchTab(tabId, event) {
            if(event) event.preventDefault();

            // Desactivar todos los enlaces y secciones
            document.querySelectorAll('.sidebar-nav a').forEach(a => a.classList.remove('active'));
            document.querySelectorAll('.admin-section').forEach(sec => sec.classList.remove('active'));

            // Activar seleccionados
            document.getElementById(`nav-${tabId}`).classList.add('active');
            document.getElementById(`section-${tabId}`).classList.add('active');

            // Cargar datos correspondientes
            if (tabId === 'reports') {
                ReportsManager.init();
            } else if (tabId === 'users') {
                UsersManager.init();
            }
        },

        openAddModal(id = null) {
            modal.classList.add('active');
            if(id) {
                selectItem.value = id;
            }
        },
        closeAddModal() {
            modal.classList.remove('active');
            document.getElementById('stock-qty').value = '';
        },
        async saveStock() {
            const id = selectItem.value;
            const op = document.querySelector('input[name="stock-op"]:checked').value;
            const qtyStr = document.getElementById('stock-qty').value;
            const qty = parseFloat(qtyStr);

            if (!id || isNaN(qty) || qty <= 0) {
                alert("Por favor ingresa una cantidad válida.");
                return;
            }

            try {
                const docRef = db.collection('inventario').doc(id);
                
                if (op === 'add') {
                    await docRef.update({
                        cantidad: firebase.firestore.FieldValue.increment(qty)
                    });
                } else {
                    await docRef.update({
                        cantidad: qty
                    });
                }
                
                this.closeAddModal();
            } catch (error) {
                console.error("Error al actualizar inventario:", error);
                alert("Hubo un error al guardar.");
            }
        },

        // Toggle del estado del local (Abierto / Cerrado)
        async toggleStore() {
            const card = document.getElementById('store-toggle-card');
            const isCurrentlyOpen = card.classList.contains('open');
            const newState = !isCurrentlyOpen;

            try {
                await db.collection('config').doc('estado').set({
                    abierto: newState,
                    actualizadoPor: localStorage.getItem('srsrapinto_cedula') || 'admin',
                    fecha: new Date().toISOString()
                });
            } catch (error) {
                console.error("Error al cambiar estado del local:", error);
                alert("No se pudo cambiar el estado.");
            }
        },

        // Toggle del estado del turno (Iniciar / Cerrar Turno)
        async toggleShift() {
            const card = document.getElementById('shift-toggle-card');
            const isCurrentlyActive = card.classList.contains('open');
            const newActiveState = !isCurrentlyActive;

            if (newActiveState) {
                if (!confirm("⚠️ ¿Deseas INICIAR un nuevo turno?\n\nEsto habilitará la caja para ventas y reiniciará el número de comanda a la número #1.")) return;
            } else {
                if (!confirm("⚠️ ¿Deseas CERRAR el turno actual?\n\nEsto bloqueará el registro de nuevas comandas en la caja hasta que se abra otro turno.")) return;
            }

            try {
                await db.collection('config').doc('turno').set({
                    activo: newActiveState,
                    siguiente_numero: 1, // Se reinicia/prepara siempre en 1
                    actualizadoPor: localStorage.getItem('srsrapinto_cedula') || 'admin',
                    fecha: new Date().toISOString()
                });
            } catch (error) {
                console.error("Error al cambiar estado del turno:", error);
                alert("No se pudo cambiar el estado del turno.");
            }
        }
    };

    // Escuchar el estado del local en tiempo real
    db.collection('config').doc('estado').onSnapshot((doc) => {
        const card = document.getElementById('store-toggle-card');
        const btn = document.getElementById('toggle-btn');
        const icon = document.getElementById('toggle-icon');
        const title = card ? card.querySelector('h3') : null;
        const subtitle = document.getElementById('toggle-subtitle');

        if (!card || !btn) return;

        if (doc.exists && doc.data().abierto === true) {
            card.classList.add('open');
            btn.classList.add('open');
            btn.classList.remove('closed');
            icon.innerHTML = '<i class="fas fa-store"></i>';
            if(title) title.innerText = '¡Local Abierto!';
            if(subtitle) subtitle.innerText = 'Los clientes ven que estás abierto.';
        } else {
            card.classList.remove('open');
            btn.classList.remove('open');
            btn.classList.add('closed');
            icon.innerHTML = '<i class="fas fa-store-slash"></i>';
            if(title) title.innerText = 'Local Cerrado';
            if(subtitle) subtitle.innerText = 'Los clientes ven que estás cerrado.';
        }
    });

    // Escuchar el estado del turno en tiempo real
    db.collection('config').doc('turno').onSnapshot((doc) => {
        const card = document.getElementById('shift-toggle-card');
        const btn = document.getElementById('shift-toggle-btn');
        const icon = document.getElementById('shift-toggle-icon');
        const title = card ? card.querySelector('h3') : null;
        const subtitle = document.getElementById('shift-toggle-subtitle');

        if (!card || !btn) return;

        if (doc.exists && doc.data().activo === true) {
            card.classList.add('open');
            btn.classList.add('open');
            btn.classList.remove('closed');
            if (icon) {
                icon.style.background = 'rgba(46, 204, 113, 0.15)';
                icon.style.color = 'var(--verde)';
                icon.innerHTML = '<i class="fas fa-clock"></i>';
            }
            if(title) title.innerText = 'Turno Iniciado';
            const nextNum = doc.data().siguiente_numero || 1;
            if(subtitle) subtitle.innerText = `Siguiente Comanda: #${nextNum}. Turno activo.`;
        } else {
            card.classList.remove('open');
            btn.classList.remove('open');
            btn.classList.add('closed');
            if (icon) {
                icon.style.background = 'rgba(231, 76, 60, 0.15)';
                icon.style.color = 'var(--alerta)';
                icon.innerHTML = '<i class="fas fa-history"></i>';
            }
            if(title) title.innerText = 'Turno Cerrado';
            if(subtitle) subtitle.innerText = 'Presiona para iniciar turno y resetear a #1.';
        }
    });


    // ========================================
    // MÓDULO: Reportes y Analíticas Avanzadas
    // ========================================
    window.bestsellersChartInstance = null;
    window.paymentsChartInstance = null;

    window.ReportsManager = {
        currentShift: 'full', // 'full', 'morning', 'afternoon', 'night'

        init() {
            // Inicializar las fechas por defecto para el rango personalizado si no tienen valor
            const startInput = document.getElementById('report-start-date');
            const endInput = document.getElementById('report-end-date');
            if (startInput && !startInput.value) {
                const oneWeekAgo = new Date();
                oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
                startInput.value = oneWeekAgo.toISOString().split('T')[0];
            }
            if (endInput && !endInput.value) {
                endInput.value = new Date().toISOString().split('T')[0];
            }

            if (ordersListener) return;

            // Escuchar pedidos en tiempo real para mantener analíticas actualizadas
            ordersListener = db.collection("pedidos").onSnapshot((snapshot) => {
                cachedOrders = [];
                snapshot.forEach(doc => {
                    cachedOrders.push({ id: doc.id, ...doc.data() });
                });
                
                this.loadAnalytics();
            }, (error) => {
                console.error("Error escuchando pedidos:", error);
            });
        },

        // Cambiar el filtro de turno
        setShift(shift) {
            this.currentShift = shift;

            // Cambiar estilos de botones de turno
            document.querySelectorAll('.shift-cuts button').forEach(btn => {
                btn.style.background = 'transparent';
                btn.style.color = 'var(--blanco)';
            });

            const activeBtn = document.getElementById(`btn-shift-${shift}`);
            if (activeBtn) {
                activeBtn.style.background = 'rgba(233, 19, 80, 0.2)';
                activeBtn.style.color = 'var(--rojo)';
            }

            this.loadAnalytics();
        },

        // Manejar cambio en el selector de periodo
        handlePeriodChange() {
            const period = document.getElementById('report-period-select').value;
            const customRangeContainer = document.getElementById('custom-range-container');
            
            if (period === 'rango') {
                customRangeContainer.style.display = 'flex';
            } else {
                customRangeContainer.style.display = 'none';
            }

            this.loadAnalytics();
        },

        loadAnalytics() {
            const period = document.getElementById('report-period-select').value;
            const now = new Date();
            
            // Definir límites de fecha
            let startLimit = new Date();
            let endLimit = new Date();
            let checkPeriod = true;

            if (period === 'hoy') {
                startLimit.setHours(0,0,0,0);
                endLimit.setHours(23,59,59,999);
            } else if (period === 'ayer') {
                startLimit.setDate(startLimit.getDate() - 1);
                startLimit.setHours(0,0,0,0);
                endLimit.setDate(endLimit.getDate() - 1);
                endLimit.setHours(23,59,59,999);
            } else if (period === '7dias') {
                startLimit.setDate(startLimit.getDate() - 7);
                startLimit.setHours(0,0,0,0);
            } else if (period === 'mes') {
                startLimit = new Date(now.getFullYear(), now.getMonth(), 1);
                startLimit.setHours(0,0,0,0);
            } else if (period === 'rango') {
                const startDateVal = document.getElementById('report-start-date').value;
                const endDateVal = document.getElementById('report-end-date').value;
                
                if (startDateVal) {
                    startLimit = new Date(startDateVal + 'T00:00:00');
                } else {
                    startLimit.setDate(startLimit.getDate() - 7);
                    startLimit.setHours(0,0,0,0);
                }
                
                if (endDateVal) {
                    endLimit = new Date(endDateVal + 'T23:59:59');
                } else {
                    endLimit.setHours(23,59,59,999);
                }
            } else {
                checkPeriod = false; // Histórico completo
            }

            // Filtrar pedidos (Excluir pendientes de aprobación ya que no son ventas confirmadas)
            const filteredOrders = cachedOrders.filter(order => {
                if (order.estado === 'pendiente_aprobacion') return false;
                
                const orderDate = new Date(order.fecha);
                
                // Filtro de Período / Fecha
                if (checkPeriod) {
                    if (orderDate < startLimit || orderDate > endLimit) return false;
                }

                // Filtro de Cortes de Día (Turnos)
                if (this.currentShift !== 'full') {
                    const hours = orderDate.getHours();
                    if (this.currentShift === 'morning' && (hours < 6 || hours >= 12)) return false;
                    if (this.currentShift === 'afternoon' && (hours < 12 || hours >= 18)) return false;
                    if (this.currentShift === 'night' && (hours < 18 && hours >= 6)) return false;
                }
                
                return true;
            });

            // Ordenar pedidos de más reciente a más antiguo para el log de auditoría
            filteredOrders.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

            // Calcular Métricas Financieras (Ventas, Costos y Rentabilidad)
            let totalRevenue = 0;
            let totalCogs = 0;
            let ordersCount = filteredOrders.length;
            
            filteredOrders.forEach(order => {
                totalRevenue += (order.total || 0);

                // Calcular costo estimado de este pedido (COGS)
                if (order.items) {
                    order.items.forEach(item => {
                        const cleanId = item.id.split('-')[0];
                        const costPerUnit = COSTOS_PRODUCTOS[cleanId] || COSTOS_PRODUCTOS[item.id] || (item.precio * 0.4);
                        totalCogs += (costPerUnit * (item.cantidad || 0));
                    });
                }
            });

            // Redondear para evitar decimales molestos
            totalCogs = Math.round(totalCogs);
            const totalProfit = Math.max(0, totalRevenue - totalCogs);
            const profitMargin = totalRevenue > 0 ? Math.round((totalProfit / totalRevenue) * 100) : 0;
            const avgTicket = ordersCount > 0 ? Math.round(totalRevenue / ordersCount) : 0;

            // Renderizar métricas en pantalla
            document.getElementById('stat-revenue').innerText = `₡${totalRevenue.toLocaleString()}`;
            document.getElementById('stat-cogs').innerText = `₡${totalCogs.toLocaleString()}`;
            document.getElementById('stat-profit').innerText = `₡${totalProfit.toLocaleString()}`;
            document.getElementById('stat-margin').innerText = `${profitMargin}%`;
            document.getElementById('stat-orders-count').innerText = ordersCount;
            document.getElementById('stat-avg-ticket').innerText = `₡${avgTicket.toLocaleString()}`;

            // Procesar Gráficos e Ingredientes
            this.processBestsellers(filteredOrders);
            this.processPaymentMethods(filteredOrders);
            this.processIngredientsConsumption(filteredOrders);
            this.renderAuditLog(filteredOrders);
        },

        processBestsellers(orders) {
            const productSales = {};

            orders.forEach(order => {
                if (order.items) {
                    order.items.forEach(item => {
                        productSales[item.nombre] = (productSales[item.nombre] || 0) + (item.cantidad || 0);
                    });
                }
            });

            // Convertir a array y ordenar de mayor a menor
            const sortedProducts = Object.entries(productSales)
                .map(([name, qty]) => ({ name, qty }))
                .sort((a, b) => b.qty - a.qty)
                .slice(0, 7); // Top 7 bestsellers

            const labels = sortedProducts.map(p => p.name);
            const data = sortedProducts.map(p => p.qty);

            // Destruir gráfico anterior si existe para evitar superposiciones
            if (window.bestsellersChartInstance) {
                window.bestsellersChartInstance.destroy();
            }

            const ctx = document.getElementById('bestsellers-chart').getContext('2d');
            if (data.length === 0) {
                ctx.clearRect(0, 0, 400, 280);
                ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
                ctx.font = "14px Gotham";
                ctx.textAlign = "center";
                ctx.fillText("No hay suficientes datos de ventas.", 200, 140);
                return;
            }

            window.bestsellersChartInstance = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Unidades Vendidas',
                        data: data,
                        backgroundColor: 'rgba(233, 19, 80, 0.7)',
                        borderColor: '#E91350',
                        borderWidth: 1,
                        borderRadius: 5
                    }]
                },
                options: {
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false }
                    },
                    scales: {
                        x: {
                            grid: { color: 'rgba(255, 255, 255, 0.05)' },
                            ticks: { color: 'rgba(255, 255, 255, 0.6)' }
                        },
                        y: {
                            grid: { display: false },
                            ticks: { color: 'rgba(255, 255, 255, 0.8)', font: { size: 11 } }
                        }
                    }
                }
            });
        },

        processPaymentMethods(orders) {
            const paymentTotals = { 'Efectivo': 0, 'SINPE Móvil': 0, 'Tarjeta': 0 };

            orders.forEach(order => {
                const method = order.metodoPago || 'Efectivo';
                paymentTotals[method] = (paymentTotals[method] || 0) + (order.total || 0);
            });

            const labels = Object.keys(paymentTotals);
            const data = Object.values(paymentTotals);

            if (window.paymentsChartInstance) {
                window.paymentsChartInstance.destroy();
            }

            const ctx = document.getElementById('payment-methods-chart').getContext('2d');
            const totalSum = data.reduce((a, b) => a + b, 0);

            if (totalSum === 0) {
                ctx.clearRect(0, 0, 400, 280);
                ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
                ctx.font = "14px Gotham";
                ctx.textAlign = "center";
                ctx.fillText("Sin transacciones registradas.", 200, 140);
                return;
            }

            window.paymentsChartInstance = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: labels,
                    datasets: [{
                        data: data,
                        backgroundColor: [
                            'rgba(46, 204, 113, 0.7)',  // Efectivo (Verde)
                            'rgba(241, 196, 15, 0.7)',  // SINPE Móvil (Mostaza)
                            'rgba(52, 152, 219, 0.7)'   // Tarjeta (Celeste)
                        ],
                        borderColor: [
                            '#2ecc71',
                            '#f1c40f',
                            '#3498db'
                        ],
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: { color: 'rgba(255, 255, 255, 0.8)', font: { size: 11 } }
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const value = context.raw || 0;
                                    const percent = Math.round((value / totalSum) * 100);
                                    return ` ${context.label}: ₡${value.toLocaleString()} (${percent}%)`;
                                }
                            }
                        }
                    },
                    cutout: '60%'
                }
            });
        },

        processIngredientsConsumption(orders) {
            const ingredientConsumption = {};

            orders.forEach(order => {
                if (order.estado !== 'listo' && order.estado !== 'retirado') return;

                if (order.items) {
                    order.items.forEach(item => {
                        const receta = window.RECETAS ? window.RECETAS[item.id] : null;
                        if (receta) {
                            receta.forEach(ing => {
                                ingredientConsumption[ing.id] = (ingredientConsumption[ing.id] || 0) + (ing.cant * item.cantidad);
                            });
                        }
                    });
                }
            });

            const consumptionList = document.getElementById('consumption-list');
            const entries = Object.entries(ingredientConsumption).sort((a, b) => b[1] - a[1]);

            if (entries.length === 0) {
                consumptionList.innerHTML = `<div style="padding: 20px; text-align: center; opacity: 0.5;">No hay consumo estimado en este período.</div>`;
                return;
            }

            const maxQty = entries[0][1];

            consumptionList.innerHTML = entries.map(([ingId, cant]) => {
                const nombreStr = ingId.replace(/_/g, ' ');
                const percent = Math.round((cant / maxQty) * 100);
                
                let unit = 'unds';
                if (ingId.includes('pinto') || ingId.includes('carne') || ingId.includes('papas_fritas') || ingId.includes('ensalada') || ingId.includes('frijoles')) {
                    unit = 'porciones';
                }

                return `
                    <div class="consumption-item">
                        <div class="consumption-info">
                            <span style="text-transform: capitalize;"><strong>${nombreStr}</strong></span>
                            <span>${cant.toLocaleString()} ${unit}</span>
                        </div>
                        <div class="consumption-bar-container">
                            <div class="consumption-bar" style="width: ${percent}%;"></div>
                        </div>
                    </div>
                `;
            }).join('');
        },

        renderAuditLog(orders) {
            const container = document.getElementById('audit-orders-list');
            if (orders.length === 0) {
                container.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 20px; opacity: 0.5;">No hay pedidos registrados en este período.</td></tr>`;
                return;
            }

            container.innerHTML = orders.map(order => {
                const dateObj = new Date(order.fecha);
                const dateStr = dateObj.toLocaleDateString('es-CR', { day: '2-digit', month: '2-digit' }) + ' ' + 
                                dateObj.toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' });
                
                let detailsText = order.items.map(i => `${i.cantidad}x ${i.nombre.split(' (')[0]}`).join(', ');
                if (detailsText.length > 30) detailsText = detailsText.substring(0, 27) + '...';

                let statusBadge = '';
                if (order.estado === 'pendiente') statusBadge = '<span style="color:#f1c40f; margin-left:5px;"><i class="fas fa-fire"></i></span>';
                else if (order.estado === 'listo' || order.estado === 'retirado') statusBadge = '<span style="color:#2ecc71; margin-left:5px;"><i class="fas fa-check-double"></i></span>';

                return `
                    <tr>
                        <td style="font-size: 0.8rem;">${dateStr}</td>
                        <td style="font-weight:700;">[#${order.num_pedido || order.id.slice(-5).toUpperCase()}] ${order.cliente} ${statusBadge}</td>
                        <td style="font-weight:900;">₡${(order.total || 0).toLocaleString()}</td>
                        <td><span class="user-badge badge-${(order.metodoPago || 'Efectivo').toLowerCase().replace(/\s/g, '')}">${order.metodoPago || 'Efectivo'}</span></td>
                        <td style="font-size: 0.8rem; opacity: 0.8;" title="${order.items.map(i => `${i.cantidad}x ${i.nombre}`).join('\n')}">${detailsText}</td>
                    </tr>
                `;
            }).join('');
        },

        // --- GESTIÓN DINÁMICA DE COSTOS EN FIRESTORE ---
        openCostsModal() {
            const container = document.getElementById('costs-inputs-container');
            const costsModal = document.getElementById('costs-modal');
            
            // Construir array con nombres legibles para ordenar correctamente
            const formattedCosts = Object.entries(COSTOS_PRODUCTOS).map(([id, cost]) => {
                let name = id.replace(/^(p|c|b)-/, '').replace(/_/g, ' ').replace(/-/g, ' ');
                let prefix = '';
                if (id.startsWith('p-')) prefix = '🍳 ';
                else if (id.startsWith('c-')) prefix = '✨ ';
                else if (id.startsWith('b-')) prefix = '☕ ';
                
                return { id, cost, name, prefix };
            });

            // Ordenar alfabéticamente de la A a la Z según el nombre legible del producto
            formattedCosts.sort((a, b) => a.name.localeCompare(b.name));

            container.innerHTML = formattedCosts.map(item => `
                <div class="form-group" style="display: flex; flex-direction: row; justify-content: space-between; align-items: center; background: rgba(0,0,0,0.2); padding: 8px 12px; border-radius: 8px; border: 1px solid var(--border);">
                    <label style="text-transform: capitalize; font-size: 0.85rem; font-weight: 700; margin: 0; color: var(--blanco);">${item.prefix}${item.name}</label>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 0.9rem; opacity: 0.5; color: var(--mostaza);">₡</span>
                        <input type="number" data-id="${item.id}" value="${item.cost}" style="width: 100px; padding: 6px; text-align: right; background: rgba(0,0,0,0.5); border: 1px solid var(--border); color: var(--mostaza); border-radius: 6px; font-weight: 900;" min="0">
                    </div>
                </div>
            `).join('');

            costsModal.classList.add('active');
        },

        closeCostsModal() {
            document.getElementById('costs-modal').classList.remove('active');
        },

        async saveCosts() {
            const inputs = document.querySelectorAll('#costs-inputs-container input');
            const newCosts = {};
            let hasErrors = false;

            inputs.forEach(input => {
                const id = input.dataset.id;
                const cost = parseInt(input.value);
                if (isNaN(cost) || cost < 0) {
                    hasErrors = true;
                    return;
                }
                newCosts[id] = cost;
            });

            if (hasErrors) {
                alert("Por favor ingresa costos válidos mayores o iguales a 0.");
                return;
            }

            const btnSave = document.getElementById('btn-save-costs');
            btnSave.disabled = true;
            btnSave.innerText = "Guardando...";

            try {
                // Guardar en la base de datos Firestore de forma persistente
                await db.collection('config').doc('costos').set(newCosts);
                
                // Actualizar nuestra variable local para el recálculo
                COSTOS_PRODUCTOS = newCosts;
                
                this.closeCostsModal();
                this.loadAnalytics(); // Recargar analíticas al instante con los nuevos costos
            } catch (error) {
                console.error("Error guardando costos en la nube:", error);
                alert("Ocurrió un error al guardar los costos en la base de datos.");
            } finally {
                btnSave.disabled = false;
                btnSave.innerText = "Guardar Costos";
            }
        },

        // --- MÓDULO DE MANTENIMIENTO: CORTE DE BASE DE DATOS Y RESET DE PEDIDOS ---
        openMaintenanceModal() {
            document.getElementById('maintenance-confirm-input').value = "";
            document.getElementById('maintenance-modal').classList.add('active');
        },

        closeMaintenanceModal() {
            document.getElementById('maintenance-modal').classList.remove('active');
        },

        async executeDatabaseCorte() {
            const confirmVal = document.getElementById('maintenance-confirm-input').value.trim();
            if (confirmVal !== "CORTAR") {
                alert("⚠️ Para poder ejecutar la limpieza, debes escribir exactamente 'CORTAR' en mayúsculas.");
                return;
            }

            const btnExecute = document.getElementById('btn-execute-corte');
            btnExecute.disabled = true;
            btnExecute.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando...';

            try {
                // 1. Obtener todos los pedidos actuales para el respaldo
                const snapshot = await db.collection("pedidos").get();
                const totalPedidos = snapshot.size;

                // 2. Generar y descargar el respaldo de seguridad en JSON si hay pedidos
                if (totalPedidos > 0) {
                    const backupData = [];
                    snapshot.forEach(doc => {
                        backupData.push({ id: doc.id, ...doc.data() });
                    });

                    // Ordenar por fecha para mejor visualización posterior
                    backupData.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

                    const jsonStr = JSON.stringify(backupData, null, 2);
                    const blob = new Blob([jsonStr], { type: "application/json" });
                    const url = URL.createObjectURL(blob);
                    
                    const a = document.createElement("a");
                    a.href = url;
                    const dateStr = new Date().toISOString().split('T')[0];
                    a.download = `respaldo_pedidos_srsrapinto_${dateStr}.json`;
                    document.body.appendChild(a);
                    a.click();
                    
                    // Limpieza levemente retardada para asegurar descarga
                    setTimeout(() => {
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                    }, 100);
                }

                // 3. Eliminar todos los pedidos de la colección 'pedidos' por lotes (batches de 500)
                if (totalPedidos > 0) {
                    const chunks = [];
                    let currentBatch = db.batch();
                    let opCount = 0;

                    snapshot.forEach(doc => {
                        currentBatch.delete(doc.ref);
                        opCount++;
                        if (opCount === 500) {
                            chunks.push(currentBatch);
                            currentBatch = db.batch();
                            opCount = 0;
                        }
                    });

                    if (opCount > 0) {
                        chunks.push(currentBatch);
                    }

                    // Ejecutar todos los lotes secuencialmente
                    for (const batch of chunks) {
                        await batch.commit();
                    }
                }

                // 4. Reiniciar el contador de turnos a 1 manteniendo el estado activo/inactivo actual
                const turnoDoc = await db.collection('config').doc('turno').get();
                let wasActive = false;
                if (turnoDoc.exists) {
                    wasActive = !!turnoDoc.data().activo;
                }

                await db.collection('config').doc('turno').set({
                    activo: wasActive,
                    siguiente_numero: 1,
                    actualizadoPor: localStorage.getItem('srsrapinto_cedula') || 'admin',
                    fecha: new Date().toISOString()
                });

                // 5. Limpieza visual instantánea y recarga de estadísticas
                cachedOrders = [];
                this.loadAnalytics();

                alert(`🎉 ¡Corte de base de datos exitoso!\n\nSe procesaron ${totalPedidos} pedidos anteriores.\nSe descargó tu archivo de respaldo y la base de datos de ventas quedó vacía.\nEl contador de turnos se reinició a la #1.`);
                this.closeMaintenanceModal();

            } catch (error) {
                console.error("Error ejecutando el corte de base de datos:", error);
                alert("Ocurrió un error al realizar el corte de datos. Por favor revisa la consola para más detalles.");
            } finally {
                btnExecute.disabled = false;
                btnExecute.innerHTML = '<i class="fas fa-trash-alt"></i> Ejecutar Corte & Respaldo';
            }
        }
    };


    // ========================================
    // MÓDULO: Gestión de Usuarios (CRUD)
    // ========================================
    const userModal = document.getElementById('user-modal');
    const userList = document.getElementById('users-list');
    let userMaskState = {};

    window.UsersManager = {
        init() {
            db.collection("empleados").onSnapshot((snapshot) => {
                const employees = [];
                snapshot.forEach(doc => {
                    employees.push({ id: doc.id, ...doc.data() });
                });
                
                employees.sort((a, b) => {
                    const roleCompare = a.rol.localeCompare(b.rol);
                    if (roleCompare !== 0) return roleCompare;
                    return a.cedula.localeCompare(b.cedula);
                });

                this.renderUsers(employees);
            }, (error) => {
                console.error("Error escuchando empleados:", error);
                userList.innerHTML = `<tr><td colspan="4" style="color:red; text-align:center;">Error al cargar colaboradores.</td></tr>`;
            });
        },

        renderUsers(users) {
            if (users.length === 0) {
                userList.innerHTML = `<tr><td colspan="4" style="text-align: center; padding: 20px;">No hay colaboradores creados.</td></tr>`;
                return;
            }

            userList.innerHTML = users.map(user => {
                const isMasked = userMaskState[user.id] !== false;
                const passwordDisplay = isMasked ? '••••' : user.password;
                const eyeIcon = isMasked ? 'fa-eye' : 'fa-eye-slash';

                return `
                    <tr>
                        <td><strong>${user.cedula}</strong></td>
                        <td><span class="user-badge badge-${user.rol}">${user.rol}</span></td>
                        <td>
                            <div class="password-container">
                                <span class="password-masked">${passwordDisplay}</span>
                                <button class="password-toggle" onclick="UsersManager.togglePasswordMask('${user.id}')" title="Mostrar/Ocultar">
                                    <i class="fas ${eyeIcon}"></i>
                                </button>
                            </div>
                        </td>
                        <td>
                            <div style="display: flex; gap: 15px;">
                                <button class="btn-edit" onclick="UsersManager.openEditModal('${user.id}', '${user.cedula}', '${user.rol}', '${user.password}')" title="Editar datos">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn-delete" onclick="UsersManager.deleteUser('${user.id}', '${user.cedula}')" title="Eliminar colaborador">
                                    <i class="fas fa-trash-alt"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');
        },

        togglePasswordMask(userId) {
            userMaskState[userId] = !userMaskState[userId];
            this.init();
        },

        openAddModal() {
            document.getElementById('user-modal-title').innerText = "Agregar Colaborador";
            document.getElementById('user-edit-id').value = "";
            document.getElementById('user-username').value = "";
            document.getElementById('user-username').disabled = false;
            document.getElementById('user-password').value = "";
            document.getElementById('user-role').value = "ventas";
            userModal.classList.add('active');
        },

        openEditModal(id, cedula, rol, password) {
            document.getElementById('user-modal-title').innerText = "Editar Colaborador";
            document.getElementById('user-edit-id').value = id;
            document.getElementById('user-username').value = cedula;
            document.getElementById('user-username').disabled = true;
            document.getElementById('user-password').value = password;
            document.getElementById('user-role').value = rol;
            userModal.classList.add('active');
        },

        closeModal() {
            userModal.classList.remove('active');
        },

        async saveUser() {
            const editId = document.getElementById('user-edit-id').value;
            const username = document.getElementById('user-username').value.trim();
            const role = document.getElementById('user-role').value;
            const password = document.getElementById('user-password').value.trim();

            if (!username || !password) {
                alert("Por favor completa todos los campos del formulario.");
                return;
            }

            if (password.length < 4) {
                alert("La contraseña debe tener un PIN o clave de al menos 4 caracteres.");
                return;
            }

            const submitBtn = document.getElementById('btn-user-submit');
            submitBtn.disabled = true;
            submitBtn.innerText = "Guardando...";

            try {
                if (editId) {
                    await db.collection('empleados').doc(editId).update({
                        rol: role,
                        password: password
                    });
                } else {
                    const newDocId = username.toLowerCase().replace(/[^a-z0-9]/g, '_');
                    
                    const existingDoc = await db.collection('empleados').doc(newDocId).get();
                    if (existingDoc.exists) {
                        alert("Ya existe un colaborador con este nombre o identificación.");
                        submitBtn.disabled = false;
                        submitBtn.innerText = "Guardar Colaborador";
                        return;
                    }

                    await db.collection('empleados').doc(newDocId).set({
                        cedula: username,
                        rol: role,
                        password: password
                    });
                }
                
                this.closeModal();
            } catch (error) {
                console.error("Error al guardar colaborador:", error);
                alert("Ocurrió un error al guardar los cambios.");
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerText = "Guardar Colaborador";
            }
        },

        async deleteUser(id, name) {
            const currentSessionUser = localStorage.getItem('srsrapinto_cedula');
            if (name === currentSessionUser || id === 'admin') {
                alert("Acción denegada: No puedes eliminar tu propia cuenta de administrador.");
                return;
            }

            const confirmDel = confirm(`¿Estás seguro de que deseas eliminar al colaborador "${name}"?\nEsta acción no se puede deshacer.`);
            if (!confirmDel) return;

            try {
                await db.collection('empleados').doc(id).delete();
            } catch (error) {
                console.error("Error al eliminar colaborador:", error);
                alert("No se pudo eliminar al colaborador. Intenta de nuevo.");
            }
        }
    };

    // ========================================
    // FERIA MANAGER
    // ========================================
    window.FeriaManager = {
        feriaActive: false,
        combosActive: false,

        init() {
            if (!window.FirebaseDB) return;
            const db = window.FirebaseDB;

            // Escuchar cambios en config/feria
            db.collection('config').doc('feria').onSnapshot((doc) => {
                if (doc.exists) {
                    const data = doc.data();
                    this.feriaActive = !!data.active;
                    this.combosActive = !!data.combos_active;
                } else {
                    this.feriaActive = false;
                    this.combosActive = false;
                    // Create default if not exists
                    db.collection('config').doc('feria').set({ active: false, combos_active: false });
                }
                this.updateUI();
            });
        },

        updateUI() {
            const feriaBtn = document.getElementById('btn-feria-toggle');
            const combosBtn = document.getElementById('btn-combos-toggle');
            const feriaCard = document.getElementById('feria-toggle-card');
            const combosCard = document.getElementById('combos-toggle-card');
            const combosSubtitle = document.getElementById('combos-toggle-subtitle');

            if (feriaBtn) {
                if (this.feriaActive) {
                    feriaBtn.classList.add('active');
                    feriaBtn.classList.remove('disabled');
                    feriaCard.classList.add('active-mode');
                } else {
                    feriaBtn.classList.remove('active');
                    feriaBtn.classList.remove('disabled');
                    feriaCard.classList.remove('active-mode');
                }
            }

            if (combosBtn) {
                if (this.feriaActive) {
                    combosBtn.disabled = false;
                    combosBtn.classList.remove('disabled');
                    if (this.combosActive) {
                        combosBtn.classList.add('active');
                        combosCard.classList.add('active-mode');
                    } else {
                        combosBtn.classList.remove('active');
                        combosCard.classList.remove('active-mode');
                    }
                    if(combosSubtitle) combosSubtitle.style.opacity = '1';
                } else {
                    combosBtn.disabled = true;
                    combosBtn.classList.remove('active');
                    combosBtn.classList.add('disabled');
                    combosCard.classList.remove('active-mode');
                    if(combosSubtitle) combosSubtitle.style.opacity = '0.5';
                }
            }
        },

        async toggleFeriaMode() {
            const newState = !this.feriaActive;
            try {
                // If disabling Feria Mode, also disable Combos Estudiantiles automatically
                const updateData = { active: newState };
                if (!newState) {
                    updateData.combos_active = false;
                }
                await window.FirebaseDB.collection('config').doc('feria').update(updateData);
            } catch (e) {
                console.error("Error updating feria mode:", e);
                alert("Hubo un error al actualizar el Modo Feria.");
            }
        },

        async toggleCombosMode() {
            if (!this.feriaActive) {
                alert("Debes activar el Modo Feria primero para poder activar los Combos Estudiantiles.");
                return;
            }
            const newState = !this.combosActive;
            try {
                await window.FirebaseDB.collection('config').doc('feria').update({ combos_active: newState });
            } catch (e) {
                console.error("Error updating combos mode:", e);
                alert("Hubo un error al actualizar los Combos Estudiantiles.");
            }
        },

        // --- NEW EDIT PRICES LOGIC ---
        feriaPricesData: {},
        feriaProductsList: [
            { id: 'p-senor-pinto', nombre: 'Señor Pinto' },
            { id: 'c-senor-pinto-cafe', nombre: 'Combo: Señor Pinto + Café' },
            { id: 'c-burrote-cafe', nombre: 'Combo: Burrote + Café' },
            { id: 'p-sr-patacon', nombre: 'Sr. Patacón' },
            { id: 'p-sra-quesadilla', nombre: 'Sra. Quesadilla' },
            { id: 'p-empanada-carne', nombre: 'Empanada Carne' },
            { id: 'p-empanada-queso', nombre: 'Empanada Queso' },
            { id: 'p-empanada-carne-queso', nombre: 'Empanada Carne/Queso' },
            { id: 'p-sra-empanada-m1', nombre: 'Sra. Empanada Arreglada' },
            { id: 'p-sra-empanada-m2', nombre: 'Sra. Empanada Arreglada (Opciones)' },
            { id: 'p-sra-hamburguesa', nombre: 'Hamburguesa Premium' },
            { id: 'p-cono-salchipapa', nombre: 'Cono Salchipapa' },
            { id: 'p-sr-papi-carne', nombre: 'Sr. Papi Carne' },
            { id: 'b-cafe-premium', nombre: 'Café Premium Grande' },
            { id: 'p-patacon-caribeno', nombre: 'Patacón Caribeño (Nuevo)' },
            { id: 'c-queso-pinto-cafe', nombre: 'Combo: Queso Pinto + Café' },
            { id: 'b-cafe-8oz', nombre: 'Café (8 onzas)' },
            { id: 'ce-empanada-fresco', nombre: 'Estudiantil: Empanada + Té Frío' },
            { id: 'ce-salchipapa-fresco', nombre: 'Estudiantil: Salchipapa + Té Frío' },
            { id: 'ce-hamburguesa-jr-fresco', nombre: 'Estudiantil: Burguer Jr + Té Frío' },
            { id: 'ce-hotdog-fresco', nombre: 'Estudiantil: Hot Dog + Té Frío' }
        ],

        openPricesModal() {
            document.getElementById('feria-prices-modal').classList.add('active');
            this.loadPricesEditor();
        },

        closePricesModal() {
            document.getElementById('feria-prices-modal').classList.remove('active');
        },

        async loadPricesEditor() {
            const container = document.getElementById('feria-prices-container');
            container.innerHTML = '<p style="text-align: center; padding: 20px;">Cargando productos...</p>';
            try {
                const doc = await window.FirebaseDB.collection('config').doc('feria_precios').get();
                const defaultFeriaPrices = {
                    'p-senor-pinto': 4000, 'c-senor-pinto-cafe': 4000, 'c-burrote-cafe': 3000,
                    'p-sr-patacon': 4000, 'p-sra-quesadilla': 4000, 'p-empanada-carne': 2000,
                    'p-empanada-queso': 2000, 'p-empanada-carne-queso': 2000, 'p-sra-empanada-m1': 3500,
                    'p-sra-empanada-m2': 3500, 'p-sra-hamburguesa': 5000, 'p-cono-salchipapa': 3000,
                    'p-sr-papi-carne': 3500, 'b-cafe-premium': 1300, 'p-patacon-caribeno': 4000,
                    'c-queso-pinto-cafe': 4000, 'b-cafe-8oz': 1000, 'ce-empanada-fresco': 2000,
                    'ce-salchipapa-fresco': 2500, 'ce-hamburguesa-jr-fresco': 2500, 'ce-hotdog-fresco': 2000
                };

                if (doc.exists) {
                    this.feriaPricesData = { ...defaultFeriaPrices, ...doc.data() };
                } else {
                    this.feriaPricesData = defaultFeriaPrices;
                }

                let html = '';
                this.feriaProductsList.forEach(p => {
                    const currentPrice = this.feriaPricesData[p.id] || '';
                    html += `
                        <div class="form-group" style="margin-bottom: 15px; background: rgba(0,0,0,0.2); padding: 10px; border-radius: 8px;">
                            <label style="display:flex; justify-content:space-between;">
                                <span>${p.nombre}</span>
                            </label>
                            <div style="display:flex; align-items:center; gap:10px; margin-top:5px;">
                                <span style="color:var(--rojo); font-weight:bold;">₡</span>
                                <input type="number" class="feria-price-input" data-id="${p.id}" value="${currentPrice}" placeholder="Precio" style="flex:1;">
                            </div>
                        </div>
                    `;
                });
                container.innerHTML = html;
            } catch (e) {
                console.error("Error loading feria prices:", e);
                container.innerHTML = '<p style="text-align: center; color: var(--alerta);">Error al cargar precios.</p>';
            }
        },

        async savePrices() {
            const btn = document.getElementById('btn-save-feria-prices');
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
            btn.disabled = true;

            const inputs = document.querySelectorAll('.feria-price-input');
            const newPrices = {};
            inputs.forEach(input => {
                const val = parseInt(input.value);
                if (!isNaN(val) && val > 0) {
                    newPrices[input.dataset.id] = val;
                }
            });

            try {
                await window.FirebaseDB.collection('config').doc('feria_precios').set(newPrices);
                this.closePricesModal();
            } catch (e) {
                console.error("Error saving feria prices:", e);
                alert("Ocurrió un error al guardar los precios.");
            } finally {
                btn.innerHTML = 'Guardar Precios';
                btn.disabled = false;
            }
        }
    };

    // Initialize Feria Manager
    FeriaManager.init();

});
