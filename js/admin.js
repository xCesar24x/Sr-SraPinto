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
    'p-sra-empanada-m2': 1050,
    'c-empanada-cafe': 1100,
    'p-cono-salchipapa': 950,
    'p-sr-papi-carne': 1200,

    // BEBIDAS
    'b-cafe-premium': 300,
    'b-agua': 200,
    'b-gaseosas': 450,
    'b-hidratante': 500,

    // ADICIONALES MODO FERIA
    'p-patacon-caribeno': 1400,
    'c-queso-pinto-cafe': 1300,
    'b-cafe-8oz': 250,

    // COMBOS ESTUDIANTILES
    'ce-empanada-fresco': 750,
    'ce-salchipapa-fresco': 1000,
    'ce-hamburguesa-jr-fresco': 1200,
    'ce-hotdog-fresco': 900
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

                if (!newActiveState) {
                    // Generar PDF y abrir mailto al cerrar el turno
                    await ReportsManager.exportPDFReport(true);
                }
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

        selectedProductFilter: null,

        setProductFilter(productName) {
            this.selectedProductFilter = productName;
            
            const banner = document.getElementById('product-filter-banner');
            const label = document.getElementById('filtered-product-name');
            if (banner && label) {
                label.innerText = productName;
                banner.style.display = 'flex';
            }
            
            this.loadAnalytics();
        },

        clearProductFilter() {
            this.selectedProductFilter = null;
            
            const banner = document.getElementById('product-filter-banner');
            if (banner) {
                banner.style.display = 'none';
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
            let cashOrdersCount = 0;
            let dietaBryanTotal = 0;
            let dietaMaicTotal = 0;
            let regaliaTotal = 0;
            
            const selectedProduct = this.selectedProductFilter;

            filteredOrders.forEach(order => {
                const method = order.metodoPago || 'Efectivo';
                const isSpecial = (method === 'Dieta Bryan' || method === 'Dieta Maic' || method === 'Regalía');
                
                let orderHasProduct = false;
                let productRevenue = 0;
                let productCogs = 0;
                
                if (order.items) {
                    order.items.forEach(item => {
                        const cleanId = item.id.split('-')[0];
                        const costPerUnit = COSTOS_PRODUCTOS[cleanId] || COSTOS_PRODUCTOS[item.id] || (item.precio * 0.4);
                        const qty = item.cantidad || 0;
                        const cogsVal = costPerUnit * qty;
                        
                        if (selectedProduct) {
                            if (item.nombre === selectedProduct) {
                                orderHasProduct = true;
                                productRevenue += (item.precio * qty);
                                productCogs += cogsVal;
                            }
                        } else {
                            totalCogs += cogsVal;
                        }
                    });
                }
                
                if (selectedProduct) {
                    if (orderHasProduct) {
                        if (!isSpecial) {
                            totalRevenue += productRevenue;
                            cashOrdersCount += 1;
                        } else {
                            if (method === 'Dieta Bryan') dietaBryanTotal += productRevenue;
                            else if (method === 'Dieta Maic') dietaMaicTotal += productRevenue;
                            else if (method === 'Regalía') regaliaTotal += productRevenue;
                        }
                        totalCogs += productCogs;
                    }
                } else {
                    if (!isSpecial) {
                        totalRevenue += (order.total || 0);
                        cashOrdersCount += 1;
                    } else {
                        if (method === 'Dieta Bryan') dietaBryanTotal += (order.total || 0);
                        else if (method === 'Dieta Maic') dietaMaicTotal += (order.total || 0);
                        else if (method === 'Regalía') regaliaTotal += (order.total || 0);
                    }
                }
            });

            // Redondear para evitar decimales molestos
            totalCogs = Math.round(totalCogs);
            const totalProfit = Math.max(0, totalRevenue - totalCogs);
            const profitMargin = totalRevenue > 0 ? Math.round((totalProfit / totalRevenue) * 100) : 0;
            const avgTicket = cashOrdersCount > 0 ? Math.round(totalRevenue / cashOrdersCount) : 0;

            // Renderizar métricas en pantalla
            document.getElementById('stat-revenue').innerText = `₡${totalRevenue.toLocaleString()}`;
            document.getElementById('stat-cogs').innerText = `₡${totalCogs.toLocaleString()}`;
            document.getElementById('stat-profit').innerText = `₡${totalProfit.toLocaleString()}`;
            document.getElementById('stat-margin').innerText = `${profitMargin}%`;
            document.getElementById('stat-orders-count').innerText = cashOrdersCount;
            document.getElementById('stat-avg-ticket').innerText = `₡${avgTicket.toLocaleString()}`;
            
            document.getElementById('stat-dieta-bryan').innerText = `₡${dietaBryanTotal.toLocaleString()}`;
            document.getElementById('stat-dieta-maic').innerText = `₡${dietaMaicTotal.toLocaleString()}`;
            document.getElementById('stat-regalias').innerText = `₡${regaliaTotal.toLocaleString()}`;

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

            const selectedProduct = this.selectedProductFilter;
            // Colores dinámicos para resaltar la barra seleccionada
            const backgroundColors = labels.map(label => {
                if (selectedProduct) {
                    return label === selectedProduct ? 'rgba(233, 19, 80, 0.9)' : 'rgba(233, 19, 80, 0.2)';
                }
                return 'rgba(233, 19, 80, 0.7)';
            });
            const borderColors = labels.map(label => {
                if (selectedProduct) {
                    return label === selectedProduct ? '#E91350' : 'rgba(233, 19, 80, 0.3)';
                }
                return '#E91350';
            });

            window.bestsellersChartInstance = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Unidades Vendidas',
                        data: data,
                        backgroundColor: backgroundColors,
                        borderColor: borderColors,
                        borderWidth: 1,
                        borderRadius: 5
                    }]
                },
                options: {
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                    onClick: (event, elements) => {
                        if (elements && elements.length > 0) {
                            const index = elements[0].index;
                            const label = window.bestsellersChartInstance.data.labels[index];
                            window.ReportsManager.setProductFilter(label);
                        } else {
                            window.ReportsManager.clearProductFilter();
                        }
                    },
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
            const selectedProduct = this.selectedProductFilter;
            const paymentTotals = { 
                'Efectivo': 0, 
                'SINPE Móvil': 0, 
                'Tarjeta': 0,
                'Dieta Bryan': 0,
                'Dieta Maic': 0,
                'Regalía': 0
            };

            orders.forEach(order => {
                const method = order.metodoPago || 'Efectivo';
                if (paymentTotals[method] === undefined) {
                    paymentTotals[method] = 0;
                }
                
                if (selectedProduct) {
                    if (order.items) {
                        order.items.forEach(item => {
                            if (item.nombre === selectedProduct) {
                                paymentTotals[method] += (item.precio * (item.cantidad || 0));
                            }
                        });
                    }
                } else {
                    paymentTotals[method] += (order.total || 0);
                }
            });

            // Solo mostrar métodos de pago que tengan montos > 0
            const activePayments = Object.entries(paymentTotals).filter(([_, val]) => val > 0);
            
            const labels = activePayments.map(([label, _]) => label);
            const data = activePayments.map(([_, val]) => val);

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

            // Definir colores fijos según método
            const colorMap = {
                'Efectivo': { bg: 'rgba(46, 204, 113, 0.7)', border: '#2ecc71' },
                'SINPE Móvil': { bg: 'rgba(241, 196, 15, 0.7)', border: '#f1c40f' },
                'Tarjeta': { bg: 'rgba(52, 152, 219, 0.7)', border: '#3498db' },
                'Dieta Bryan': { bg: 'rgba(155, 89, 182, 0.7)', border: '#9b59b6' },
                'Dieta Maic': { bg: 'rgba(155, 89, 182, 0.7)', border: '#9b59b6' },
                'Regalía': { bg: 'rgba(230, 126, 34, 0.7)', border: '#e67e22' }
            };

            const bgColors = labels.map(lbl => colorMap[lbl]?.bg || 'rgba(150, 150, 150, 0.7)');
            const borderColors = labels.map(lbl => colorMap[lbl]?.border || '#999');

            window.paymentsChartInstance = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: labels,
                    datasets: [{
                        data: data,
                        backgroundColor: bgColors,
                        borderColor: borderColors,
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
            const selectedProduct = this.selectedProductFilter;
            const ingredientConsumption = {};

            orders.forEach(order => {
                if (order.estado !== 'listo' && order.estado !== 'retirado') return;

                if (order.items) {
                    order.items.forEach(item => {
                        if (selectedProduct && item.nombre !== selectedProduct) return;
                        
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
            const selectedProduct = this.selectedProductFilter;
            const container = document.getElementById('audit-orders-list');
            
            const ordersToShow = selectedProduct
                ? orders.filter(order => order.items && order.items.some(item => item.nombre === selectedProduct))
                : orders;

            if (ordersToShow.length === 0) {
                container.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 20px; opacity: 0.5;">No hay pedidos registrados en este período.</td></tr>`;
                return;
            }

            container.innerHTML = ordersToShow.map(order => {
                const dateObj = new Date(order.fecha);
                const dateStr = dateObj.toLocaleDateString('es-CR', { day: '2-digit', month: '2-digit' }) + ' ' + 
                                dateObj.toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' });
                
                let detailsText = order.items.map(i => `${i.cantidad}x ${i.nombre.split(' (')[0]}`).join(', ');
                if (detailsText.length > 30) detailsText = detailsText.substring(0, 27) + '...';

                let statusBadge = '';
                if (order.estado === 'pendiente') statusBadge = '<span style="color:#f1c40f; margin-left:5px;"><i class="fas fa-fire"></i></span>';
                else if (order.estado === 'listo' || order.estado === 'retirado') statusBadge = '<span style="color:#2ecc71; margin-left:5px;"><i class="fas fa-check-double"></i></span>';

                const payMethod = order.metodoPago || 'Efectivo';
                let methodClass = payMethod.toLowerCase().replace(/\s/g, '');

                return `
                    <tr>
                        <td style="font-size: 0.8rem;">${dateStr}</td>
                        <td style="font-weight:700;">[#${order.num_pedido || order.id.slice(-5).toUpperCase()}] ${order.cliente} ${statusBadge}</td>
                        <td style="font-weight:900;">₡${(order.total || 0).toLocaleString()}</td>
                        <td><span class="user-badge badge-${methodClass}">${payMethod}</span></td>
                        <td style="font-size: 0.8rem; opacity: 0.8;" title="${order.items.map(i => `${i.cantidad}x ${i.nombre}`).join('\n')}">${detailsText}</td>
                    </tr>
                `;
            }).join('');
        },

        async exportPDFReport(autoSendEmail = true) {
            const revenue = document.getElementById('stat-revenue')?.innerText || '₡0';
            const cogs = document.getElementById('stat-cogs')?.innerText || '₡0';
            const profit = document.getElementById('stat-profit')?.innerText || '₡0';
            const margin = document.getElementById('stat-margin')?.innerText || '0%';
            const orders = document.getElementById('stat-orders-count')?.innerText || '0';
            const avgTicket = document.getElementById('stat-avg-ticket')?.innerText || '₡0';
            
            const dietaBryan = document.getElementById('stat-dieta-bryan')?.innerText || '₡0';
            const dietaMaic = document.getElementById('stat-dieta-maic')?.innerText || '₡0';
            const regalias = document.getElementById('stat-regalias')?.innerText || '₡0';

            const periodSelect = document.getElementById('report-period-select');
            const periodText = periodSelect ? periodSelect.options[periodSelect.selectedIndex]?.text : 'Hoy';
            
            let shiftText = 'Todo el Día';
            if (this.currentShift === 'morning') shiftText = 'Mañana (Corte 12pm)';
            else if (this.currentShift === 'afternoon') shiftText = 'Tarde (Corte 6pm)';
            else if (this.currentShift === 'night') shiftText = 'Noche (Cierre)';

            const filterText = this.selectedProductFilter ? `Filtrado por: ${this.selectedProductFilter}` : 'Sin filtro de producto';
            
            const now = new Date();
            const dateStr = now.toLocaleDateString('es-CR') + ' ' + now.toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' });

            // Obtener el top de productos más vendidos del gráfico actual
            let bestsellersHTML = '';
            if (window.bestsellersChartInstance && window.bestsellersChartInstance.data) {
                const labels = window.bestsellersChartInstance.data.labels || [];
                const data = window.bestsellersChartInstance.data.datasets[0].data || [];
                bestsellersHTML = labels.map((label, idx) => {
                    return `<tr><td style="padding: 6px; border-bottom: 1px solid #eee;">${label}</td><td style="padding: 6px; border-bottom: 1px solid #eee; text-align: right; font-weight: bold;">${data[idx]} uds</td></tr>`;
                }).join('');
            } else {
                bestsellersHTML = `<tr><td colspan="2" style="padding: 10px; text-align: center; opacity: 0.5;">No hay datos en este período.</td></tr>`;
            }

            // Obtener consumo de ingredientes
            const consumptionList = document.getElementById('consumption-list');
            let ingredientsHTML = '';
            if (consumptionList && consumptionList.children.length > 0 && !consumptionList.innerHTML.includes('No hay')) {
                const items = Array.from(consumptionList.querySelectorAll('.consumption-item'));
                ingredientsHTML = items.map(item => {
                    const name = item.querySelector('.consumption-info span:first-child')?.innerText || '';
                    const val = item.querySelector('.consumption-info span:last-child')?.innerText || '';
                    return `<tr><td style="text-transform: capitalize; padding: 6px; border-bottom: 1px solid #eee;">${name}</td><td style="padding: 6px; border-bottom: 1px solid #eee; text-align: right; font-weight: bold;">${val}</td></tr>`;
                }).join('');
            } else {
                ingredientsHTML = `<tr><td colspan="2" style="padding: 10px; text-align: center; opacity: 0.5;">No hay consumo estimado.</td></tr>`;
            }

            // Crear el elemento temporal
            const element = document.createElement('div');
            element.style.padding = '30px';
            element.style.background = '#ffffff';
            element.style.color = '#333333';
            element.style.fontFamily = "'Helvetica Neue', Helvetica, Arial, sans-serif";
            element.style.fontSize = '12px';
            element.style.lineHeight = '1.5';
            
            element.innerHTML = `
                <div style="border-bottom: 2px solid #E91350; padding-bottom: 15px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <h1 style="color: #E91350; margin: 0 0 5px 0; font-size: 24px; font-weight: bold; text-transform: uppercase;">Sr. & Sra. Pinto</h1>
                        <h2 style="margin: 0; font-size: 14px; color: #666; font-weight: normal;">Reporte de Rendimiento y Cierre</h2>
                    </div>
                    <div style="text-align: right; color: #666; font-size: 11px;">
                        <div><strong>Generado:</strong> ${dateStr}</div>
                        <div><strong>Período:</strong> ${periodText}</div>
                        <div><strong>Turno:</strong> ${shiftText}</div>
                        ${this.selectedProductFilter ? `<div style="color: #E91350; font-weight: bold; margin-top: 3px;">${filterText}</div>` : ''}
                    </div>
                </div>

                <div style="margin-bottom: 25px;">
                    <h3 style="background: #fcf1f4; color: #E91350; padding: 6px 10px; margin: 0 0 15px 0; font-size: 13px; border-left: 4px solid #E91350; font-weight: bold;">
                        INDICADORES FINANCIEROS PRINCIPALES
                    </h3>
                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
                        <thead>
                            <tr style="background: #f5f5f5; border-bottom: 1px solid #ddd;">
                                <th style="text-align: left; padding: 8px; font-weight: bold; width: 50%;">Indicador</th>
                                <th style="text-align: right; padding: 8px; font-weight: bold; width: 50%;">Valor</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr style="border-bottom: 1px solid #eee;">
                                <td style="padding: 8px;"><strong>Ventas Totales (Ingreso Neto)</strong></td>
                                <td style="padding: 8px; text-align: right; color: #2ecc71; font-weight: bold; font-size: 14px;">${revenue}</td>
                            </tr>
                            <tr style="border-bottom: 1px solid #eee;">
                                <td style="padding: 8px;">Costo de Ventas (COGS)</td>
                                <td style="padding: 8px; text-align: right; color: #e74c3c; font-weight: bold;">${cogs}</td>
                            </tr>
                            <tr style="border-bottom: 1px solid #eee; background: #fafafa;">
                                <td style="padding: 8px;"><strong>Utilidad Bruta</strong></td>
                                <td style="padding: 8px; text-align: right; color: #2ecc71; font-weight: bold; font-size: 14px;">${profit}</td>
                            </tr>
                            <tr style="border-bottom: 1px solid #eee;">
                                <td style="padding: 8px;">Margen de Utilidad</td>
                                <td style="padding: 8px; text-align: right; font-weight: bold;">${margin}</td>
                            </tr>
                            <tr style="border-bottom: 1px solid #eee;">
                                <td style="padding: 8px;">Pedidos Facturados</td>
                                <td style="padding: 8px; text-align: right;">${orders}</td>
                            </tr>
                            <tr style="border-bottom: 1px solid #eee;">
                                <td style="padding: 8px;">Ticket Promedio</td>
                                <td style="padding: 8px; text-align: right;">${avgTicket}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div style="margin-bottom: 25px;">
                    <h3 style="background: #f3f3f3; color: #333; padding: 6px 10px; margin: 0 0 15px 0; font-size: 13px; border-left: 4px solid #666; font-weight: bold;">
                        CONSUMOS INTERNOS (DIETAS Y REGALÍAS)
                    </h3>
                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
                        <thead>
                            <tr style="background: #f5f5f5; border-bottom: 1px solid #ddd;">
                                <th style="text-align: left; padding: 8px; font-weight: bold; width: 50%;">Categoría</th>
                                <th style="text-align: right; padding: 8px; font-weight: bold; width: 50%;">Valor Consumido</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr style="border-bottom: 1px solid #eee;">
                                <td style="padding: 8px;">Dieta Bryan</td>
                                <td style="padding: 8px; text-align: right; font-weight: bold; color: #9b59b6;">${dietaBryan}</td>
                            </tr>
                            <tr style="border-bottom: 1px solid #eee;">
                                <td style="padding: 8px;">Dieta Maic</td>
                                <td style="padding: 8px; text-align: right; font-weight: bold; color: #9b59b6;">${dietaMaic}</td>
                            </tr>
                            <tr style="border-bottom: 1px solid #eee;">
                                <td style="padding: 8px;">Regalías (Comunidad)</td>
                                <td style="padding: 8px; text-align: right; font-weight: bold; color: #e67e22;">${regalias}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div style="display: flex; gap: 20px; margin-bottom: 25px;">
                    <div style="flex: 1;">
                        <h3 style="background: #fcf1f4; color: #E91350; padding: 6px 10px; margin: 0 0 15px 0; font-size: 13px; border-left: 4px solid #E91350; font-weight: bold;">
                            PRODUCTOS MÁS VENDIDOS
                        </h3>
                        <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
                            <thead>
                                <tr style="background: #f5f5f5; border-bottom: 1px solid #ddd; text-align: left;">
                                    <th style="padding: 6px;">Producto</th>
                                    <th style="padding: 6px; text-align: right;">Cantidad</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${bestsellersHTML}
                            </tbody>
                        </table>
                    </div>
                    
                    <div style="flex: 1;">
                        <h3 style="background: #fcf1f4; color: #E91350; padding: 6px 10px; margin: 0 0 15px 0; font-size: 13px; border-left: 4px solid #E91350; font-weight: bold;">
                            INGREDIENTES ESTIMADOS
                        </h3>
                        <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
                            <thead>
                                <tr style="background: #f5f5f5; border-bottom: 1px solid #ddd; text-align: left;">
                                    <th style="padding: 6px;">Ingrediente</th>
                                    <th style="padding: 6px; text-align: right;">Cantidad</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${ingredientsHTML}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div style="border-top: 1px solid #eee; padding-top: 15px; margin-top: 30px; text-align: center; color: #999; font-size: 10px;">
                    Este reporte fue generado automáticamente por el sistema de administración de Sr. & Sra. Pinto.
                </div>
            `;

            const filename = `cierre_${shiftText.toLowerCase().replace(/[\s()]+/g, '_')}_${now.toISOString().split('T')[0]}.pdf`;
            const opt = {
                margin:       10,
                filename:     filename,
                image:        { type: 'jpeg', quality: 0.98 },
                html2canvas:  { scale: 2 },
                jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };

            try {
                await html2pdf().set(opt).from(element).save();
                console.log("✅ PDF de Cierre descargado.");
            } catch (err) {
                console.error("Error al generar PDF:", err);
            }

            if (autoSendEmail) {
                const mailtoDest = "bryan@srsrapinto.com,maic@srsrapinto.com";
                const subject = `Cierre de Caja - Sr. & Sra. Pinto - ${dateStr}`;
                
                let body = `Hola Bryan y Maic,\n\n`;
                body += `Se ha realizado un cierre de turno en el sistema. A continuación se presentan los resultados correspondientes:\n\n`;
                body += `----------------------------------------\n`;
                body += `RESUMEN DE RENDIMIENTO (${shiftText.toUpperCase()})\n`;
                body += `----------------------------------------\n`;
                body += `Fecha: ${dateStr}\n`;
                body += `Período: ${periodText}\n`;
                if (this.selectedProductFilter) {
                    body += `Filtro de Producto: ${this.selectedProductFilter}\n`;
                }
                body += `\n`;
                body += `💰 Ventas Totales: ${revenue}\n`;
                body += `🏷️ Costo de Ventas (COGS): ${cogs}\n`;
                body += `📈 Utilidad Bruta: ${profit}\n`;
                body += `📊 Margen de Utilidad: ${margin}\n`;
                body += `🧾 Pedidos Facturados: ${orders}\n`;
                body += `💳 Ticket Promedio: ${avgTicket}\n`;
                body += `\n`;
                body += `----------------------------------------\n`;
                body += `CONSUMOS INTERNOS\n`;
                body += `----------------------------------------\n`;
                body += `👤 Dieta Bryan: ${dietaBryan}\n`;
                body += `👤 Dieta Maic: ${dietaMaic}\n`;
                body += `🎁 Regalías: ${regalias}\n\n`;
                body += `El PDF detallado con el consumo de ingredientes y productos más vendidos ha sido descargado automáticamente a su dispositivo.\n\n`;
                body += `Saludos,\n`;
                body += `Sistema POS Sr. & Sra. Pinto\n`;

                const mailtoUrl = `mailto:${encodeURIComponent(mailtoDest)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                window.location.href = mailtoUrl;
            }
        },

        // --- DICCIONARIO DE NOMBRES OFICIALES ---
        NOMBRES_PRODUCTOS: {
            // Pintos
            'p-senor-pinto': 'Señor Pinto',
            'c-senor-pinto-cafe': 'Combo: Señor Pinto + Café',
            'p-burrote': 'Burrote de Pinto',
            'c-burrote-cafe': 'Combo: Burrote de Pinto + Café',
            'p-empanada-pinto': 'Empanada de Pinto',
            'p-sra-empanada-m1': 'Sra. Empanada Arreglada',
            'p-queso-pinto': 'Queso Pinto',
            
            // Snacks
            'p-sr-patacon': 'Sr. Patacón',
            'p-sra-quesadilla': 'Sra. Quesadilla',
            'p-sra-hamburguesa': 'Sra. Hamburguesa con Papas',
            'p-empanada-carne': 'Empanada de Carne',
            'p-empanada-queso': 'Empanada de Queso Mozzarella',
            'p-empanada-carne-queso': 'Empanada de Carne y Queso Mozzarella',
            'p-sra-empanada-m2': 'Sra. Empanada Arreglada (Opciones)',
            'c-empanada-cafe': 'Combo: Empanada + Café',
            'p-cono-salchipapa': 'Sr. Cono de SalchiPapas',
            'p-sr-papi-carne': 'Sr. Papi Carne',

            // Bebidas
            'b-cafe-premium': 'Café Premium Grande (12 onzas)',
            'b-agua': 'Agua',
            'b-gaseosas': 'Gaseosas',
            'b-hidratante': 'Bebidas Hidratantes',

            // Feria
            'p-patacon-caribeno': 'Patacón Caribeño',
            'c-queso-pinto-cafe': 'Combo: Queso Pinto + Café',
            'b-cafe-8oz': 'Café (8 onzas)',

            // Combos Estudiantiles
            'ce-empanada-fresco': 'Estudiantil: Empanada + Té Frío',
            'ce-salchipapa-fresco': 'Estudiantil: Salchipapa + Té Frío',
            'ce-hamburguesa-jr-fresco': 'Estudiantil: Burguer Jr + Té Frío',
            'ce-hotdog-fresco': 'Estudiantil: Hot Dog + Té Frío'
        },

        // --- GESTIÓN DINÁMICA DE COSTOS EN FIRESTORE ---
        openCostsModal() {
            const container = document.getElementById('costs-inputs-container');
            const costsModal = document.getElementById('costs-modal');
            
            // Determinar productos activos según el estado del modo feria y combos estudiantiles
            const feriaActivo = window.FeriaManager ? !!window.FeriaManager.feriaActive : false;
            const combosActivo = window.FeriaManager ? !!window.FeriaManager.combosActive : false;
            
            let activeProductIds = [];
            
            if (feriaActivo) {
                // Productos en Modo Feria
                const baseFeriaIds = [
                    'p-senor-pinto',
                    'c-senor-pinto-cafe',
                    'c-burrote-cafe',
                    'p-sr-patacon',
                    'p-sra-quesadilla',
                    'p-sra-hamburguesa',
                    'p-empanada-carne',
                    'p-empanada-queso',
                    'p-empanada-carne-queso',
                    'p-sra-empanada-m1',
                    'p-sra-empanada-m2',
                    'p-cono-salchipapa',
                    'p-sr-papi-carne',
                    'b-cafe-premium',
                    'b-agua',
                    'b-gaseosas',
                    'b-hidratante',
                    
                    // Adicionales Feria
                    'p-patacon-caribeno',
                    'c-queso-pinto-cafe',
                    'b-cafe-8oz'
                ];
                
                if (combosActivo) {
                    baseFeriaIds.push(
                        'ce-empanada-fresco',
                        'ce-salchipapa-fresco',
                        'ce-hamburguesa-jr-fresco',
                        'ce-hotdog-fresco'
                    );
                }
                activeProductIds = baseFeriaIds;
            } else {
                // Productos en Modo Normal
                activeProductIds = [
                    'p-senor-pinto',
                    'c-senor-pinto-cafe',
                    'p-burrote',
                    'c-burrote-cafe',
                    'p-empanada-pinto',
                    'p-sra-empanada-m1',
                    'p-queso-pinto',
                    'p-sr-patacon',
                    'p-sra-quesadilla',
                    'p-sra-hamburguesa',
                    'p-empanada-carne',
                    'p-empanada-queso',
                    'p-empanada-carne-queso',
                    'p-sra-empanada-m2',
                    'c-empanada-cafe',
                    'p-cono-salchipapa',
                    'p-sr-papi-carne',
                    'b-cafe-premium',
                    'b-agua',
                    'b-gaseosas',
                    'b-hidratante'
                ];
            }

            // Construir array con nombres legibles para ordenar correctamente
            const formattedCosts = Object.entries(COSTOS_PRODUCTOS)
                .filter(([id]) => activeProductIds.includes(id))
                .map(([id, cost]) => {
                    let name = this.NOMBRES_PRODUCTOS[id] || id.replace(/^(p|c|b|ce)-/, '').replace(/_/g, ' ').replace(/-/g, ' ');
                    let prefix = '';
                    if (id.startsWith('p-')) prefix = '🍳 ';
                    else if (id.startsWith('c-')) prefix = '✨ ';
                    else if (id.startsWith('b-')) prefix = '☕ ';
                    else if (id.startsWith('ce-')) prefix = '🎓 ';
                    
                    return { id, cost, name, prefix };
                });

            // Ordenar alfabéticamente de la A a la Z según el nombre legible del producto
            formattedCosts.sort((a, b) => a.name.localeCompare(b.name));

            container.innerHTML = formattedCosts.map(item => `
                <div class="cost-item">
                    <label class="cost-item-label">${item.prefix}${item.name}</label>
                    <div class="cost-item-input-wrapper">
                        <span style="font-size: 0.9rem; opacity: 0.5; color: var(--mostaza);">₡</span>
                        <input type="number" class="cost-item-input" data-id="${item.id}" value="${item.cost}" min="0">
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
                // Mezclar los nuevos costos con los costos existentes de productos ocultos para no perderlos
                const updatedCosts = { ...COSTOS_PRODUCTOS, ...newCosts };

                // Guardar en la base de datos Firestore de forma persistente
                await db.collection('config').doc('costos').set(updatedCosts);
                
                // Actualizar nuestra variable local para el recálculo
                COSTOS_PRODUCTOS = updatedCosts;
                
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
