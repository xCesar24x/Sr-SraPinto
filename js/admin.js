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
    // ========================================
    // MÓDULO: Inventario & Costeo de Insumos / Empaques
    // ========================================
    const BASELINE_INVENTORY = {
        'pinto': { nombre: 'Pinto Tradicional', tipo: 'ingrediente', costoUnitario: 250, unidad: 'porción' },
        'queso_frito': { nombre: 'Queso Frito Turrialba', tipo: 'ingrediente', costoUnitario: 300, unidad: 'porción' },
        'huevos': { nombre: 'Huevos de Granja', tipo: 'ingrediente', costoUnitario: 120, unidad: 'unidad' },
        'maduro': { nombre: 'Plátano Maduro', tipo: 'ingrediente', costoUnitario: 150, unidad: 'porción' },
        'tortilla_harina': { nombre: 'Tortilla de Harina Grande', tipo: 'ingrediente', costoUnitario: 180, unidad: 'unidad' },
        'natilla': { nombre: 'Natilla Casera', tipo: 'ingrediente', costoUnitario: 100, unidad: 'porción' },
        'masa_empanada': { nombre: 'Masa para Empanada', tipo: 'ingrediente', costoUnitario: 150, unidad: 'unidad' },
        'carne_mechada': { nombre: 'Carne Mechada en Salsa', tipo: 'ingrediente', costoUnitario: 450, unidad: 'porción' },
        'ensalada': { nombre: 'Ensalada Fresca Repollo', tipo: 'ingrediente', costoUnitario: 100, unidad: 'porción' },
        'patacones': { nombre: 'Patacones Crujientes', tipo: 'ingrediente', costoUnitario: 300, unidad: 'orden' },
        'frijoles_molidos': { nombre: 'Frijoles Molidos', tipo: 'ingrediente', costoUnitario: 150, unidad: 'porción' },
        'queso_rallado': { nombre: 'Queso Blanco Rallado', tipo: 'ingrediente', costoUnitario: 200, unidad: 'porción' },
        'pan_hamburguesa': { nombre: 'Pan Artesanal Hamburguesa', tipo: 'ingrediente', costoUnitario: 250, unidad: 'unidad' },
        'torta_carne': { nombre: 'Torta de Carne Especial', tipo: 'ingrediente', costoUnitario: 500, unidad: 'unidad' },
        'papas_fritas': { nombre: 'Papas Fritas', tipo: 'ingrediente', costoUnitario: 300, unidad: 'orden' },
        'queso_mozzarella': { nombre: 'Queso Mozzarella', tipo: 'ingrediente', costoUnitario: 250, unidad: 'porción' },
        'salchicha': { nombre: 'Salchicha Especial', tipo: 'ingrediente', costoUnitario: 200, unidad: 'unidad' },
        'porcion_carne': { nombre: 'Porción de Carne Extra', tipo: 'ingrediente', costoUnitario: 500, unidad: 'orden' },
        'cafe': { nombre: 'Café Chorreado Especial', tipo: 'ingrediente', costoUnitario: 150, unidad: 'servicio' },
        'botella_agua': { nombre: 'Botella de Agua Sellada', tipo: 'ingrediente', costoUnitario: 350, unidad: 'botella' },
        'gaseosa': { nombre: 'Refresco / Gaseosa Lata', tipo: 'ingrediente', costoUnitario: 600, unidad: 'lata' },
        'hidratante': { nombre: 'Bebida Hidratante', tipo: 'ingrediente', costoUnitario: 650, unidad: 'botella' },
        // Empaques y Desechables
        'caja_empaque': { nombre: 'Caja / Contenedor Térmico para Comida', tipo: 'empaque', costoUnitario: 120, unidad: 'unidad' },
        'vaso_cafe_tapa': { nombre: 'Vaso Térmico + Tapa de Café', tipo: 'empaque', costoUnitario: 80, unidad: 'unidad' },
        'bolsa_kraft': { nombre: 'Bolsa de Papel Kraft para Llevar', tipo: 'empaque', costoUnitario: 50, unidad: 'unidad' },
        'kit_cubiertos': { nombre: 'Kit Tenedor + Servilleta', tipo: 'empaque', costoUnitario: 40, unidad: 'kit' },
        'vaso_fresco': { nombre: 'Vaso para Refresco + Pajilla', tipo: 'empaque', costoUnitario: 60, unidad: 'unidad' }
    };

    db.collection("inventario").onSnapshot((snapshot) => {
        currentInventory = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            const baseline = BASELINE_INVENTORY[doc.id] || {};
            currentInventory.push({ 
                id: doc.id, 
                nombre: data.nombre || baseline.nombre || doc.id.replace(/_/g, ' '),
                tipo: data.tipo || baseline.tipo || 'ingrediente',
                costoUnitario: typeof data.costoUnitario === 'number' ? data.costoUnitario : (baseline.costoUnitario || 0),
                ...data 
            });
        });

        // Asegurar que empaques y baseline estén presentes
        Object.keys(BASELINE_INVENTORY).forEach(key => {
            if (!currentInventory.find(i => i.id === key)) {
                currentInventory.push({
                    id: key,
                    ...BASELINE_INVENTORY[key],
                    cantidad: 50
                });
            }
        });

        window.currentInventory = currentInventory;

        // Ordenar alfabéticamente: ingredientes primero, luego empaques
        currentInventory.sort((a, b) => {
            if (a.tipo !== b.tipo) return (a.tipo === 'ingrediente' ? -1 : 1);
            return (a.nombre || a.id).localeCompare(b.nombre || b.id);
        });

        renderTable(currentInventory);
        updateStats(currentInventory);
        updateSelect(currentInventory);

        // Si la sección de Volio está abierta, refrescar la tabla de catálogo para reflejar cambios en tiempo real
        if (window.VolioManager && typeof window.VolioManager.renderDishesTable === 'function') {
            window.VolioManager.renderDishesTable();
        }
    });

    function renderTable(items) {
        if (!inventoryList) return;
        if (items.length === 0) {
            inventoryList.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 20px;">El inventario está vacío.</td></tr>`;
            return;
        }

        inventoryList.innerHTML = items.map(item => {
            const nombreStr = item.nombre || item.id.replace(/_/g, ' ');
            const cant = item.cantidad || 0;
            const tipo = item.tipo === 'empaque' ? 'empaque' : 'ingrediente';
            const costoUnit = item.costoUnitario || 0;
            
            const tipoBadge = tipo === 'empaque'
                ? '<span style="background: rgba(155, 89, 182, 0.2); color: #9b59b6; border: 1px solid rgba(155, 89, 182, 0.4); padding: 3px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 700;"><i class="fas fa-box"></i> Empaque</span>'
                : '<span style="background: rgba(230, 126, 34, 0.2); color: #e67e22; border: 1px solid rgba(230, 126, 34, 0.4); padding: 3px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 700;"><i class="fas fa-carrot"></i> Ingrediente</span>';

            let status = '';
            if (cant <= 0) status = '<span class="status-badge status-low">Agotado</span>';
            else if (cant <= 10) status = '<span class="status-badge status-warn">Bajo</span>';
            else status = '<span class="status-badge status-ok">Normal</span>';

            return `
                <tr>
                    <td style="text-transform: capitalize;">
                        <strong style="color: #fff;">${nombreStr}</strong>
                    </td>
                    <td>${tipoBadge}</td>
                    <td style="font-size: 1.15rem; font-weight: 800; color: var(--mostaza);">${cant}</td>
                    <td style="font-weight: 700; color: #2ecc71; font-size: 1.05rem;">₡${costoUnit.toLocaleString()}</td>
                    <td>${status}</td>
                    <td>
                        <button class="action-btn" onclick="AdminManager.openAddModal('${item.id}')" title="Ajustar Stock y Costo">
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
        if (!selectItem) return;
        selectItem.innerHTML = items.map(item => {
            const nombreStr = item.nombre || item.id.replace(/_/g, ' ');
            const tipoLabel = item.tipo === 'empaque' ? '📦' : '🥩';
            return `<option value="${item.id}">${tipoLabel} ${nombreStr} (Stock: ${item.cantidad || 0} | ₡${(item.costoUnitario || 0).toLocaleString()})</option>`;
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
            } else if (tabId === 'volio') {
                VolioManager.init();
            } else if (tabId === 'finances') {
                FinancesManager.init();
            }
        },

        openAddModal(id = null) {
            modal.classList.add('active');
            const targetId = id || (selectItem ? selectItem.value : null);
            if (targetId && selectItem) {
                selectItem.value = targetId;
                this.onStockItemSelected(targetId);
            }
        },

        onStockItemSelected(id) {
            const item = (window.currentInventory || []).find(i => i.id === id);
            if (item) {
                const costInput = document.getElementById('stock-item-cost');
                const tipoSelect = document.getElementById('stock-item-tipo');
                if (costInput) costInput.value = item.costoUnitario || 0;
                if (tipoSelect) tipoSelect.value = item.tipo || 'ingrediente';
            }
        },

        closeAddModal() {
            modal.classList.remove('active');
            const qtyInput = document.getElementById('stock-qty');
            if (qtyInput) qtyInput.value = '';
        },

        async saveStock() {
            const id = selectItem.value;
            const op = document.querySelector('input[name="stock-op"]:checked')?.value || 'add';
            const qtyStr = document.getElementById('stock-qty')?.value;
            const qty = parseFloat(qtyStr);
            const costoUnit = parseFloat(document.getElementById('stock-item-cost')?.value) || 0;
            const tipo = document.getElementById('stock-item-tipo')?.value || 'ingrediente';

            if (!id) {
                alert("Por favor selecciona un insumo o empaque.");
                return;
            }

            try {
                const docRef = db.collection('inventario').doc(id);
                const updateData = {
                    costoUnitario: costoUnit,
                    tipo: tipo
                };
                
                // Si especificó cantidad de stock
                if (!isNaN(qty) && qty > 0) {
                    if (op === 'add') {
                        updateData.cantidad = firebase.firestore.FieldValue.increment(qty);
                    } else {
                        updateData.cantidad = qty;
                    }
                }
                
                await docRef.set(updateData, { merge: true });
                
                // Actualizar en el array local inmediatamente
                const existing = (window.currentInventory || []).find(i => i.id === id);
                if (existing) {
                    existing.costoUnitario = costoUnit;
                    existing.tipo = tipo;
                    if (!isNaN(qty) && qty > 0) {
                        if (op === 'add') existing.cantidad = (existing.cantidad || 0) + qty;
                        else existing.cantidad = qty;
                    }
                }

                // Si VolioManager está activo, refrescar catálogo
                if (window.VolioManager && typeof window.VolioManager.renderDishesTable === 'function') {
                    window.VolioManager.renderDishesTable();
                }
                
                this.closeAddModal();
            } catch (error) {
                console.error("Error al actualizar inventario:", error);
                alert("Hubo un error al guardar.");
            }
        },

        // Modal Nuevo Insumo o Empaque
        openNewItemModal() {
            document.getElementById('new-item-name').value = '';
            document.getElementById('new-item-cost').value = '';
            document.getElementById('new-item-stock').value = '';
            document.getElementById('new-item-tipo').value = 'ingrediente';
            document.getElementById('new-item-modal').classList.add('active');
        },
        closeNewItemModal() {
            document.getElementById('new-item-modal').classList.remove('active');
        },
        async saveNewItem() {
            const nombre = document.getElementById('new-item-name').value.trim();
            const tipo = document.getElementById('new-item-tipo').value;
            const costo = parseFloat(document.getElementById('new-item-cost').value) || 0;
            const stock = parseFloat(document.getElementById('new-item-stock').value) || 0;

            if (!nombre) {
                alert("Por favor escribe el nombre del insumo o empaque.");
                return;
            }

            const id = 'inv_' + nombre.toLowerCase().replace(/[^a-z0-9]/g, '_');
            try {
                await db.collection('inventario').doc(id).set({
                    nombre,
                    tipo,
                    costoUnitario: costo,
                    cantidad: stock,
                    actualizadoEn: new Date().toISOString()
                }, { merge: true });

                this.closeNewItemModal();
            } catch (err) {
                console.error("Error al crear item de inventario:", err);
                alert("No se pudo crear el item en el inventario.");
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

            // Calcular Métricas Operativas (Comandas, Ticket Promedio, Productos y Categorías)
            let totalRevenue = 0;
            let cashOrdersCount = 0;
            let dietaBryanTotal = 0;
            let regaliaTotal = 0;
            
            const selectedProduct = this.selectedProductFilter;
            const productSales = {};
            const categorySales = {
                'Desayunos': { qty: 0, revenue: 0 },
                'Almuerzos': { qty: 0, revenue: 0 },
                'Snacks': { qty: 0, revenue: 0 },
                'Bebidas': { qty: 0, revenue: 0 }
            };

            filteredOrders.forEach(order => {
                const method = order.metodoPago || 'Efectivo';
                const isSpecial = (method === 'Dieta Bryan' || method === 'Regalía');
                
                let orderHasProduct = false;
                let productRevenue = 0;
                
                if (order.items) {
                    order.items.forEach(item => {
                        const qty = item.cantidad || 0;
                        const subtotal = (item.precio || 0) * qty;
                        
                        // Contabilizar productos vendidos
                        productSales[item.nombre] = (productSales[item.nombre] || 0) + qty;

                        // Clasificar por categoría
                        const nameLower = (item.nombre || '').toLowerCase();
                        const idLower = (item.id || '').toLowerCase();
                        if (nameLower.includes('pinto') || nameLower.includes('burrote') || nameLower.includes('desayuno') || idLower.startsWith('p-senor') || idLower.startsWith('p-burrote') || idLower.startsWith('p-queso-pinto')) {
                            categorySales['Desayunos'].qty += qty;
                            categorySales['Desayunos'].revenue += subtotal;
                        } else if (nameLower.includes('casado') || nameLower.includes('almuerzo') || idLower.startsWith('v-casado')) {
                            categorySales['Almuerzos'].qty += qty;
                            categorySales['Almuerzos'].revenue += subtotal;
                        } else if (nameLower.includes('café') || nameLower.includes('fresco') || nameLower.includes('agua') || nameLower.includes('gaseosa') || idLower.startsWith('b-')) {
                            categorySales['Bebidas'].qty += qty;
                            categorySales['Bebidas'].revenue += subtotal;
                        } else {
                            categorySales['Snacks'].qty += qty;
                            categorySales['Snacks'].revenue += subtotal;
                        }

                        if (selectedProduct) {
                            if (item.nombre === selectedProduct) {
                                orderHasProduct = true;
                                productRevenue += subtotal;
                            }
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
                            else if (method === 'Regalía') regaliaTotal += productRevenue;
                        }
                    }
                } else {
                    if (!isSpecial) {
                        totalRevenue += (order.total || 0);
                        cashOrdersCount += 1;
                    } else {
                        if (method === 'Dieta Bryan') dietaBryanTotal += (order.total || 0);
                        else if (method === 'Regalía') regaliaTotal += (order.total || 0);
                    }
                }
            });

            const avgTicket = cashOrdersCount > 0 ? Math.round(totalRevenue / cashOrdersCount) : 0;

            // Renderizar métricas operativas en pantalla
            const elOrdersCount = document.getElementById('stat-orders-count');
            const elAvgTicket = document.getElementById('stat-avg-ticket');
            const elDietaBryan = document.getElementById('stat-dieta-bryan');
            const elRegalias = document.getElementById('stat-regalias');
            const elTopDishName = document.getElementById('stat-top-dish-name');
            const elTopDishQty = document.getElementById('stat-top-dish-qty');
            const elTopCatName = document.getElementById('stat-top-cat-name');
            const elTopCatCount = document.getElementById('stat-top-cat-count');

            if (elOrdersCount) elOrdersCount.innerText = cashOrdersCount;
            if (elAvgTicket) elAvgTicket.innerText = `₡${avgTicket.toLocaleString()}`;
            if (elDietaBryan) elDietaBryan.innerText = `₡${dietaBryanTotal.toLocaleString()}`;
            if (elRegalias) elRegalias.innerText = `₡${regaliaTotal.toLocaleString()}`;

            // Calcular Platillo Estrella
            const sortedProducts = Object.entries(productSales).sort((a, b) => b[1] - a[1]);
            if (elTopDishName && elTopDishQty) {
                if (sortedProducts.length > 0) {
                    elTopDishName.innerText = sortedProducts[0][0];
                    elTopDishName.title = sortedProducts[0][0];
                    elTopDishQty.innerText = `${sortedProducts[0][1]} unidades vendidas`;
                } else {
                    elTopDishName.innerText = '-';
                    elTopDishQty.innerText = '0 unidades';
                }
            }

            // Calcular Categoría Líder
            const sortedCategories = Object.entries(categorySales).sort((a, b) => b[1].revenue - a[1].revenue);
            if (elTopCatName && elTopCatCount) {
                if (sortedCategories.length > 0 && sortedCategories[0][1].revenue > 0) {
                    elTopCatName.innerText = sortedCategories[0][0];
                    elTopCatCount.innerText = `${sortedCategories[0][1].qty} un. (₡${sortedCategories[0][1].revenue.toLocaleString()})`;
                } else {
                    elTopCatName.innerText = '-';
                    elTopCatCount.innerText = '0 comandas';
                }
            }

            // Compatibilidad si existen viejos elementos
            if (document.getElementById('stat-revenue')) document.getElementById('stat-revenue').innerText = `₡${totalRevenue.toLocaleString()}`;

            // Procesar Gráficos e Ingredientes
            this.processBestsellers(filteredOrders);
            this.processCategorySales(categorySales);
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

        processCategorySales(categorySales) {
            const chartCanvas = document.getElementById('category-chart') || document.getElementById('payment-methods-chart');
            if (!chartCanvas) return;

            const labels = [];
            const data = [];
            const bgColors = [];
            const borderColors = [];

            const colorMap = {
                'Desayunos': { bg: 'rgba(241, 196, 15, 0.75)', border: '#f1c40f' },
                'Almuerzos': { bg: 'rgba(46, 204, 113, 0.75)', border: '#2ecc71' },
                'Snacks': { bg: 'rgba(230, 126, 34, 0.75)', border: '#e67e22' },
                'Bebidas': { bg: 'rgba(52, 152, 219, 0.75)', border: '#3498db' }
            };

            Object.entries(categorySales).forEach(([cat, info]) => {
                if (info.revenue > 0 || info.qty > 0) {
                    labels.push(cat);
                    data.push(info.revenue);
                    bgColors.push(colorMap[cat]?.bg || 'rgba(150, 150, 150, 0.7)');
                    borderColors.push(colorMap[cat]?.border || '#888');
                }
            });

            if (window.paymentsChartInstance) {
                window.paymentsChartInstance.destroy();
            }

            const ctx = chartCanvas.getContext('2d');
            const totalSum = data.reduce((a, b) => a + b, 0);

            if (totalSum === 0) {
                ctx.clearRect(0, 0, 400, 280);
                ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
                ctx.font = "14px Gotham";
                ctx.textAlign = "center";
                ctx.fillText("Sin ventas registradas en el período.", 200, 140);
                return;
            }

            window.paymentsChartInstance = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: labels,
                    datasets: [{
                        data: data,
                        backgroundColor: bgColors,
                        borderColor: borderColors,
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: { color: 'rgba(255, 255, 255, 0.85)', font: { size: 12 } }
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
                const mailtoDest = "bryanviquezmurillo@gmail.com";
                const subject = `Cierre de Caja - Sr. & Sra. Pinto - ${dateStr}`;
                
                let body = `Hola Bryan,\n\n`;
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

    // ==========================================================================
    // MÓDULO: VOLIO MANAGER (Ingeniería de Menú & Programación Semanal)
    // ==========================================================================
    window.VolioManager = {
        active: false,
        dishes: [],
        schedule: {
            lunes: [],
            martes: [],
            miercoles: [],
            jueves: [],
            viernes: []
        },
        currentDay: 'lunes',
        initialized: false,

        // Sanitización contra inyecciones XSS
        sanitize(str) {
            if (!str) return '';
            const temp = document.createElement('div');
            temp.textContent = str;
            return temp.innerHTML;
        },

        init() {
            if (this.initialized) return;
            this.initialized = true;
            const db = window.FirebaseDB;
            if (!db) return;

            // 1. Escuchar estado del Modo Volio (On / Off)
            db.collection('config').doc('volio').onSnapshot(doc => {
                if (doc.exists) {
                    const data = doc.data();
                    this.active = !!data.active;
                } else {
                    this.active = false;
                    db.collection('config').doc('volio').set({ active: false });
                }
                this.updateModeUI();
            });

            // 2. Escuchar catálogo de platillos y recetas
            db.collection('volio_platillos').onSnapshot(snapshot => {
                this.dishes = [];
                snapshot.forEach(doc => {
                    this.dishes.push({ id: doc.id, ...doc.data() });
                });

                // Si la colección está vacía por ser la primera vez, sembrar platillos base
                if (this.dishes.length === 0) {
                    this.seedInitialDishes();
                } else {
                    this.dishes.sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
                    this.renderDishesTable();
                    this.renderDaySchedule();
                }
            });

            // 3. Escuchar programación semanal
            db.collection('config_volio').doc('programacion_semanal').onSnapshot(doc => {
                if (doc.exists) {
                    this.schedule = { ...this.schedule, ...doc.data() };
                } else {
                    // Inicializar programación vacía
                    db.collection('config_volio').doc('programacion_semanal').set(this.schedule);
                }
                this.renderDaySchedule();
            });
        },

        async seedInitialDishes() {
            await this.importAllCatalogDishes(false);
        },

        async importAllCatalogDishes(interactive = true) {
            if (interactive && !confirm("¿Deseas importar y sincronizar todos los productos del menú y combos de Modo Feria al Catálogo Maestro?")) return;
            const db = window.FirebaseDB;
            if (!db) return;

            const allProducts = [
                // 🍳 PINTOS & DESAYUNOS
                {
                    id: 'p-senor-pinto',
                    nombre: 'Señor Pinto',
                    categoria: 'desayuno',
                    desc: 'Tradicional gallo pinto con queso frito, huevo frito y maduros.',
                    ingredientes: 'Arroz y frijoles (pinto), queso frito, 1 huevo frito, plátano maduro, natilla casera',
                    precio: 3500,
                    costo: 1100,
                    img: 'images-catalogo/Señor Pinto.jpeg'
                },
                {
                    id: 'c-senor-pinto-cafe',
                    nombre: 'Combo: Señor Pinto + Café',
                    categoria: 'desayuno',
                    desc: 'Señor Pinto tradicional completo con Café Premium Grande (12oz).',
                    ingredientes: 'Pinto, queso frito, huevo frito, plátano maduro + café chorreado 12oz',
                    precio: 4000,
                    costo: 1350,
                    img: 'images-catalogo/señorpintocombo.jpeg'
                },
                {
                    id: 'p-burrote',
                    nombre: 'Burrote de Pinto',
                    categoria: 'desayuno',
                    desc: 'Delicioso gallo pinto con queso, huevo y natilla en tortilla de harina.',
                    ingredientes: 'Tortilla de harina grande, gallo pinto, queso tierno, huevo revuelto, natilla',
                    precio: 3000,
                    costo: 950,
                    img: 'images-catalogo/BurrotedePinto.jpg'
                },
                {
                    id: 'c-burrote-cafe',
                    nombre: 'Combo: Burrote de Pinto + Café',
                    categoria: 'desayuno',
                    desc: 'Burrote de pinto con queso, huevo y natilla + Café Premium Grande.',
                    ingredientes: 'Tortilla de harina, pinto, queso, huevo, natilla + café chorreado 12oz',
                    precio: 3500,
                    costo: 1200,
                    img: 'images-catalogo/BurrotedePintocafe.jpg'
                },
                {
                    id: 'p-queso-pinto',
                    nombre: 'Queso Pinto',
                    categoria: 'desayuno',
                    desc: 'Delicioso gallo pinto con abundante queso tierno y frito.',
                    ingredientes: 'Gallo pinto, doble porción de queso frito y queso tierno artesanal',
                    precio: 3500,
                    costo: 1100,
                    img: 'images-catalogo/Quesopinto.jpeg'
                },
                {
                    id: 'c-queso-pinto-cafe',
                    nombre: 'Combo: Queso Pinto + Café',
                    categoria: 'desayuno',
                    desc: 'Gallo pinto con abundante queso acompañado de Café Premium.',
                    ingredientes: 'Gallo pinto, doble queso frito + café 12oz',
                    precio: 4000,
                    costo: 1350,
                    img: 'images-catalogo/promo_quesopinto.jpg'
                },

                // 🥩 ALMUERZOS
                {
                    id: 'p-sra-empanada-m1',
                    nombre: 'Sra. Empanada Arreglada',
                    categoria: 'almuerzo',
                    desc: 'Empanada de maíz con ensalada fresca de repollo, carne mechada y salsas.',
                    ingredientes: 'Masa de maíz, carne mechada, ensalada fresca de repollo, tomate, salsas caseras',
                    precio: 3500,
                    costo: 1150,
                    img: 'images-catalogo/Sra. Empanada Arreglada .jpeg'
                },
                {
                    id: 'p-sr-patacon',
                    nombre: 'Sr. Patacón',
                    categoria: 'almuerzo',
                    desc: 'Patacones crujientes con frijoles molidos especiales y queso rallado.',
                    ingredientes: 'Plátano verde frito, frijoles molidos arreglados, queso blanco rallado',
                    precio: 4000,
                    costo: 1300,
                    img: 'images-catalogo/Sr. Patacón.jpeg'
                },
                {
                    id: 'p-patacon-caribeno',
                    nombre: 'Patacón Caribeño',
                    categoria: 'almuerzo',
                    desc: 'Patacones estilo caribeño con frijoles, carne mechada, queso fundido y pico de gallo.',
                    ingredientes: 'Plátano verde, frijoles caribeños, carne mechada, queso fundido, pico de gallo casero',
                    precio: 4000,
                    costo: 1350,
                    img: 'images-catalogo/pataconcaribeño.jpeg'
                },
                {
                    id: 'p-sra-quesadilla',
                    nombre: 'Sra. Quesadilla',
                    categoria: 'almuerzo',
                    desc: 'Tortilla de harina dorada a la plancha con queso fundido y carne mechada.',
                    ingredientes: 'Tortilla de harina grande, queso mozzarella fundido, carne mechada sazonada, natilla',
                    precio: 4000,
                    costo: 1300,
                    img: 'images-catalogo/Sra. Quesadilla.jpeg'
                },
                {
                    id: 'p-sra-hamburguesa',
                    nombre: 'Sra. Hamburguesa con Papas',
                    categoria: 'almuerzo',
                    desc: 'Hamburguesa casera con torta artesanal, vegetales frescos y papas fritas.',
                    ingredientes: 'Pan artesanal, torta de carne de res, queso, tomate, lechuga, papas fritas',
                    precio: 5000,
                    costo: 1650,
                    img: 'images-catalogo/Sra. Hamburguesa con Papas.jpeg'
                },
                {
                    id: 'ce-hamburguesa-jr-fresco',
                    nombre: 'Combo: Hamburguesa Jr + Té Frío',
                    categoria: 'almuerzo',
                    desc: 'Hamburguesa Junior clásica con papas y té frío refrescante.',
                    ingredientes: 'Pan hamburguesa, torta de res, vegetales, papas fritas + vaso de té frío',
                    precio: 2500,
                    costo: 900,
                    img: 'images-catalogo/Hamburguesajr.jpeg'
                },
                {
                    id: 'p-sr-papi-carne',
                    nombre: 'Sr. Papi Carne',
                    categoria: 'almuerzo',
                    desc: 'Generosa porción de papas fritas con carne mechada al estilo de la casa.',
                    ingredientes: 'Papas fritas crujientes, carne mechada sazonada, queso rallado y salsas',
                    precio: 3500,
                    costo: 1200,
                    img: 'images-catalogo/Srpapicarne.jpeg'
                },

                // 🥟 SNACKS & ANTOJOS
                {
                    id: 'p-cono-salchipapa',
                    nombre: 'Sr. Cono de SalchiPapas',
                    categoria: 'snacks',
                    desc: 'Papas fritas crujientes con salchicha y salsas de la casa.',
                    ingredientes: 'Papas fritas, salchicha en rodajas, aderezos de la casa, queso',
                    precio: 3000,
                    costo: 950,
                    img: 'images-catalogo/Sr. Cono de SalchiPapas.jpeg'
                },
                {
                    id: 'ce-salchipapa-fresco',
                    nombre: 'Combo: Salchipapas + Té Frío',
                    categoria: 'snacks',
                    desc: 'Cono de salchipapas acompañado de un delicioso té frío.',
                    ingredientes: 'Papas fritas, salchichas tostadas, aderezos + té frío',
                    precio: 2500,
                    costo: 850,
                    img: 'images-catalogo/Sr. Cono de SalchiPapas.jpeg'
                },
                {
                    id: 'ce-hotdog-fresco',
                    nombre: 'Combo: Hot Dog + Té Frío',
                    categoria: 'snacks',
                    desc: 'Clásico hot dog con salchicha grande, papas tostadas y té frío.',
                    ingredientes: 'Pan de hot dog, salchicha jumbo, papas tostadas, salsas + té frío',
                    precio: 2000,
                    costo: 650,
                    img: 'images-catalogo/hotdog.jpeg'
                },
                {
                    id: 'p-empanada-pinto',
                    nombre: 'Empanada de Pinto',
                    categoria: 'snacks',
                    desc: 'Crujiente empanada rellena de gallo pinto tradicional.',
                    ingredientes: 'Masa de maíz sazonada, relleno de gallo pinto artesanal',
                    precio: 2500,
                    costo: 750,
                    img: 'images-catalogo/empanadas.jpeg'
                },
                {
                    id: 'p-empanada-carne',
                    nombre: 'Empanada de Carne',
                    categoria: 'snacks',
                    desc: 'Empanada artesanal crujiente rellena de carne mechada sazonada.',
                    ingredientes: 'Masa de maíz, carne mechada de res sazonada con olores naturales',
                    precio: 2500,
                    costo: 800,
                    img: 'images-catalogo/empanadas.jpeg'
                },
                {
                    id: 'p-empanada-queso',
                    nombre: 'Empanada de Queso Mozzarella',
                    categoria: 'snacks',
                    desc: 'Empanada rellena de abundante queso mozzarella derretido.',
                    ingredientes: 'Masa de maíz, queso mozzarella rallado',
                    precio: 2500,
                    costo: 800,
                    img: 'images-catalogo/empanadas.jpeg'
                },
                {
                    id: 'p-empanada-carne-queso',
                    nombre: 'Empanada de Carne y Queso',
                    categoria: 'snacks',
                    desc: 'Empanada mixta con carne mechada y queso mozzarella derretido.',
                    ingredientes: 'Masa de maíz, carne mechada, queso mozzarella',
                    precio: 2500,
                    costo: 850,
                    img: 'images-catalogo/empanadas.jpeg'
                },
                {
                    id: 'c-empanada-cafe',
                    nombre: 'Combo: Empanada + Café',
                    categoria: 'snacks',
                    desc: 'Empanada crujiente a elegir con Café Premium Grande.',
                    ingredientes: 'Empanada a elegir + café chorreado 12oz',
                    precio: 3000,
                    costo: 1050,
                    img: 'images-catalogo/empanadas.jpeg'
                },
                {
                    id: 'ce-empanada-fresco',
                    nombre: 'Combo: Empanada + Té Frío',
                    categoria: 'snacks',
                    desc: 'Empanada recién frita a elección acompañada de un refrescante té frío.',
                    ingredientes: 'Empanada a elección + té frío',
                    precio: 2000,
                    costo: 650,
                    img: 'images-catalogo/empanadas.jpeg'
                },

                // ☕ BEBIDAS
                {
                    id: 'b-cafe-premium',
                    nombre: 'Café Premium Grande (12 onzas)',
                    categoria: 'bebidas',
                    desc: 'Café chorreado de tueste medio costarricense en vaso de 12 oz.',
                    ingredientes: 'Café molido de altura costarricense, agua caliente',
                    precio: 1000,
                    costo: 250,
                    img: 'images-catalogo/12onzas.jpg'
                },
                {
                    id: 'b-cafe-8oz',
                    nombre: 'Café (8 onzas)',
                    categoria: 'bebidas',
                    desc: 'Café de calidad premium en presentación tradicional de 8 onzas.',
                    ingredientes: 'Café costarricense, agua caliente',
                    precio: 1000,
                    costo: 200,
                    img: 'images-catalogo/12onzas.jpg'
                },
                {
                    id: 'b-agua',
                    nombre: 'Agua Embotellada',
                    categoria: 'bebidas',
                    desc: 'Botella de agua purificada fresca de 600ml.',
                    ingredientes: 'Agua pura sellada',
                    precio: 1000,
                    costo: 350,
                    img: 'images-catalogo/agua.jpg'
                },
                {
                    id: 'b-gaseosas',
                    nombre: 'Gaseosas',
                    categoria: 'bebidas',
                    desc: 'Refrescantes gaseosas bien frías (Coca Cola, Fresca, Fanta, Gingerale).',
                    ingredientes: 'Lata / botella de refresco gaseoso',
                    precio: 1200,
                    costo: 600,
                    img: 'images-catalogo/gaseosas.jpg'
                },
                {
                    id: 'b-hidratante',
                    nombre: 'Bebidas Hidratantes',
                    categoria: 'bebidas',
                    desc: 'Para recuperar energías y mantenerte hidratado.',
                    ingredientes: 'Botella de electrolitos sellada',
                    precio: 1300,
                    costo: 650,
                    img: 'images-catalogo/hidratantes.jpg'
                }
            ];

            try {
                const batch = db.batch();
                allProducts.forEach(p => {
                    const ref = db.collection('volio_platillos').doc(p.id);
                    batch.set(ref, {
                        ...p,
                        actualizadoEn: new Date().toISOString()
                    }, { merge: true });
                });
                await batch.commit();

                if (interactive) {
                    alert(`✅ Se importaron y sincronizaron ${allProducts.length} productos y combos al Catálogo Maestro.`);
                }
            } catch (err) {
                console.error("Error al importar productos al catálogo:", err);
                if (interactive) alert("Hubo un error al sincronizar los productos.");
            }
        },

        updateModeUI() {
            const toggleBtn = document.getElementById('volio-toggle-btn');
            const toggleCard = document.getElementById('volio-toggle-card');
            const subtitle = document.getElementById('volio-toggle-subtitle');

            if (toggleBtn && toggleCard) {
                if (this.active) {
                    toggleBtn.classList.add('open');
                    toggleBtn.classList.remove('closed');
                    toggleCard.classList.add('open');
                    if (subtitle) subtitle.innerText = "Modo Volio ACTIVO • El menú público y POS muestran la selección de comidas Volio.";
                } else {
                    toggleBtn.classList.remove('open');
                    toggleBtn.classList.add('closed');
                    toggleCard.classList.remove('open');
                    if (subtitle) subtitle.innerText = "Modo Volio DESACTIVADO • Se muestra el menú tradicional de Sr. & Sra. Pinto.";
                }
            }
        },

        async toggleVolioMode() {
            const newState = !this.active;
            try {
                await window.FirebaseDB.collection('config').doc('volio').set({
                    active: newState,
                    actualizadoPor: localStorage.getItem('srsrapinto_cedula') || 'admin',
                    fecha: new Date().toISOString()
                });
            } catch (err) {
                console.error("Error al cambiar estado de Modo Volio:", err);
                alert("No se pudo cambiar el estado de Modo Volio.");
            }
        },

        switchDay(day, event) {
            if (event) event.preventDefault();
            this.currentDay = day;
            document.querySelectorAll('.day-tab-btn').forEach(btn => btn.classList.remove('active'));
            if (event && event.currentTarget) {
                event.currentTarget.classList.add('active');
            }
            this.renderDaySchedule();
        },

        renderDaySchedule() {
            const container = document.getElementById('volio-day-schedule-content');
            if (!container) return;

            const currentDayDishes = this.schedule[this.currentDay] || [];
            const categories = [
                { id: 'desayuno', label: '🍳 Desayunos' },
                { id: 'almuerzo', label: '🍲 Almuerzos' },
                { id: 'snacks', label: '🥟 Snacks & Antojos' },
                { id: 'bebidas', label: '☕ Bebidas' }
            ];

            let html = '';

            categories.forEach(cat => {
                const catDishes = this.dishes.filter(d => d.categoria === cat.id);
                html += `
                    <div style="margin-bottom: 20px;">
                        <h4 style="color: var(--mostaza); font-size: 0.95rem; margin-bottom: 10px; border-bottom: 1px dashed rgba(255,255,255,0.1); padding-bottom: 4px;">
                            ${cat.label} (${catDishes.length} en catálogo)
                        </h4>
                        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(310px, 1fr)); gap: 12px;">
                `;

                if (catDishes.length === 0) {
                    html += `<p style="font-size: 0.8rem; color: rgba(255,255,255,0.4); grid-column: 1 / -1;">No hay productos creados en esta categoría.</p>`;
                } else {
                    catDishes.forEach(dish => {
                        const isScheduled = currentDayDishes.includes(dish.id);
                        const imgSrc = dish.img || 'images-catalogo/Señor Pinto.jpeg';
                        html += `
                            <div style="background: ${isScheduled ? 'rgba(233, 19, 80, 0.12)' : 'rgba(0,0,0,0.3)'}; border: 1px solid ${isScheduled ? 'var(--rojo)' : 'var(--border)'}; border-radius: 10px; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center; gap: 12px; transition: all 0.2s;">
                                <div style="display: flex; align-items: center; gap: 10px; min-width: 0;">
                                    <img src="${imgSrc}" style="width: 44px; height: 44px; border-radius: 8px; object-fit: cover; flex-shrink: 0; border: 1px solid var(--border);" onerror="this.src='logo-brand/PNG/Icono Mostaza.png'">
                                    <div style="min-width: 0;">
                                        <strong style="color: white; font-size: 0.88rem; display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${this.sanitize(dish.nombre)}</strong>
                                        <span style="font-size: 0.78rem; color: var(--mostaza); font-weight: bold;">₡${(dish.precio || 0).toLocaleString()} <span style="color: rgba(255,255,255,0.4); font-weight: normal;">• Costo: ₡${(dish.costo || 0).toLocaleString()}</span></span>
                                        ${dish.ingredientes ? `<div style="font-size: 0.72rem; color: rgba(255,255,255,0.55); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 180px;">${this.sanitize(dish.ingredientes)}</div>` : ''}
                                    </div>
                                </div>
                                <label class="switch-toggle" style="cursor: pointer; flex-shrink: 0;" title="${isScheduled ? 'Activo hoy' : 'Inactivo hoy'}">
                                    <input type="checkbox" ${isScheduled ? 'checked' : ''} onchange="VolioManager.toggleDishInDay('${dish.id}', this.checked)" style="accent-color: var(--rojo); width: 20px; height: 20px; cursor: pointer;">
                                </label>
                            </div>
                        `;
                    });
                }

                html += `</div></div>`;
            });

            container.innerHTML = html;
        },

        async toggleDishInDay(dishId, isChecked) {
            let dayList = [...(this.schedule[this.currentDay] || [])];
            if (isChecked) {
                if (!dayList.includes(dishId)) dayList.push(dishId);
            } else {
                dayList = dayList.filter(id => id !== dishId);
            }

            this.schedule[this.currentDay] = dayList;

            try {
                await window.FirebaseDB.collection('config_volio').doc('programacion_semanal').update({
                    [this.currentDay]: dayList
                });
                this.renderDaySchedule();
            } catch (err) {
                console.error("Error al guardar programación semanal:", err);
                alert("No se pudo actualizar la programación.");
            }
        },

        renderDishesTable() {
            const container = document.getElementById('volio-dishes-list');
            if (!container) return;

            const search = (document.getElementById('volio-search-dish')?.value || '').toLowerCase();
            const filterCat = document.getElementById('volio-filter-cat')?.value || 'todas';

            const filtered = this.dishes.filter(d => {
                const matchSearch = (d.nombre || '').toLowerCase().includes(search) || 
                                    (d.desc || '').toLowerCase().includes(search) || 
                                    (d.ingredientes || '').toLowerCase().includes(search);
                const matchCat = filterCat === 'todas' || d.categoria === filterCat;
                return matchSearch && matchCat;
            });

            if (filtered.length === 0) {
                container.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 20px; opacity: 0.5;">No se encontraron productos en el catálogo.</td></tr>`;
                return;
            }

            container.innerHTML = filtered.map(dish => {
                const precio = dish.precio || 0;
                let costo = dish.costo || 0;

                // Calcular costo en vivo si el platillo tiene recetaItems definida
                if (dish.recetaItems && Array.isArray(dish.recetaItems) && dish.recetaItems.length > 0) {
                    const liveCosto = this.calculateDishLiveCost(dish.recetaItems);
                    if (liveCosto > 0) costo = liveCosto;
                }

                const margen = precio - costo;
                const margenPct = precio > 0 ? Math.round((margen / precio) * 100) : 0;
                const foodCostPct = precio > 0 ? Math.round((costo / precio) * 100) : 0;

                let marginBadgeClass = 'dish-margin-high';
                if (margenPct < 50) marginBadgeClass = 'dish-margin-low';
                else if (margenPct <= 65) marginBadgeClass = 'dish-margin-mid';

                const catLabels = { desayuno: '🍳 Desayuno', almuerzo: '🍲 Almuerzo', snacks: '🥟 Snacks', bebidas: '☕ Bebidas' };
                const imgSrc = dish.img || 'images-catalogo/Señor Pinto.jpeg';

                return `
                    <tr>
                        <td style="width: 50px;">
                            <img src="${imgSrc}" style="width: 42px; height: 42px; object-fit: cover; border-radius: 6px; border: 1px solid var(--border);" alt="Foto" onerror="this.src='logo-brand/PNG/Icono Mostaza.png'">
                        </td>
                        <td>
                            <strong style="color: white; font-size: 0.92rem;">${this.sanitize(dish.nombre)}</strong>
                            ${dish.ingredientes ? `<div style="font-size: 0.75rem; color: #f1c40f; margin-top: 2px;"><i class="fas fa-mortar-pestle" style="margin-right: 4px;"></i>${this.sanitize(dish.ingredientes)}</div>` : ''}
                            ${dish.desc ? `<div style="font-size: 0.72rem; color: rgba(255,255,255,0.4);">${this.sanitize(dish.desc)}</div>` : ''}
                        </td>
                        <td style="font-size: 0.82rem;">${catLabels[dish.categoria] || dish.categoria}</td>
                        <td style="font-weight: 800; color: var(--mostaza);">₡${precio.toLocaleString()}</td>
                        <td style="font-weight: 700; color: #e74c3c;">₡${costo.toLocaleString()}</td>
                        <td style="font-weight: 700; color: #2ecc71;">₡${margen.toLocaleString()}</td>
                        <td>
                            <span class="dish-margin-badge ${marginBadgeClass}">
                                ${margenPct}% util / ${foodCostPct}% FC
                            </span>
                        </td>
                        <td>
                            <div style="display: flex; gap: 8px;">
                                <button class="action-btn" onclick="VolioManager.openDishModal('${dish.id}')" title="Editar">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="action-btn" onclick="VolioManager.deleteDish('${dish.id}', '${this.sanitize(dish.nombre)}')" style="color: var(--alerta);" title="Eliminar">
                                    <i class="fas fa-trash-alt"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');
        },

        calculateDishLiveCost(recetaItems) {
            if (!recetaItems || !Array.isArray(recetaItems) || recetaItems.length === 0) return 0;
            const inv = window.currentInventory || [];
            let total = 0;
            recetaItems.forEach(item => {
                const found = inv.find(i => i.id === item.inventarioId);
                const unitCost = found ? (found.costoUnitario || 0) : (item.costoUnitario || 0);
                const qty = typeof item.cantidad === 'number' ? item.cantidad : (parseFloat(item.cantidad) || 0);
                total += (unitCost * qty);
            });
            return Math.round(total);
        },

        updateImgPreview() {
            const val = document.getElementById('volio-dish-img')?.value || 'images-catalogo/Señor Pinto.jpeg';
            const preview = document.getElementById('volio-dish-img-preview');
            if (preview) {
                preview.src = val;
            }
        },

        handleFileUpload(event) {
            const file = event.target.files && event.target.files[0];
            if (!file) return;

            if (!file.type.startsWith('image/')) {
                alert("Por favor selecciona un archivo de imagen válido (JPG, PNG, WEBP, etc.).");
                return;
            }

            const statusEl = document.getElementById('volio-dish-file-status');
            if (statusEl) {
                statusEl.style.display = 'inline-flex';
                statusEl.style.color = '#f1c40f';
                statusEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Procesando foto...';
            }

            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 800;
                    const MAX_HEIGHT = 800;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height = Math.round(height * (MAX_WIDTH / width));
                            width = MAX_WIDTH;
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width = Math.round(width * (MAX_HEIGHT / height));
                            height = MAX_HEIGHT;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

                    document.getElementById('volio-dish-img').value = dataUrl;
                    const preview = document.getElementById('volio-dish-img-preview');
                    if (preview) preview.src = dataUrl;

                    if (statusEl) {
                        statusEl.style.display = 'inline-flex';
                        statusEl.style.color = '#2ecc71';
                        statusEl.innerHTML = `<i class="fas fa-check-circle"></i> "${this.sanitize(file.name)}" lista`;
                    }
                };
                img.onerror = () => {
                    alert("No se pudo procesar la imagen seleccionada.");
                    if (statusEl) statusEl.style.display = 'none';
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        },

        deriveDefaultRecipe(dish) {
            const DEFAULT_DISH_RECIPES = {
                'p-senor-pinto': [
                    { inventarioId: 'pinto', cantidad: 1 },
                    { inventarioId: 'queso_frito', cantidad: 1 },
                    { inventarioId: 'huevos', cantidad: 1 },
                    { inventarioId: 'maduro', cantidad: 1 },
                    { inventarioId: 'caja_empaque', cantidad: 1 },
                    { inventarioId: 'kit_cubiertos', cantidad: 1 }
                ],
                'c-senor-pinto-cafe': [
                    { inventarioId: 'pinto', cantidad: 1 },
                    { inventarioId: 'queso_frito', cantidad: 1 },
                    { inventarioId: 'huevos', cantidad: 1 },
                    { inventarioId: 'maduro', cantidad: 1 },
                    { inventarioId: 'cafe', cantidad: 1 },
                    { inventarioId: 'caja_empaque', cantidad: 1 },
                    { inventarioId: 'vaso_cafe_tapa', cantidad: 1 },
                    { inventarioId: 'kit_cubiertos', cantidad: 1 }
                ],
                'p-burrote': [
                    { inventarioId: 'tortilla_harina', cantidad: 1 },
                    { inventarioId: 'pinto', cantidad: 1 },
                    { inventarioId: 'queso_frito', cantidad: 1 },
                    { inventarioId: 'huevos', cantidad: 1 },
                    { inventarioId: 'natilla', cantidad: 1 },
                    { inventarioId: 'bolsa_kraft', cantidad: 1 }
                ],
                'c-burrote-cafe': [
                    { inventarioId: 'tortilla_harina', cantidad: 1 },
                    { inventarioId: 'pinto', cantidad: 1 },
                    { inventarioId: 'queso_frito', cantidad: 1 },
                    { inventarioId: 'huevos', cantidad: 1 },
                    { inventarioId: 'natilla', cantidad: 1 },
                    { inventarioId: 'cafe', cantidad: 1 },
                    { inventarioId: 'bolsa_kraft', cantidad: 1 },
                    { inventarioId: 'vaso_cafe_tapa', cantidad: 1 }
                ],
                'p-sra-hamburguesa': [
                    { inventarioId: 'pan_hamburguesa', cantidad: 1 },
                    { inventarioId: 'torta_carne', cantidad: 1 },
                    { inventarioId: 'queso_mozzarella', cantidad: 1 },
                    { inventarioId: 'papas_fritas', cantidad: 1 },
                    { inventarioId: 'caja_empaque', cantidad: 1 }
                ],
                'p-sr-patacon': [
                    { inventarioId: 'patacones', cantidad: 1 },
                    { inventarioId: 'frijoles_molidos', cantidad: 1 },
                    { inventarioId: 'queso_rallado', cantidad: 1 },
                    { inventarioId: 'caja_empaque', cantidad: 1 }
                ],
                'p-sra-quesadilla': [
                    { inventarioId: 'tortilla_harina', cantidad: 1 },
                    { inventarioId: 'queso_rallado', cantidad: 2 },
                    { inventarioId: 'carne_mechada', cantidad: 1 },
                    { inventarioId: 'caja_empaque', cantidad: 1 }
                ],
                'p-empanada-carne': [
                    { inventarioId: 'masa_empanada', cantidad: 1 },
                    { inventarioId: 'carne_mechada', cantidad: 1 },
                    { inventarioId: 'bolsa_kraft', cantidad: 1 }
                ],
                'p-empanada-queso': [
                    { inventarioId: 'masa_empanada', cantidad: 1 },
                    { inventarioId: 'queso_mozzarella', cantidad: 1 },
                    { inventarioId: 'bolsa_kraft', cantidad: 1 }
                ],
                'p-empanada-carne-queso': [
                    { inventarioId: 'masa_empanada', cantidad: 1 },
                    { inventarioId: 'carne_mechada', cantidad: 0.5 },
                    { inventarioId: 'queso_mozzarella', cantidad: 0.5 },
                    { inventarioId: 'bolsa_kraft', cantidad: 1 }
                ],
                'p-sra-empanada-m1': [
                    { inventarioId: 'masa_empanada', cantidad: 1 },
                    { inventarioId: 'carne_mechada', cantidad: 1 },
                    { inventarioId: 'pinto', cantidad: 0.5 },
                    { inventarioId: 'ensalada', cantidad: 1 },
                    { inventarioId: 'caja_empaque', cantidad: 1 }
                ],
                'p-sra-empanada-m2': [
                    { inventarioId: 'masa_empanada', cantidad: 1 },
                    { inventarioId: 'queso_mozzarella', cantidad: 1 },
                    { inventarioId: 'ensalada', cantidad: 1 },
                    { inventarioId: 'caja_empaque', cantidad: 1 }
                ],
                'p-cono-salchipapa': [
                    { inventarioId: 'papas_fritas', cantidad: 1 },
                    { inventarioId: 'salchicha', cantidad: 1 },
                    { inventarioId: 'caja_empaque', cantidad: 1 }
                ],
                'p-queso-pinto': [
                    { inventarioId: 'pinto', cantidad: 1 },
                    { inventarioId: 'queso_frito', cantidad: 2 },
                    { inventarioId: 'caja_empaque', cantidad: 1 }
                ],
                'b-cafe-premium': [
                    { inventarioId: 'cafe', cantidad: 1 },
                    { inventarioId: 'vaso_cafe_tapa', cantidad: 1 }
                ],
                'b-agua': [
                    { inventarioId: 'botella_agua', cantidad: 1 }
                ],
                'b-gaseosas': [
                    { inventarioId: 'gaseosa', cantidad: 1 }
                ],
                'b-hidratante': [
                    { inventarioId: 'hidratante', cantidad: 1 }
                ]
            };

            if (dish && dish.id && DEFAULT_DISH_RECIPES[dish.id]) {
                return JSON.parse(JSON.stringify(DEFAULT_DISH_RECIPES[dish.id]));
            }

            const nameLower = ((dish && dish.nombre) || '').toLowerCase();
            const items = [];
            if (nameLower.includes('pinto')) items.push({ inventarioId: 'pinto', cantidad: 1 }, { inventarioId: 'queso_frito', cantidad: 1 }, { inventarioId: 'huevos', cantidad: 1 });
            if (nameLower.includes('burrote') || nameLower.includes('burrito')) items.push({ inventarioId: 'tortilla_harina', cantidad: 1 }, { inventarioId: 'natilla', cantidad: 1 });
            if (nameLower.includes('patacón') || nameLower.includes('patacon')) items.push({ inventarioId: 'patacones', cantidad: 1 }, { inventarioId: 'frijoles_molidos', cantidad: 1 }, { inventarioId: 'queso_rallado', cantidad: 1 });
            if (nameLower.includes('hamburguesa')) items.push({ inventarioId: 'pan_hamburguesa', cantidad: 1 }, { inventarioId: 'torta_carne', cantidad: 1 }, { inventarioId: 'queso_mozzarella', cantidad: 1 }, { inventarioId: 'papas_fritas', cantidad: 1 });
            if (nameLower.includes('empanada')) items.push({ inventarioId: 'masa_empanada', cantidad: 1 }, { inventarioId: 'carne_mechada', cantidad: 1 });
            if (nameLower.includes('salchipapa')) items.push({ inventarioId: 'papas_fritas', cantidad: 1 }, { inventarioId: 'salchicha', cantidad: 1 });
            if (nameLower.includes('café') || nameLower.includes('cafe')) items.push({ inventarioId: 'cafe', cantidad: 1 }, { inventarioId: 'vaso_cafe_tapa', cantidad: 1 });
            if (nameLower.includes('agua')) items.push({ inventarioId: 'botella_agua', cantidad: 1 });
            if (nameLower.includes('gaseosa')) items.push({ inventarioId: 'gaseosa', cantidad: 1 });
            if (nameLower.includes('hidratante') || nameLower.includes('powerade')) items.push({ inventarioId: 'hidratante', cantidad: 1 });

            if (items.length === 0) {
                items.push({ inventarioId: 'pinto', cantidad: 1 });
            }

            if (!items.some(it => it.inventarioId.includes('empaque') || it.inventarioId.includes('vaso') || it.inventarioId.includes('bolsa'))) {
                if (dish && dish.categoria === 'bebidas') items.push({ inventarioId: 'vaso_fresco', cantidad: 1 });
                else items.push({ inventarioId: 'caja_empaque', cantidad: 1 });
            }

            return items;
        },

        openDishModal(id = null) {
            const modal = document.getElementById('volio-dish-modal');
            const title = document.getElementById('volio-dish-modal-title');
            document.getElementById('volio-dish-id').value = id || '';

            const fileInput = document.getElementById('volio-dish-file');
            if (fileInput) fileInput.value = '';
            const statusEl = document.getElementById('volio-dish-file-status');
            if (statusEl) statusEl.style.display = 'none';

            let dish = null;
            if (id) {
                dish = this.dishes.find(d => d.id === id);
            }

            if (dish) {
                title.innerHTML = `<i class="fas fa-edit"></i> Editar Producto: ${this.sanitize(dish.nombre)}`;
                document.getElementById('volio-dish-name').value = dish.nombre || '';
                document.getElementById('volio-dish-category').value = dish.categoria || 'desayuno';
                document.getElementById('volio-dish-ingredients').value = dish.ingredientes || '';
                document.getElementById('volio-dish-desc').value = dish.desc || '';
                document.getElementById('volio-dish-price').value = dish.precio || '';
                document.getElementById('volio-dish-img').value = dish.img || 'images-catalogo/Señor Pinto.jpeg';

                if (dish.recetaItems && Array.isArray(dish.recetaItems) && dish.recetaItems.length > 0) {
                    this.activeRecipeItems = JSON.parse(JSON.stringify(dish.recetaItems));
                } else {
                    this.activeRecipeItems = this.deriveDefaultRecipe(dish);
                }
            } else {
                title.innerHTML = `<i class="fas fa-plus"></i> Nuevo Producto / Platillo`;
                document.getElementById('volio-dish-name').value = '';
                document.getElementById('volio-dish-category').value = 'desayuno';
                document.getElementById('volio-dish-ingredients').value = '';
                document.getElementById('volio-dish-desc').value = '';
                document.getElementById('volio-dish-price').value = '';
                document.getElementById('volio-dish-cost').value = '0';
                document.getElementById('volio-dish-img').value = 'images-catalogo/Señor Pinto.jpeg';
                this.activeRecipeItems = [
                    { inventarioId: 'pinto', cantidad: 1 },
                    { inventarioId: 'caja_empaque', cantidad: 1 }
                ];
            }

            this.updateImgPreview();
            this.renderRecipeRows();
            modal.classList.add('active');
        },

        renderRecipeRows() {
            const container = document.getElementById('volio-recipe-rows');
            if (!container) return;

            const inv = window.currentInventory || [];
            if (!this.activeRecipeItems || this.activeRecipeItems.length === 0) {
                container.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 15px; color: rgba(255,255,255,0.5);">Sin insumos agregados aún. Haz clic en "+ Agregar Insumo / Empaque"</td></tr>`;
                this.calculateRecipeTotals();
                return;
            }

            // Opciones agrupadas para el select
            const ingredientesOptions = inv.filter(i => i.tipo !== 'empaque').map(i => {
                return `<option value="${i.id}">${i.nombre || i.id} (₡${(i.costoUnitario || 0).toLocaleString()})</option>`;
            }).join('');
            const empaquesOptions = inv.filter(i => i.tipo === 'empaque').map(i => {
                return `<option value="${i.id}">📦 ${i.nombre || i.id} (₡${(i.costoUnitario || 0).toLocaleString()})</option>`;
            }).join('');

            container.innerHTML = this.activeRecipeItems.map((item, idx) => {
                const invItem = inv.find(i => i.id === item.inventarioId) || { costoUnitario: item.costoUnitario || 0, tipo: 'ingrediente', nombre: item.inventarioId };
                const unitCost = invItem.costoUnitario || 0;
                const qty = typeof item.cantidad === 'number' ? item.cantidad : (parseFloat(item.cantidad) || 1);
                const subtotal = Math.round(qty * unitCost);

                return `
                    <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                        <td style="padding: 6px 8px;">
                            <select onchange="VolioManager.onRecipeItemChanged(${idx}, this.value)" style="width: 100%; background: rgba(0,0,0,0.4); border: 1px solid var(--border); color: #fff; padding: 5px 8px; border-radius: 6px; font-size: 0.8rem;">
                                <optgroup label="🥩 Ingredientes de Cocina">
                                    ${ingredientesOptions}
                                </optgroup>
                                <optgroup label="📦 Empaques y Desechables">
                                    ${empaquesOptions}
                                </optgroup>
                            </select>
                        </td>
                        <td style="padding: 6px 4px; text-align: center;">
                            <input type="number" min="0.1" step="0.5" value="${qty}" oninput="VolioManager.onRecipeQtyChanged(${idx}, this.value)" style="width: 65px; background: rgba(0,0,0,0.4); border: 1px solid var(--border); color: #fff; padding: 5px 4px; text-align: center; border-radius: 6px; font-size: 0.82rem; font-weight: 700;">
                        </td>
                        <td style="padding: 6px 8px; text-align: right; color: rgba(255,255,255,0.7); font-size: 0.82rem;">
                            ₡${unitCost.toLocaleString()}
                        </td>
                        <td style="padding: 6px 8px; text-align: right; font-weight: 800; color: #2ecc71; font-size: 0.85rem;">
                            ₡${subtotal.toLocaleString()}
                        </td>
                        <td style="padding: 6px 4px; text-align: center;">
                            <button type="button" onclick="VolioManager.removeRecipeRow(${idx})" class="action-btn" style="color: var(--alerta); padding: 4px;" title="Quitar insumo">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        </td>
                    </tr>
                `;
            }).join('');

            // Seleccionar los valores correctos en los selects
            const selects = container.querySelectorAll('select');
            this.activeRecipeItems.forEach((item, idx) => {
                if (selects[idx]) {
                    selects[idx].value = item.inventarioId;
                }
            });

            this.calculateRecipeTotals();
        },

        addRecipeRow() {
            if (!this.activeRecipeItems) this.activeRecipeItems = [];
            const inv = window.currentInventory || [];
            const defaultId = inv.length > 0 ? inv[0].id : 'pinto';
            this.activeRecipeItems.push({ inventarioId: defaultId, cantidad: 1 });
            this.renderRecipeRows();
        },

        removeRecipeRow(index) {
            if (!this.activeRecipeItems) return;
            this.activeRecipeItems.splice(index, 1);
            this.renderRecipeRows();
        },

        onRecipeItemChanged(index, newInvId) {
            if (!this.activeRecipeItems || !this.activeRecipeItems[index]) return;
            this.activeRecipeItems[index].inventarioId = newInvId;
            this.renderRecipeRows();
        },

        onRecipeQtyChanged(index, newQty) {
            if (!this.activeRecipeItems || !this.activeRecipeItems[index]) return;
            const parsed = parseFloat(newQty);
            this.activeRecipeItems[index].cantidad = isNaN(parsed) ? 0 : parsed;
            this.calculateRecipeTotals();
        },

        calculateRecipeTotals() {
            const inv = window.currentInventory || [];
            let subtotalIng = 0;
            let subtotalEmp = 0;

            if (this.activeRecipeItems && Array.isArray(this.activeRecipeItems)) {
                this.activeRecipeItems.forEach(it => {
                    const found = inv.find(i => i.id === it.inventarioId);
                    const cost = found ? (found.costoUnitario || 0) : 0;
                    const qty = typeof it.cantidad === 'number' ? it.cantidad : (parseFloat(it.cantidad) || 0);
                    const sub = Math.round(qty * cost);
                    if (found && found.tipo === 'empaque') {
                        subtotalEmp += sub;
                    } else {
                        subtotalIng += sub;
                    }
                });
            }

            const total = subtotalIng + subtotalEmp;

            const elIng = document.getElementById('receta-subtotal-ing');
            const elEmp = document.getElementById('receta-subtotal-emp');
            const elTotal = document.getElementById('receta-total-cost');
            const costInput = document.getElementById('volio-dish-cost');

            if (elIng) elIng.innerText = `₡${subtotalIng.toLocaleString()}`;
            if (elEmp) elEmp.innerText = `₡${subtotalEmp.toLocaleString()}`;
            if (elTotal) elTotal.innerText = `₡${total.toLocaleString()}`;
            if (costInput) {
                costInput.value = total;
            }

            this.calcCostMetrics();
        },

        syncIngredientsText(event) {
            if (event) event.preventDefault();
            const inv = window.currentInventory || [];
            if (!this.activeRecipeItems || this.activeRecipeItems.length === 0) return;

            const names = this.activeRecipeItems
                .map(it => {
                    const found = inv.find(i => i.id === it.inventarioId);
                    if (found && found.tipo === 'empaque') return null;
                    return found ? (found.nombre || it.inventarioId.replace(/_/g, ' ')) : it.inventarioId.replace(/_/g, ' ');
                })
                .filter(Boolean);

            const textInput = document.getElementById('volio-dish-ingredients');
            if (textInput && names.length > 0) {
                textInput.value = names.join(', ');
            }
        },

        closeDishModal() {
            document.getElementById('volio-dish-modal').classList.remove('active');
        },

        calcCostMetrics() {
            const price = parseFloat(document.getElementById('volio-dish-price').value) || 0;
            const cost = parseFloat(document.getElementById('volio-dish-cost').value) || 0;
            const margin = price - cost;
            const marginPct = price > 0 ? Math.round((margin / price) * 100) : 0;
            const foodCostPct = price > 0 ? Math.round((cost / price) * 100) : 0;

            const marginColones = document.getElementById('preview-margin-colones');
            const marginPctEl = document.getElementById('preview-margin-pct');
            const fcEl = document.getElementById('preview-food-cost');

            if (marginColones) marginColones.innerText = `₡${margin.toLocaleString()}`;
            if (marginPctEl) {
                marginPctEl.innerText = `${marginPct}%`;
                marginPctEl.style.color = marginPct >= 65 ? '#2ecc71' : (marginPct >= 50 ? '#f1c40f' : '#e74c3c');
            }
            if (fcEl) {
                fcEl.innerText = `${foodCostPct}%`;
                fcEl.style.color = foodCostPct <= 35 ? '#2ecc71' : '#e74c3c';
            }
        },

        async saveDish() {
            const id = document.getElementById('volio-dish-id').value;
            const nombre = document.getElementById('volio-dish-name').value.trim();
            const categoria = document.getElementById('volio-dish-category').value;
            const ingredientes = document.getElementById('volio-dish-ingredients')?.value.trim() || '';
            const desc = document.getElementById('volio-dish-desc').value.trim();
            const precio = parseFloat(document.getElementById('volio-dish-price').value);
            const costo = parseFloat(document.getElementById('volio-dish-cost').value) || 0;
            const img = document.getElementById('volio-dish-img').value.trim();

            if (!nombre || isNaN(precio) || precio <= 0) {
                alert("Por favor ingresa un nombre válido y un precio de venta mayor a 0.");
                return;
            }

            const dishData = {
                nombre,
                categoria,
                ingredientes,
                desc,
                precio,
                costo,
                recetaItems: this.activeRecipeItems || [],
                img: img || 'images-catalogo/Señor Pinto.jpeg',
                actualizadoEn: new Date().toISOString()
            };

            const btn = document.getElementById('btn-save-volio-dish');
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';

            try {
                const db = window.FirebaseDB;
                if (id) {
                    await db.collection('volio_platillos').doc(id).update(dishData);
                } else {
                    const newId = 'v-' + Date.now();
                    await db.collection('volio_platillos').doc(newId).set(dishData);
                }
                this.closeDishModal();
            } catch (err) {
                console.error("Error al guardar platillo Volio:", err);
                alert("Hubo un error al guardar el platillo.");
            } finally {
                btn.disabled = false;
                btn.innerHTML = 'Guardar Platillo';
            }
        },

        async deleteDish(id, nombre) {
            if (!confirm(`¿Deseas eliminar el platillo "${nombre}" del catálogo de Volio?`)) return;
            try {
                await window.FirebaseDB.collection('volio_platillos').doc(id).delete();
                // Remover de la programación semanal de todos los días
                const days = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'];
                const updates = {};
                days.forEach(d => {
                    if (this.schedule[d] && this.schedule[d].includes(id)) {
                        this.schedule[d] = this.schedule[d].filter(dishId => dishId !== id);
                        updates[d] = this.schedule[d];
                    }
                });
                if (Object.keys(updates).length > 0) {
                    await window.FirebaseDB.collection('config_volio').doc('programacion_semanal').update(updates);
                }
            } catch (err) {
                console.error("Error al eliminar platillo:", err);
                alert("No se pudo eliminar el platillo.");
            }
        }
    };

    // ==========================================================================
    // MÓDULO: FINANCES MANAGER (Régimen Simplificado Hacienda CR & Contabilidad)
    // ==========================================================================
    window.FinancesManager = {
        purchases: [],
        legalObligations: [],
        salaries: [],
        orders: [],
        initialized: false,

        sanitize(str) {
            if (!str) return '';
            const temp = document.createElement('div');
            temp.textContent = str;
            return temp.innerHTML;
        },

        init() {
            if (this.initialized) return;
            this.initialized = true;
            const db = window.FirebaseDB;
            if (!db) return;

            // 1. Escuchar compras registradas
            db.collection('compras').onSnapshot(snapshot => {
                this.purchases = [];
                snapshot.forEach(doc => {
                    this.purchases.push({ id: doc.id, ...doc.data() });
                });
                this.purchases.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
                this.loadPurchasesReport();
                this.recalculatePL();
                this.calculateD105Hacienda();
            });

            // 2. Escuchar salarios registrados
            db.collection('salarios').onSnapshot(snapshot => {
                this.salaries = [];
                snapshot.forEach(doc => {
                    this.salaries.push({ id: doc.id, ...doc.data() });
                });
                this.salaries.sort((a, b) => new Date(b.fechaPago) - new Date(a.fechaPago));
                this.renderSalariesTable();
                this.recalculatePL();
            });

            // 3. Escuchar obligaciones legales
            db.collection('obligaciones_legales').onSnapshot(snapshot => {
                this.legalObligations = [];
                snapshot.forEach(doc => {
                    this.legalObligations.push({ id: doc.id, ...doc.data() });
                });
                if (this.legalObligations.length === 0) {
                    this.seedInitialObligations();
                } else {
                    this.renderLegalObligations();
                }
            });

            // 4. Escuchar pedidos para P&L y Cuadre de Caja
            db.collection('pedidos').onSnapshot(snapshot => {
                this.orders = [];
                snapshot.forEach(doc => {
                    const data = doc.data();
                    if (data.estado !== 'pendiente_aprobacion' && data.estado !== 'cancelado') {
                        this.orders.push(data);
                    }
                });
                this.recalculatePL();
                this.loadCashReconciliation();
            });
        },

        async seedInitialObligations() {
            const db = window.FirebaseDB;
            const batch = db.batch();
            const now = new Date();
            const y = now.getFullYear();
            const m = now.getMonth();

            const defaults = [
                {
                    tipo: 'Luz',
                    titulo: 'Recibo de Luz Eléctrica (CNFL / ICE)',
                    fechaVencimiento: new Date(y, now.getDate() > 15 ? m + 1 : m, 15).toISOString().split('T')[0],
                    recurrencia: 'dia_15',
                    monto: 45000,
                    notas: 'Vence el día 15 de cada mes',
                    pagado: false
                },
                {
                    tipo: 'Agua',
                    titulo: 'Recibo de Agua Potable (AyA / ESPH)',
                    fechaVencimiento: new Date(y, m + 1, 0).toISOString().split('T')[0],
                    recurrencia: 'mensual',
                    monto: 25000,
                    notas: 'Fecha por confirmar / Fin de mes',
                    pagado: false
                },
                {
                    tipo: 'CCSS',
                    titulo: 'Planilla Mensual CCSS',
                    fechaVencimiento: new Date(y, m, 20).toISOString().split('T')[0],
                    recurrencia: 'mensual',
                    monto: 35000,
                    notas: 'Último hábil de cada mes',
                    pagado: false
                },
                {
                    tipo: 'INS',
                    titulo: 'Póliza Riesgos del Trabajo INS',
                    fechaVencimiento: new Date(y, m + 1, 10).toISOString().split('T')[0],
                    recurrencia: 'semestral',
                    monto: 18000,
                    notas: 'Póliza laboral',
                    pagado: false
                },
                {
                    tipo: 'Patente',
                    titulo: 'Patente Municipal Comercial',
                    fechaVencimiento: new Date(y, Math.floor(m / 3) * 3 + 3, 15).toISOString().split('T')[0],
                    recurrencia: 'trimestral',
                    monto: 45000,
                    notas: 'Trimestral',
                    pagado: false
                },
                {
                    tipo: 'Hacienda D-105',
                    titulo: 'Declaración Trimestral Tributación (D-105)',
                    fechaVencimiento: new Date(y, Math.floor(m / 3) * 3 + 3, 15).toISOString().split('T')[0],
                    recurrencia: 'trimestral',
                    monto: 0,
                    notas: 'Régimen Simplificado (5610.0)',
                    pagado: false
                }
            ];

            defaults.forEach((ob, idx) => {
                const ref = db.collection('obligaciones_legales').doc('ob-' + idx);
                batch.set(ref, ob);
            });
            await batch.commit();
        },

        recalculatePL() {
            const period = document.getElementById('fin-pl-period')?.value || 'mes';
            const now = new Date();
            let startDate = new Date();
            let endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
            let filterActive = true;

            if (period === 'hoy') {
                startDate.setHours(0, 0, 0, 0);
            } else if (period === 'semana') {
                const day = now.getDay() || 7;
                startDate.setDate(now.getDate() - day + 1);
                startDate.setHours(0, 0, 0, 0);
            } else if (period === 'mes') {
                startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
            } else if (period === 'trimestre') {
                const currentQuarter = Math.floor(now.getMonth() / 3);
                startDate = new Date(now.getFullYear(), currentQuarter * 3, 1, 0, 0, 0);
            } else if (period === 'ano') {
                startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
            } else {
                filterActive = false;
            }

            // Filtrar pedidos
            const filteredOrders = this.orders.filter(o => {
                if (!filterActive) return true;
                const d = new Date(o.fecha);
                return d >= startDate && d <= endDate;
            });

            // Filtrar compras
            const filteredPurchases = this.purchases.filter(p => {
                if (!filterActive) return true;
                const d = new Date(p.fecha + 'T12:00:00');
                return d >= startDate && d <= endDate;
            });

            // Filtrar salarios
            const filteredSalaries = this.salaries.filter(s => {
                if (!filterActive) return true;
                const d = new Date(s.fechaPago + 'T12:00:00');
                return d >= startDate && d <= endDate;
            });

            // Ingresos totales por ventas
            const totalIncome = filteredOrders.reduce((sum, o) => sum + (o.total || 0), 0);
            // Total compras
            const totalPurchases = filteredPurchases.reduce((sum, p) => sum + (p.total || 0), 0);
            // Total salarios pagados
            const totalSalaries = filteredSalaries.reduce((sum, s) => sum + (s.monto || 0), 0);
            // Utilidad Neta Real
            const netProfit = totalIncome - totalPurchases - totalSalaries;
            const marginPct = totalIncome > 0 ? Math.round((netProfit / totalIncome) * 100) : 0;

            const elIncome = document.getElementById('fin-stat-income');
            const elPurchases = document.getElementById('fin-stat-purchases');
            const elSalaries = document.getElementById('fin-stat-salaries');
            const elProfit = document.getElementById('fin-stat-profit');
            const elMargin = document.getElementById('fin-stat-margin');

            if (elIncome) elIncome.innerText = `₡${totalIncome.toLocaleString()}`;
            if (elPurchases) elPurchases.innerText = `₡${totalPurchases.toLocaleString()}`;
            if (elSalaries) elSalaries.innerText = `₡${totalSalaries.toLocaleString()}`;
            if (elProfit) {
                elProfit.innerText = `₡${netProfit.toLocaleString()}`;
                elProfit.style.color = netProfit >= 0 ? '#2ecc71' : '#e74c3c';
            }
            if (elMargin) {
                elMargin.innerText = `${marginPct}%`;
                elMargin.style.color = marginPct >= 0 ? '#f1c40f' : '#e74c3c';
            }

            // --- LÍMITE ANUAL RÉGIMEN SIMPLIFICADO (186 Salarios Base = ~₡85,969,200) ---
            const currentYear = now.getFullYear();
            const annualPurchases = this.purchases.filter(p => {
                const pYear = new Date(p.fecha + 'T12:00:00').getFullYear();
                return pYear === currentYear && p.aplicaHacienda !== false;
            }).reduce((sum, p) => sum + (p.total || 0), 0);

            const annualMax = 85969200; // 186 salarios base x ₡462,200
            const annualPct = Math.min(100, (annualPurchases / annualMax) * 100);
            const annualRemaining = Math.max(0, annualMax - annualPurchases);

            const elAnnualSum = document.getElementById('annual-purchases-sum');
            const elAnnualFill = document.getElementById('annual-limit-progress-fill');
            const elAnnualPct = document.getElementById('annual-limit-pct');
            const elAnnualRem = document.getElementById('annual-limit-remaining');
            const elAnnualBadge = document.getElementById('annual-limit-status-badge');

            if (elAnnualSum) elAnnualSum.innerText = `₡${annualPurchases.toLocaleString()} / ₡${annualMax.toLocaleString()}`;
            if (elAnnualFill) {
                elAnnualFill.style.width = `${annualPct}%`;
                elAnnualFill.style.background = annualPct < 70 ? 'linear-gradient(90deg, #2ecc71, #27ae60)' : (annualPct < 90 ? 'linear-gradient(90deg, #f1c40f, #e67e22)' : 'linear-gradient(90deg, #e74c3c, #c0392b)');
            }
            if (elAnnualPct) elAnnualPct.innerText = `${annualPct.toFixed(1)}% del tope anual utilizado`;
            if (elAnnualRem) elAnnualRem.innerText = `₡${annualRemaining.toLocaleString()} de margen disponible`;
            if (elAnnualBadge) {
                if (annualPct < 70) {
                    elAnnualBadge.innerText = '🟢 SEGURO';
                    elAnnualBadge.style.color = '#2ecc71';
                    elAnnualBadge.style.borderColor = '#2ecc71';
                } else if (annualPct < 90) {
                    elAnnualBadge.innerText = '🟡 PRECAUCIÓN';
                    elAnnualBadge.style.color = '#f1c40f';
                    elAnnualBadge.style.borderColor = '#f1c40f';
                } else {
                    elAnnualBadge.innerText = '🔴 ALERTA TOPE';
                    elAnnualBadge.style.color = '#e74c3c';
                    elAnnualBadge.style.borderColor = '#e74c3c';
                }
            }
        },

        loadCashReconciliation() {
            const period = document.getElementById('cash-recon-period')?.value || 'hoy';
            const now = new Date();
            let startDate = new Date();
            let endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

            if (period === 'hoy') {
                startDate.setHours(0, 0, 0, 0);
            } else if (period === 'ayer') {
                startDate.setDate(startDate.getDate() - 1);
                startDate.setHours(0, 0, 0, 0);
                endDate.setDate(endDate.getDate() - 1);
                endDate.setHours(23, 59, 59, 999);
            } else if (period === 'semana') {
                const day = now.getDay() || 7;
                startDate.setDate(now.getDate() - day + 1);
                startDate.setHours(0, 0, 0, 0);
            } else if (period === 'mes') {
                startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
            }

            const filteredOrders = this.orders.filter(order => {
                const oDate = new Date(order.fecha);
                return oDate >= startDate && oDate <= endDate;
            });

            // Agrupar por método de pago
            let cashTotal = 0, cashCount = 0;
            let sinpeTotal = 0, sinpeCount = 0;
            let cardTotal = 0, cardCount = 0;
            let otherTotal = 0, otherCount = 0;

            filteredOrders.forEach(o => {
                const method = (o.metodoPago || '').toLowerCase();
                const total = o.total || 0;

                if (method.includes('efectivo')) {
                    cashTotal += total;
                    cashCount++;
                } else if (method.includes('sinpe')) {
                    sinpeTotal += total;
                    sinpeCount++;
                } else if (method.includes('tarjeta')) {
                    cardTotal += total;
                    cardCount++;
                } else {
                    otherTotal += total;
                    otherCount++;
                }
            });

            // Guardar esperados para cálculo de diferencias
            this.expectedCash = cashTotal;
            this.expectedSinpe = sinpeTotal;
            this.expectedCard = cardTotal;
            this.expectedOther = otherTotal;

            // Actualizar DOM de tarjetas
            const elCashTotal = document.getElementById('recon-cash-total');
            const elCashCount = document.getElementById('recon-cash-count');
            const elSinpeTotal = document.getElementById('recon-sinpe-total');
            const elSinpeCount = document.getElementById('recon-sinpe-count');
            const elCardTotal = document.getElementById('recon-card-total');
            const elCardCount = document.getElementById('recon-card-count');
            const elOtherTotal = document.getElementById('recon-other-total');
            const elOtherCount = document.getElementById('recon-other-count');

            if (elCashTotal) elCashTotal.innerText = `₡${cashTotal.toLocaleString()}`;
            if (elCashCount) elCashCount.innerText = `${cashCount} pedidos`;
            if (elSinpeTotal) elSinpeTotal.innerText = `₡${sinpeTotal.toLocaleString()}`;
            if (elSinpeCount) elSinpeCount.innerText = `${sinpeCount} pedidos`;
            if (elCardTotal) elCardTotal.innerText = `₡${cardTotal.toLocaleString()}`;
            if (elCardCount) elCardCount.innerText = `${cardCount} pedidos`;
            if (elOtherTotal) elOtherTotal.innerText = `₡${otherTotal.toLocaleString()}`;
            if (elOtherCount) elOtherCount.innerText = `${otherCount} pedidos`;

            // Actualizar referencias esperadas en los inputs de arqueo
            const elExpCash = document.getElementById('recon-expected-cash');
            const elExpSinpe = document.getElementById('recon-expected-sinpe');
            const elExpCard = document.getElementById('recon-expected-card');

            if (elExpCash) elExpCash.innerText = `Esp: ₡${cashTotal.toLocaleString()}`;
            if (elExpSinpe) elExpSinpe.innerText = `Esp: ₡${sinpeTotal.toLocaleString()}`;
            if (elExpCard) elExpCard.innerText = `Esp: ₡${cardTotal.toLocaleString()}`;

            this.calculateCashDifferences();
        },

        calculateCashDifferences() {
            const valCashStr = document.getElementById('recon-input-cash')?.value.trim() || '';
            const valSinpeStr = document.getElementById('recon-input-sinpe')?.value.trim() || '';
            const valCardStr = document.getElementById('recon-input-card')?.value.trim() || '';

            const inputCash = valCashStr !== '' ? parseFloat(valCashStr) : null;
            const inputSinpe = valSinpeStr !== '' ? parseFloat(valSinpeStr) : null;
            const inputCard = valCardStr !== '' ? parseFloat(valCardStr) : null;

            const expCash = this.expectedCash || 0;
            const expSinpe = this.expectedSinpe || 0;
            const expCard = this.expectedCard || 0;

            const updateBadge = (badgeId, inputVal, expectedVal) => {
                const el = document.getElementById(badgeId);
                if (!el) return 0;
                if (inputVal === null) {
                    el.className = 'diff-badge diff-badge-balanced';
                    el.innerText = `Esperado: ₡${expectedVal.toLocaleString()}`;
                    return 0;
                }
                const diff = inputVal - expectedVal;
                if (diff === 0) {
                    el.className = 'diff-badge diff-badge-balanced';
                    el.innerText = `Diferencia: ₡0 (Exacto)`;
                } else if (diff > 0) {
                    el.className = 'diff-badge diff-badge-excess';
                    el.innerText = `Diferencia: +₡${diff.toLocaleString()} (Sobrante)`;
                } else {
                    el.className = 'diff-badge diff-badge-short';
                    el.innerText = `Diferencia: -₡${Math.abs(diff).toLocaleString()} (Faltante)`;
                }
                return diff;
            };

            const diffCash = updateBadge('diff-cash-badge', inputCash, expCash);
            const diffSinpe = updateBadge('diff-sinpe-badge', inputSinpe, expSinpe);
            const diffCard = updateBadge('diff-card-badge', inputCard, expCard);

            const hasAnyInput = inputCash !== null || inputSinpe !== null || inputCard !== null;
            const totalDiff = (inputCash !== null ? diffCash : 0) + (inputSinpe !== null ? diffSinpe : 0) + (inputCard !== null ? diffCard : 0);

            const elGlobalStatus = document.getElementById('recon-global-status');
            const elGlobalDiff = document.getElementById('recon-global-diff');

            if (elGlobalDiff) {
                if (totalDiff === 0) {
                    elGlobalDiff.innerText = `₡0`;
                    elGlobalDiff.style.color = '#2ecc71';
                } else if (totalDiff > 0) {
                    elGlobalDiff.innerText = `+₡${totalDiff.toLocaleString()} (Sobrante)`;
                    elGlobalDiff.style.color = '#f1c40f';
                } else {
                    elGlobalDiff.innerText = `-₡${Math.abs(totalDiff).toLocaleString()} (Faltante)`;
                    elGlobalDiff.style.color = '#e74c3c';
                }
            }

            if (elGlobalStatus) {
                if (!hasAnyInput) {
                    elGlobalStatus.className = 'diff-badge diff-badge-balanced';
                    elGlobalStatus.innerHTML = `<i class="fas fa-info-circle"></i> Ingresa tu conteo para verificar`;
                } else if (totalDiff === 0) {
                    elGlobalStatus.className = 'diff-badge diff-badge-balanced';
                    elGlobalStatus.innerHTML = `<i class="fas fa-check-circle"></i> Caja Cuadrada al Centavo`;
                } else if (totalDiff > 0) {
                    elGlobalStatus.className = 'diff-badge diff-badge-excess';
                    elGlobalStatus.innerHTML = `<i class="fas fa-arrow-up"></i> Sobrante en Caja`;
                } else {
                    elGlobalStatus.className = 'diff-badge diff-badge-short';
                    elGlobalStatus.innerHTML = `<i class="fas fa-exclamation-triangle"></i> Faltante en Caja`;
                }
            }
        },

        async saveCashClosing() {
            const valCashStr = document.getElementById('recon-input-cash')?.value.trim() || '';
            const valSinpeStr = document.getElementById('recon-input-sinpe')?.value.trim() || '';
            const valCardStr = document.getElementById('recon-input-card')?.value.trim() || '';

            if (valCashStr === '' && valSinpeStr === '' && valCardStr === '') {
                alert("Por favor ingresa al menos un monto contado para registrar el cierre de caja.");
                return;
            }

            const countedCash = valCashStr !== '' ? parseFloat(valCashStr) : (this.expectedCash || 0);
            const countedSinpe = valSinpeStr !== '' ? parseFloat(valSinpeStr) : (this.expectedSinpe || 0);
            const countedCard = valCardStr !== '' ? parseFloat(valCardStr) : (this.expectedCard || 0);

            const expCash = this.expectedCash || 0;
            const expSinpe = this.expectedSinpe || 0;
            const expCard = this.expectedCard || 0;

            const diffCash = countedCash - expCash;
            const diffSinpe = countedSinpe - expSinpe;
            const diffCard = countedCard - expCard;
            const totalDiff = diffCash + diffSinpe + diffCard;

            const period = document.getElementById('cash-recon-period')?.value || 'hoy';
            const user = localStorage.getItem('srsrapinto_cedula') || 'admin';

            const closingData = {
                fechaHora: new Date().toISOString(),
                periodo: period,
                usuario: user,
                esperado: {
                    efectivo: expCash,
                    sinpe: expSinpe,
                    tarjeta: expCard,
                    total: expCash + expSinpe + expCard
                },
                contado: {
                    efectivo: countedCash,
                    sinpe: countedSinpe,
                    tarjeta: countedCard,
                    total: countedCash + countedSinpe + countedCard
                },
                diferencias: {
                    efectivo: diffCash,
                    sinpe: diffSinpe,
                    tarjeta: diffCard,
                    total: totalDiff
                },
                estado: totalDiff === 0 ? 'Cuadrado' : (totalDiff > 0 ? 'Sobrante' : 'Faltante')
            };

            const btn = document.getElementById('btn-save-cash-closing');
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';

            try {
                await window.FirebaseDB.collection('cierres_caja').add(closingData);
                alert(`✅ ¡Cierre de caja guardado con éxito!\n\nEstado: ${closingData.estado}\nDiferencia: ₡${totalDiff.toLocaleString()}\nRegistrado por: ${user}`);
                // Limpiar inputs
                document.getElementById('recon-input-cash').value = '';
                document.getElementById('recon-input-sinpe').value = '';
                document.getElementById('recon-input-card').value = '';
                this.calculateCashDifferences();
            } catch (err) {
                console.error("Error al guardar cierre de caja:", err);
                alert("No se pudo guardar el cierre de caja.");
            } finally {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-save"></i> Guardar Cierre de Caja';
            }
        },

        async openCashHistoryModal() {
            const modal = document.getElementById('cash-history-modal');
            const list = document.getElementById('cash-history-list');
            modal.classList.add('active');
            list.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 20px; opacity: 0.5;">Cargando historial de cierres...</td></tr>`;

            try {
                const snapshot = await window.FirebaseDB.collection('cierres_caja').orderBy('fechaHora', 'desc').limit(25).get();
                if (snapshot.empty) {
                    list.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 20px; opacity: 0.5;">No hay cierres de caja registrados aún.</td></tr>`;
                    return;
                }

                const rows = [];
                snapshot.forEach(doc => {
                    const c = doc.data();
                    const fecha = new Date(c.fechaHora).toLocaleString('es-CR');
                    const diffTotal = c.diferencias?.total || 0;
                    let badgeClass = 'diff-badge-balanced';
                    if (diffTotal > 0) badgeClass = 'diff-badge-excess';
                    else if (diffTotal < 0) badgeClass = 'diff-badge-short';

                    rows.push(`
                        <tr>
                            <td style="font-size: 0.8rem; font-weight: 700;">${fecha}</td>
                            <td>${this.sanitize(c.usuario || 'admin')}</td>
                            <td style="font-size: 0.85rem;">₡${(c.contado?.efectivo || 0).toLocaleString()} <span style="opacity: 0.5; font-size: 0.75rem;">/ ₡${(c.esperado?.efectivo || 0).toLocaleString()}</span></td>
                            <td style="font-size: 0.85rem;">₡${(c.contado?.sinpe || 0).toLocaleString()} <span style="opacity: 0.5; font-size: 0.75rem;">/ ₡${(c.esperado?.sinpe || 0).toLocaleString()}</span></td>
                            <td style="font-size: 0.85rem;">₡${(c.contado?.tarjeta || 0).toLocaleString()} <span style="opacity: 0.5; font-size: 0.75rem;">/ ₡${(c.esperado?.tarjeta || 0).toLocaleString()}</span></td>
                            <td style="font-weight: 900;"><span class="diff-badge ${badgeClass}">₡${diffTotal.toLocaleString()}</span></td>
                            <td><strong style="color: ${diffTotal === 0 ? '#2ecc71' : (diffTotal > 0 ? '#f1c40f' : '#e74c3c')};">${c.estado || 'N/A'}</strong></td>
                        </tr>
                    `);
                });
                list.innerHTML = rows.join('');
            } catch (err) {
                console.error("Error al cargar historial de cierres:", err);
                list.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 20px; color: #e74c3c;">Error al cargar historial.</td></tr>`;
            }
        },

        closeCashHistoryModal() {
            document.getElementById('cash-history-modal').classList.remove('active');
        },

        openATVGuideModal() {
            const baseCompras = document.getElementById('d105-compras-base')?.innerText || '₡0';
            const rentaEstimada = document.getElementById('d105-renta-estimada')?.innerText || '₡0';
            const ivaEstimado = document.getElementById('d105-iva-estimado')?.innerText || '₡0';

            const cleanNum = (str) => parseFloat(str.replace(/[^\d]/g, '')) || 0;
            const totalPagar = cleanNum(rentaEstimada) + cleanNum(ivaEstimado);

            const el101 = document.getElementById('atv-val-101');
            const el102 = document.getElementById('atv-val-102');
            const el202 = document.getElementById('atv-val-202');
            const el302 = document.getElementById('atv-val-302');
            const elTot = document.getElementById('atv-val-total');

            if (el101) el101.innerText = baseCompras;
            if (el102) el102.innerText = '₡0';
            if (el202) el202.innerText = ivaEstimado;
            if (el302) el302.innerText = rentaEstimada;
            if (elTot) elTot.innerText = `₡${totalPagar.toLocaleString()}`;

            document.getElementById('hacienda-atv-modal').classList.add('active');
        },

        closeATVGuideModal() {
            document.getElementById('hacienda-atv-modal').classList.remove('active');
        },

        copyToClipboard(elementId, btnElement) {
            const el = document.getElementById(elementId);
            if (!el) return;
            const textToCopy = el.innerText.replace(/[^\d]/g, '') || el.innerText;
            navigator.clipboard.writeText(textToCopy).then(() => {
                const originalHtml = btnElement.innerHTML;
                btnElement.innerHTML = '<i class="fas fa-check"></i> ¡Copiado!';
                setTimeout(() => {
                    btnElement.innerHTML = originalHtml;
                }, 2000);
            }).catch(err => {
                console.error("Error al copiar al portapapeles:", err);
                alert(`Copia manual: ${textToCopy}`);
            });
        },

        calculateD105Hacienda() {
            // Filtrar compras aplicables del trimestre fiscal actual (Costa Rica)
            const now = new Date();
            const currentQuarter = Math.floor(now.getMonth() / 3);
            const startQuarter = new Date(now.getFullYear(), currentQuarter * 3, 1, 0, 0, 0);
            const endQuarter = new Date(now.getFullYear(), (currentQuarter + 1) * 3, 0, 23, 59, 59, 999);

            const applicablePurchases = this.purchases.filter(p => {
                if (p.aplicaHacienda === false) return false;
                const pDate = new Date(p.fecha + 'T12:00:00');
                return pDate >= startQuarter && pDate <= endQuarter;
            });

            const totalPurchasesBase = applicablePurchases.reduce((sum, p) => sum + (p.total || 0), 0);

            // Actividad Económica 5610.0 (Actividades de restaurantes y de servicio móvil de comidas - Régimen Simplificado)
            // Factor Compras Renta = 10%
            // Tarifa Renta aplicable = Escala o factor típico 10% sobre la base estimada (1% efectivo sobre compras)
            // Factor Compras IVA = 10%
            const factorComprasRenta = 0.10;
            const factorComprasIVA = 0.10;
            const tarifaGeneralIVA = 0.13;

            // Renta estimada: Compras x Factor (10%) x Tarifa (estimado promedio)
            const baseImponibleRenta = totalPurchasesBase * factorComprasRenta;
            const rentaEstimada = Math.round(baseImponibleRenta * 0.10); // Tarifa estimada del régimen

            // IVA estimado: Compras x Factor Compras (10%) x 13%
            const ivaEstimado = Math.round(totalPurchasesBase * factorComprasIVA * tarifaGeneralIVA);

            const elBase = document.getElementById('d105-compras-base');
            const elRenta = document.getElementById('d105-renta-estimada');
            const elIVA = document.getElementById('d105-iva-estimado');

            if (elBase) elBase.innerText = `₡${totalPurchasesBase.toLocaleString()}`;
            if (elRenta) elRenta.innerText = `₡${rentaEstimada.toLocaleString()}`;
            if (elIVA) elIVA.innerText = `₡${ivaEstimado.toLocaleString()}`;
        },

        renderLegalObligations() {
            const container = document.getElementById('finances-legal-container');
            if (!container) return;

            if (this.legalObligations.length === 0) {
                container.innerHTML = `<p style="opacity: 0.5; font-size: 0.85rem; grid-column: 1 / -1; text-align: center; padding: 20px;">No hay recordatorios de pago registrados.</p>`;
                return;
            }

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            // Ordenar por fecha de vencimiento
            const sorted = [...this.legalObligations].sort((a, b) => new Date(a.fechaVencimiento || '') - new Date(b.fechaVencimiento || ''));

            const iconsMap = {
                'Luz': '💡',
                'Agua': '💧',
                'CCSS': '🏥',
                'INS': '🛡️',
                'Patente': '🏛️',
                'Hacienda D-105': '📋',
                'Alquiler': '🏠',
                'Internet': '📶',
                'Otro': '📌'
            };

            const recurrenceMap = {
                'dia_15': '📅 Vence el 15 de cada mes',
                'mensual': '📅 Mensual (Fin de mes)',
                'trimestral': '📅 Trimestral',
                'semestral': '📅 Semestral',
                'anual': '📅 Anual',
                'unica': '📌 Fecha única'
            };

            container.innerHTML = sorted.map(item => {
                const icon = iconsMap[item.tipo] || '📌';
                const dueDate = new Date(item.fechaVencimiento + 'T00:00:00');
                const diffTime = dueDate - today;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                let statusClass = 'status-aldia';
                let statusLabel = `${diffDays} días restantes`;

                if (item.pagado) {
                    statusClass = 'status-aldia';
                    statusLabel = '<i class="fas fa-check"></i> Pagado';
                } else if (isNaN(diffDays)) {
                    statusClass = 'status-porvencer';
                    statusLabel = '<i class="fas fa-clock"></i> Fecha por definir';
                } else if (diffDays < 0) {
                    statusClass = 'status-vencido';
                    statusLabel = `<i class="fas fa-exclamation-triangle"></i> Vencido hace ${Math.abs(diffDays)}d`;
                } else if (diffDays <= 5) {
                    statusClass = 'status-porvencer';
                    statusLabel = `<i class="fas fa-clock"></i> Vence en ${diffDays}d`;
                }

                const recLabel = recurrenceMap[item.recurrencia] || (item.recurrencia === 'dia_15' ? '📅 Día 15 de cada mes' : '');

                return `
                    <div class="legal-card" style="display: flex; flex-direction: column; justify-content: space-between; gap: 12px; border: 1px solid var(--border); border-radius: 10px; padding: 14px; background: rgba(0,0,0,0.35);">
                        <div>
                            <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <span style="font-size: 1.3rem;">${icon}</span>
                                    <div>
                                        <span style="font-size: 0.72rem; color: rgba(255,255,255,0.5); text-transform: uppercase; font-weight: bold; display: block;">
                                            ${this.sanitize(item.tipo)}
                                        </span>
                                        <strong style="font-size: 0.95rem; color: white;">
                                            ${this.sanitize(item.titulo)}
                                        </strong>
                                    </div>
                                </div>
                                <span class="legal-status-pill ${statusClass}" style="flex-shrink: 0;">${statusLabel}</span>
                            </div>

                            <div style="margin-top: 10px; font-size: 0.8rem; color: var(--mostaza); display: flex; flex-wrap: wrap; gap: 8px; align-items: center;">
                                <span>Vence: <strong>${item.fechaVencimiento || 'Por definir'}</strong></span>
                                ${item.monto ? `<span>• Monto: <strong>₡${item.monto.toLocaleString()}</strong></span>` : ''}
                            </div>

                            ${recLabel ? `<div style="font-size: 0.72rem; color: #f1c40f; background: rgba(241, 196, 15, 0.1); padding: 3px 8px; border-radius: 4px; display: inline-block; margin-top: 6px;">${recLabel}</div>` : ''}
                            ${item.notas ? `<div style="font-size: 0.74rem; color: rgba(255,255,255,0.6); margin-top: 6px; line-height: 1.3;"><i class="fas fa-sticky-note" style="color: rgba(255,255,255,0.4); margin-right: 4px;"></i>${this.sanitize(item.notas)}</div>` : ''}
                        </div>

                        <div style="border-top: 1px dashed var(--border); padding-top: 10px; display: flex; justify-content: space-between; align-items: center; gap: 8px;">
                            <button onclick="FinancesManager.toggleLegalPaid('${item.id}', ${!item.pagado})" style="background: ${item.pagado ? 'rgba(46, 204, 113, 0.15)' : 'transparent'}; border: 1px solid ${item.pagado ? '#2ecc71' : 'var(--border)'}; color: ${item.pagado ? '#2ecc71' : 'rgba(255,255,255,0.85)'}; padding: 4px 10px; border-radius: 6px; font-size: 0.75rem; cursor: pointer; display: flex; align-items: center; gap: 5px;">
                                <i class="fas fa-${item.pagado ? 'check-circle' : 'circle'}"></i> ${item.pagado ? 'Pagado' : 'Marcar Pagado'}
                            </button>
                            <div style="display: flex; gap: 6px;">
                                <button class="action-btn" onclick="FinancesManager.openLegalModal('${item.id}')" title="Editar recordatorio">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="action-btn" onclick="FinancesManager.deleteLegalObligation('${item.id}', '${this.sanitize(item.titulo)}')" style="color: var(--alerta);" title="Eliminar">
                                    <i class="fas fa-trash-alt"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        },

        async toggleLegalPaid(id, newState) {
            try {
                await window.FirebaseDB.collection('obligaciones_legales').doc(id).update({
                    pagado: newState,
                    fechaPago: newState ? new Date().toISOString() : null
                });
            } catch (err) {
                console.error("Error al actualizar estado de obligación:", err);
            }
        },

        openLegalModal(id = null) {
            const modal = document.getElementById('finance-legal-modal');
            const titleEl = document.getElementById('finance-legal-modal-title');
            document.getElementById('fin-legal-id').value = id || '';

            if (id) {
                const item = this.legalObligations.find(o => o.id === id);
                if (item) {
                    if (titleEl) titleEl.innerHTML = `<i class="fas fa-edit" style="color: #e67e22;"></i> Editar Recordatorio: ${this.sanitize(item.titulo)}`;
                    document.getElementById('fin-legal-type').value = item.tipo || 'Luz';
                    document.getElementById('fin-legal-title').value = item.titulo || '';
                    document.getElementById('fin-legal-duedate').value = item.fechaVencimiento || '';
                    document.getElementById('fin-legal-recurrence').value = item.recurrencia || 'mensual';
                    document.getElementById('fin-legal-amount').value = item.monto || '';
                    document.getElementById('fin-legal-notes').value = item.notas || '';
                }
            } else {
                if (titleEl) titleEl.innerHTML = `<i class="fas fa-bell" style="color: #e67e22;"></i> Nuevo Recordatorio de Pago / Servicio`;
                document.getElementById('fin-legal-type').value = 'Luz';
                document.getElementById('fin-legal-title').value = 'Recibo de Luz Eléctrica (CNFL / ICE)';
                
                // Preconfigurar fecha de la luz para el 15 de este mes o el próximo
                const now = new Date();
                const dueMonth = now.getDate() > 15 ? now.getMonth() + 1 : now.getMonth();
                const next15 = new Date(now.getFullYear(), dueMonth, 15);
                document.getElementById('fin-legal-duedate').value = next15.toISOString().split('T')[0];
                document.getElementById('fin-legal-recurrence').value = 'dia_15';
                document.getElementById('fin-legal-amount').value = '';
                document.getElementById('fin-legal-notes').value = 'Vence el 15 de cada mes';
            }

            modal.classList.add('active');
        },

        handleLegalTypeChange() {
            const type = document.getElementById('fin-legal-type').value;
            const titleInput = document.getElementById('fin-legal-title');
            const recSelect = document.getElementById('fin-legal-recurrence');
            const notesInput = document.getElementById('fin-legal-notes');
            const dateInput = document.getElementById('fin-legal-duedate');

            const now = new Date();
            if (type === 'Luz') {
                titleInput.value = 'Recibo de Luz Eléctrica (CNFL / ICE)';
                recSelect.value = 'dia_15';
                notesInput.value = 'Vence el 15 de cada mes';
                const dueMonth = now.getDate() > 15 ? now.getMonth() + 1 : now.getMonth();
                dateInput.value = new Date(now.getFullYear(), dueMonth, 15).toISOString().split('T')[0];
            } else if (type === 'Agua') {
                titleInput.value = 'Recibo de Agua Potable (AyA / ESPH)';
                recSelect.value = 'mensual';
                notesInput.value = 'Fecha por confirmar / Fin de mes';
                dateInput.value = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
            } else if (type === 'CCSS') {
                titleInput.value = 'Planilla Mensual CCSS';
                recSelect.value = 'mensual';
                notesInput.value = 'Último día hábil de mes';
            } else if (type === 'INS') {
                titleInput.value = 'Póliza Riesgos del Trabajo INS';
                recSelect.value = 'semestral';
                notesInput.value = 'Póliza de Riesgos de Trabajo';
            } else if (type === 'Patente') {
                titleInput.value = 'Patente Municipal Comercial';
                recSelect.value = 'trimestral';
                notesInput.value = 'Pago trimestral municipal';
            } else if (type === 'Hacienda D-105') {
                titleInput.value = 'Declaración Trimestral Tributación (D-105)';
                recSelect.value = 'trimestral';
                notesInput.value = 'Régimen Simplificado (5610.0)';
            } else if (type === 'Alquiler') {
                titleInput.value = 'Alquiler de Local / Cocina';
                recSelect.value = 'mensual';
            } else if (type === 'Internet') {
                titleInput.value = 'Servicio de Internet y Telefonía';
                recSelect.value = 'mensual';
            }
        },

        closeLegalModal() {
            document.getElementById('finance-legal-modal').classList.remove('active');
        },

        async saveLegalObligation() {
            const id = document.getElementById('fin-legal-id').value;
            const tipo = document.getElementById('fin-legal-type').value;
            const titulo = document.getElementById('fin-legal-title').value.trim();
            const fechaVencimiento = document.getElementById('fin-legal-duedate').value;
            const recurrencia = document.getElementById('fin-legal-recurrence').value;
            const monto = parseFloat(document.getElementById('fin-legal-amount').value) || 0;
            const notas = document.getElementById('fin-legal-notes').value.trim();

            if (!titulo) {
                alert("Por favor completa el nombre o descripción del servicio.");
                return;
            }

            const data = {
                tipo,
                titulo,
                fechaVencimiento: fechaVencimiento || '',
                recurrencia,
                monto,
                notas,
                actualizadoEn: new Date().toISOString()
            };

            try {
                const db = window.FirebaseDB;
                if (id) {
                    await db.collection('obligaciones_legales').doc(id).update(data);
                } else {
                    data.pagado = false;
                    data.creadoEn = new Date().toISOString();
                    await db.collection('obligaciones_legales').add(data);
                }
                this.closeLegalModal();
            } catch (err) {
                console.error("Error al guardar recordatorio:", err);
                alert("No se pudo guardar el recordatorio.");
            }
        },

        async deleteLegalObligation(id, name) {
            if (!confirm(`¿Deseas eliminar el recordatorio de "${name}"?`)) return;
            try {
                await window.FirebaseDB.collection('obligaciones_legales').doc(id).delete();
            } catch (err) {
                console.error("Error al eliminar obligación:", err);
                alert("No se pudo eliminar el recordatorio.");
            }
        },

        loadPurchasesReport() {
            const period = document.getElementById('fin-period-select')?.value || 'trimestre_actual';
            const now = new Date();
            let startDate = new Date();
            let endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
            let filterActive = true;

            if (period === 'hoy') {
                startDate.setHours(0, 0, 0, 0);
            } else if (period === 'semana_actual') {
                const day = now.getDay() || 7;
                startDate.setDate(now.getDate() - day + 1);
                startDate.setHours(0, 0, 0, 0);
            } else if (period === 'mes_actual') {
                startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
            } else if (period === 'trimestre_actual') {
                const currentQuarter = Math.floor(now.getMonth() / 3);
                startDate = new Date(now.getFullYear(), currentQuarter * 3, 1, 0, 0, 0);
            } else {
                filterActive = false;
            }

            const filtered = this.purchases.filter(p => {
                if (!filterActive) return true;
                const pDate = new Date(p.fecha + 'T12:00:00');
                return pDate >= startDate && pDate <= endDate;
            });

            this.renderPurchasesTable(filtered);
            this.updateHaciendaSummary(filtered);
            this.calculateD105Hacienda();
        },

        updateHaciendaSummary(filtered) {
            const applicablePurchases = filtered.filter(p => p.aplicaHacienda !== false);
            const total = applicablePurchases.reduce((sum, p) => sum + (p.total || 0), 0);
            const foodCats = ['Carnes y Embutidos', 'Lácteos y Huevos', 'Abarrotes y Granos', 'Verduras y Frutas', 'Bebidas y Café'];
            const foodTotal = applicablePurchases.filter(p => foodCats.includes(p.categoria)).reduce((sum, p) => sum + (p.total || 0), 0);
            const operTotal = total - foodTotal;

            const elTotal = document.getElementById('hacienda-total-purchases');
            const elFood = document.getElementById('hacienda-food-purchases');
            const elOper = document.getElementById('hacienda-oper-purchases');
            const elCount = document.getElementById('hacienda-invoices-count');

            if (elTotal) elTotal.innerText = `₡${total.toLocaleString()}`;
            if (elFood) elFood.innerText = `₡${foodTotal.toLocaleString()}`;
            if (elOper) elOper.innerText = `₡${operTotal.toLocaleString()}`;
            if (elCount) elCount.innerText = applicablePurchases.length;
        },

        renderPurchasesTable(list) {
            const container = document.getElementById('fin-purchases-list');
            if (!container) return;

            if (list.length === 0) {
                container.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 20px; opacity: 0.5;">No hay compras en el período seleccionado.</td></tr>`;
                return;
            }

            container.innerHTML = list.map(p => {
                const aplica = p.aplicaHacienda !== false;
                return `
                    <tr>
                        <td style="font-size: 0.85rem; font-weight: 700;">${p.fecha}</td>
                        <td>
                            <strong>${this.sanitize(p.proveedor)}</strong>
                            ${p.notas ? `<div style="font-size: 0.75rem; color: rgba(255,255,255,0.5);">${this.sanitize(p.notas)}</div>` : ''}
                        </td>
                        <td style="font-family: monospace; font-size: 0.85rem; color: var(--mostaza);">${this.sanitize(p.factura || 'N/A')}</td>
                        <td><span style="background: rgba(255,255,255,0.06); padding: 3px 8px; border-radius: 4px; font-size: 0.75rem;">${this.sanitize(p.categoria)}</span></td>
                        <td style="font-weight: 900; color: #2ecc71;">₡${(p.total || 0).toLocaleString()}</td>
                        <td>
                            <button onclick="FinancesManager.toggleTaxApplicable('${p.id}', ${!aplica})" style="background: ${aplica ? 'rgba(46, 204, 113, 0.2)' : 'rgba(231, 76, 60, 0.2)'}; border: 1px solid ${aplica ? '#2ecc71' : '#e74c3c'}; color: ${aplica ? '#2ecc71' : '#e74c3c'}; padding: 3px 8px; border-radius: 6px; font-size: 0.75rem; cursor: pointer; font-weight: bold;">
                                ${aplica ? '✓ Sí (D-105)' : '✗ Solo Interno'}
                            </button>
                        </td>
                        <td style="font-size: 0.8rem; opacity: 0.7;">${this.sanitize(p.registradoPor || 'admin')}</td>
                        <td>
                            <button class="action-btn" onclick="FinancesManager.deletePurchase('${p.id}', '${this.sanitize(p.proveedor)}', ${p.total})" style="color: var(--alerta);" title="Eliminar">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        </td>
                    </tr>
                `;
            }).join('');
        },

        async toggleTaxApplicable(id, newState) {
            try {
                await window.FirebaseDB.collection('compras').doc(id).update({
                    aplicaHacienda: newState
                });
            } catch (err) {
                console.error("Error al actualizar deducibilidad tributaria:", err);
            }
        },

        openAddPurchaseModal() {
            document.getElementById('finance-purchase-modal').classList.add('active');
            document.getElementById('fin-purchase-date').value = new Date().toISOString().split('T')[0];
            document.getElementById('fin-purchase-supplier').value = '';
            document.getElementById('fin-purchase-invoice').value = '';
            document.getElementById('fin-purchase-total').value = '';
            document.getElementById('fin-purchase-notes').value = '';
            const taxCheck = document.getElementById('fin-purchase-tax-applicable');
            if (taxCheck) taxCheck.checked = true;
        },

        closeAddPurchaseModal() {
            document.getElementById('finance-purchase-modal').classList.remove('active');
        },

        async savePurchase() {
            const fecha = document.getElementById('fin-purchase-date').value;
            const categoria = document.getElementById('fin-purchase-cat').value;
            const proveedor = document.getElementById('fin-purchase-supplier').value.trim();
            const factura = document.getElementById('fin-purchase-invoice').value.trim();
            const total = parseFloat(document.getElementById('fin-purchase-total').value);
            const notas = document.getElementById('fin-purchase-notes').value.trim();
            const aplicaHacienda = document.getElementById('fin-purchase-tax-applicable')?.checked !== false;

            if (!fecha || !proveedor || isNaN(total) || total <= 0) {
                alert("Por favor completa la fecha, proveedor y un monto total válido.");
                return;
            }

            const purchaseData = {
                fecha,
                categoria,
                proveedor,
                factura: factura || 'S/N',
                total,
                notas,
                aplicaHacienda,
                registradoPor: localStorage.getItem('srsrapinto_cedula') || 'admin',
                creadoEn: new Date().toISOString()
            };

            const btn = document.getElementById('btn-save-purchase');
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';

            try {
                await window.FirebaseDB.collection('compras').add(purchaseData);
                this.closeAddPurchaseModal();
            } catch (err) {
                console.error("Error al registrar compra:", err);
                alert("Hubo un error al guardar la compra.");
            } finally {
                btn.disabled = false;
                btn.innerHTML = 'Guardar Compra';
            }
        },

        async deletePurchase(id, proveedor, monto) {
            if (!confirm(`¿Deseas eliminar la compra de "${proveedor}" por ₡${(monto || 0).toLocaleString()}?`)) return;
            try {
                await window.FirebaseDB.collection('compras').doc(id).delete();
            } catch (err) {
                console.error("Error al eliminar compra:", err);
                alert("No se pudo eliminar la compra.");
            }
        },

        getFilteredPurchasesList() {
            const period = document.getElementById('fin-period-select')?.value || 'trimestre_actual';
            const now = new Date();
            let startDate = new Date();
            let endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
            let filterActive = true;

            if (period === 'hoy') {
                startDate.setHours(0, 0, 0, 0);
            } else if (period === 'semana_actual') {
                const day = now.getDay() || 7;
                startDate.setDate(now.getDate() - day + 1);
                startDate.setHours(0, 0, 0, 0);
            } else if (period === 'mes_actual') {
                startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
            } else if (period === 'trimestre_actual') {
                const currentQuarter = Math.floor(now.getMonth() / 3);
                startDate = new Date(now.getFullYear(), currentQuarter * 3, 1, 0, 0, 0);
            } else {
                filterActive = false;
            }

            return this.purchases.filter(p => {
                if (!filterActive) return true;
                const pDate = new Date(p.fecha + 'T12:00:00');
                return pDate >= startDate && pDate <= endDate;
            }).sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
        },

        exportPurchasesPDF() {
            const list = this.getFilteredPurchasesList();
            if (list.length === 0) {
                alert("No hay facturas de compra registradas en el período seleccionado para generar el Libro de Compras.");
                return;
            }

            const periodText = document.getElementById('fin-period-select')?.selectedOptions[0]?.text || 'Período Seleccionado';
            const totalGeneral = list.reduce((sum, p) => sum + (p.total || 0), 0);
            const computables = list.filter(p => p.aplicaHacienda !== false);
            const totalComputable = computables.reduce((sum, p) => sum + (p.total || 0), 0);
            const totalNoComputable = totalGeneral - totalComputable;
            const ivaEstimado = Math.round(totalComputable * 0.10 * 0.13);
            const rentaEstimada = Math.round(totalComputable * 0.10 * 0.10);

            const rowsHtml = list.map((p, index) => {
                const aplica = p.aplicaHacienda !== false;
                return `
                    <tr style="background: ${index % 2 === 0 ? '#ffffff' : '#fcfcfc'};">
                        <td style="border: 1px solid #ddd; padding: 6px 8px; text-align: center; font-size: 10px;">${index + 1}</td>
                        <td style="border: 1px solid #ddd; padding: 6px 8px; font-size: 10px; font-weight: bold; white-space: nowrap;">${p.fecha}</td>
                        <td style="border: 1px solid #ddd; padding: 6px 8px; font-size: 10px;">
                            <strong>${this.sanitize(p.proveedor)}</strong>
                        </td>
                        <td style="border: 1px solid #ddd; padding: 6px 8px; font-size: 10px; font-family: monospace; color: #7f8c8d;">${this.sanitize(p.factura || 'S/N')}</td>
                        <td style="border: 1px solid #ddd; padding: 6px 8px; font-size: 10px;">${this.sanitize(p.categoria)}</td>
                        <td style="border: 1px solid #ddd; padding: 6px 8px; font-size: 10px; color: #555;">${this.sanitize(p.notas || 'Gasto de insumos / operación')}</td>
                        <td style="border: 1px solid #ddd; padding: 6px 8px; text-align: center; font-size: 10px; font-weight: bold; color: ${aplica ? '#27ae60' : '#888'};">
                            ${aplica ? 'SÍ (D-105)' : 'NO (Interno)'}
                        </td>
                        <td style="border: 1px solid #ddd; padding: 6px 8px; text-align: right; font-size: 10px; font-weight: bold; color: #2c3e50;">₡${(p.total || 0).toLocaleString()}</td>
                    </tr>
                `;
            }).join('');

            const printContent = `
                <div style="font-family: Arial, sans-serif; color: #222; padding: 15px; line-height: 1.4;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #800020; padding-bottom: 12px; margin-bottom: 15px;">
                        <div>
                            <h1 style="color: #800020; margin: 0; font-size: 20px; text-transform: uppercase; letter-spacing: 0.5px;">Sr. & Sra. Pinto</h1>
                            <div style="font-size: 11px; color: #666; margin-top: 2px;">El Sabor de ser Tico • Servicios de Alimentación</div>
                            <div style="font-size: 13px; font-weight: bold; margin-top: 6px; color: #111;">LIBRO OFICIAL DE COMPRAS E INSUMOS</div>
                            <div style="font-size: 11px; color: #444;">Actividad Económica 5610.0 • Régimen de Tributación Simplificada (Tribu CR)</div>
                        </div>
                        <div style="text-align: right; font-size: 11px; color: #444;">
                            <div><strong>Período:</strong> ${periodText}</div>
                            <div><strong>Fecha de Emisión:</strong> ${new Date().toLocaleString('es-CR')}</div>
                            <div><strong>Total de Comprobantes:</strong> ${list.length}</div>
                            <div style="margin-top: 4px;"><span style="background: #e8f8f5; color: #27ae60; font-weight: bold; padding: 2px 6px; border-radius: 4px; border: 1px solid #27ae60;">REGISTRO AL DÍA</span></div>
                        </div>
                    </div>

                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 18px;">
                        <thead>
                            <tr style="background: #800020; color: white; font-size: 10px; text-transform: uppercase;">
                                <th style="border: 1px solid #800020; padding: 6px 8px; width: 25px; text-align: center;">#</th>
                                <th style="border: 1px solid #800020; padding: 6px 8px; width: 75px; text-align: left;">Fecha</th>
                                <th style="border: 1px solid #800020; padding: 6px 8px; text-align: left;">Proveedor / Razón Social</th>
                                <th style="border: 1px solid #800020; padding: 6px 8px; text-align: left;">Factura / Clave Electrónica</th>
                                <th style="border: 1px solid #800020; padding: 6px 8px; text-align: left;">Categoría</th>
                                <th style="border: 1px solid #800020; padding: 6px 8px; text-align: left;">Concepto / Justificación</th>
                                <th style="border: 1px solid #800020; padding: 6px 8px; width: 85px; text-align: center;">Aplica D-105</th>
                                <th style="border: 1px solid #800020; padding: 6px 8px; width: 95px; text-align: right;">Monto Total (₡)</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${rowsHtml}
                        </tbody>
                    </table>

                    <div style="display: flex; gap: 15px; margin-bottom: 15px;">
                        <div style="flex: 1; background: #f4fbf6; border: 1px solid #c3e6cb; border-radius: 6px; padding: 12px; font-size: 11px;">
                            <strong style="color: #155724; display: block; margin-bottom: 8px; font-size: 12px;">LIQUIDACIÓN TRIBUTARIA TRIBU CR (D-105)</strong>
                            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                                <span>Total Compras Computables (Casilla 101):</span>
                                <strong>₡${totalComputable.toLocaleString()}</strong>
                            </div>
                            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                                <span>Impuesto IVA Determinado (1.30% s/compras):</span>
                                <strong style="color: #2980b9;">₡${ivaEstimado.toLocaleString()}</strong>
                            </div>
                            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                                <span>Impuesto Renta Determinado (1.00% s/compras):</span>
                                <strong style="color: #d35400;">₡${rentaEstimada.toLocaleString()}</strong>
                            </div>
                            <div style="display: flex; justify-content: space-between; border-top: 1px solid #b1dfbb; padding-top: 5px; margin-top: 5px; font-size: 12px;">
                                <span>Total a Pagar en Conectividad Bancaria:</span>
                                <strong style="color: #27ae60; font-size: 13px;">₡${(ivaEstimado + rentaEstimada).toLocaleString()}</strong>
                            </div>
                        </div>

                        <div style="flex: 1; background: #fdfefe; border: 1px solid #e2e3e5; border-radius: 6px; padding: 12px; font-size: 11px;">
                            <strong style="color: #383d41; display: block; margin-bottom: 8px; font-size: 12px;">RESUMEN Y CONTROL DE TOPE ANUAL</strong>
                            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                                <span>Total General de Facturas Registradas:</span>
                                <strong>₡${totalGeneral.toLocaleString()}</strong>
                            </div>
                            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                                <span>Compras con Respaldo Tributario:</span>
                                <span>₡${totalComputable.toLocaleString()}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                                <span>Gastos Operativos Solo Internos:</span>
                                <span>₡${totalNoComputable.toLocaleString()}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; border-top: 1px solid #e2e3e5; padding-top: 5px; margin-top: 5px;">
                                <span>Tope Anual Régimen Simplificado (186 SB):</span>
                                <strong style="color: #2c3e50;">~₡85,969,200</strong>
                            </div>
                        </div>
                    </div>

                    <div style="font-size: 8.5px; color: #777; border-top: 1px solid #ddd; padding-top: 8px; text-align: justify; line-height: 1.3;">
                        Certificación y Respaldo: El presente Libro de Compras Digital constituye el registro formal cronológico exigido por la Dirección General de Tributación (Ministerio de Hacienda de Costa Rica) para contribuyentes bajo el Régimen de Tributación Simplificada, Código de Actividad 5610.0 (Servicios de comidas y bebidas), amparado en los Artículos 22 y 27 del Reglamento a la Ley del Impuesto sobre el Valor Agregado y el Artículo 88 del Código de Normas y Procedimientos Tributarios.
                    </div>
                </div>
            `;

            const opt = {
                margin: [6, 6, 6, 6],
                filename: `Libro_de_Compras_Sr_Sra_Pinto_${new Date().toISOString().split('T')[0]}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2 },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
            };

            if (window.html2pdf) {
                window.html2pdf().set(opt).from(printContent).save();
            } else {
                const win = window.open('', '_blank');
                win.document.write(printContent);
                win.document.close();
                win.print();
            }
        },

        exportPurchasesCSV() {
            const list = this.getFilteredPurchasesList();
            if (list.length === 0) {
                alert("No hay facturas para exportar en el período seleccionado.");
                return;
            }

            let csv = "\uFEFF"; // BOM para acentos en Excel
            csv += "Consecutivo,Fecha,Proveedor,Factura / Clave,Categoria,Concepto / Justificacion,Aplica D-105,Monto Total (CRC)\n";

            list.forEach((p, idx) => {
                const escapeCsv = (str) => `"${(str || '').toString().replace(/"/g, '""')}"`;
                const aplica = p.aplicaHacienda !== false ? 'SI' : 'NO';
                csv += [
                    idx + 1,
                    escapeCsv(p.fecha),
                    escapeCsv(p.proveedor),
                    escapeCsv(p.factura),
                    escapeCsv(p.categoria),
                    escapeCsv(p.notas),
                    aplica,
                    p.total || 0
                ].join(",") + "\n";
            });

            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Libro_de_Compras_Sr_Sra_Pinto_${new Date().toISOString().split('T')[0]}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        },

        // ==========================================
        // MÓDULO DE SALARIOS Y NÓMINA SEMANAL
        // ==========================================
        openAddSalaryModal() {
            document.getElementById('finance-salary-modal').classList.add('active');
            document.getElementById('fin-salary-date').value = new Date().toISOString().split('T')[0];
            document.getElementById('fin-salary-employee').value = '';
            document.getElementById('fin-salary-period').value = 'Semana en curso';
            document.getElementById('fin-salary-amount').value = '';
            document.getElementById('fin-salary-notes').value = '';
        },

        closeAddSalaryModal() {
            document.getElementById('finance-salary-modal').classList.remove('active');
        },

        async saveSalary() {
            const fechaPago = document.getElementById('fin-salary-date').value;
            const empleado = document.getElementById('fin-salary-employee').value.trim();
            const periodo = document.getElementById('fin-salary-period').value.trim();
            const metodo = document.getElementById('fin-salary-method').value;
            const monto = parseFloat(document.getElementById('fin-salary-amount').value);
            const notas = document.getElementById('fin-salary-notes').value.trim();

            if (!fechaPago || !empleado || isNaN(monto) || monto <= 0) {
                alert("Por favor completa la fecha, colaborador y un monto válido.");
                return;
            }

            const salaryData = {
                fechaPago,
                empleado,
                periodo: periodo || 'Semanal',
                metodo,
                monto,
                notas,
                registradoPor: localStorage.getItem('srsrapinto_cedula') || 'admin',
                creadoEn: new Date().toISOString()
            };

            const btn = document.getElementById('btn-save-salary');
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';

            try {
                await window.FirebaseDB.collection('salarios').add(salaryData);
                this.closeAddSalaryModal();
            } catch (err) {
                console.error("Error al guardar salario:", err);
                alert("No se pudo registrar el pago de salario.");
            } finally {
                btn.disabled = false;
                btn.innerHTML = 'Guardar Pago';
            }
        },

        renderSalariesTable() {
            const container = document.getElementById('fin-salaries-list');
            if (!container) return;

            if (this.salaries.length === 0) {
                container.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 20px; opacity: 0.5;">No hay pagos de salarios registrados.</td></tr>`;
                return;
            }

            container.innerHTML = this.salaries.map(s => {
                return `
                    <tr>
                        <td style="font-size: 0.85rem; font-weight: 700;">${s.fechaPago}</td>
                        <td><strong>${this.sanitize(s.empleado)}</strong></td>
                        <td style="font-size: 0.85rem; color: rgba(255,255,255,0.7);">${this.sanitize(s.periodo)}</td>
                        <td><span style="background: rgba(255,255,255,0.06); padding: 3px 8px; border-radius: 4px; font-size: 0.75rem;">${this.sanitize(s.metodo)}</span></td>
                        <td style="font-weight: 900; color: #e67e22;">₡${(s.monto || 0).toLocaleString()}</td>
                        <td style="font-size: 0.8rem; opacity: 0.7;">${this.sanitize(s.notas || 'N/A')}</td>
                        <td>
                            <button class="action-btn" onclick="FinancesManager.printSalaryReceipt('${s.id}')" style="color: #3498db; margin-right: 6px;" title="Descargar / Imprimir Comprobante Laboral">
                                <i class="fas fa-file-invoice-dollar"></i>
                            </button>
                            <button class="action-btn" onclick="FinancesManager.openEmailSalaryModal('${s.id}')" style="color: #2ecc71; margin-right: 6px;" title="Enviar Comprobante por Correo (Respaldo)">
                                <i class="fas fa-envelope"></i>
                            </button>
                            <button class="action-btn" onclick="FinancesManager.deleteSalary('${s.id}', '${this.sanitize(s.empleado)}', ${s.monto})" style="color: var(--alerta);" title="Eliminar">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        </td>
                    </tr>
                `;
            }).join('');
        },

        printSalaryReceipt(id) {
            const salary = this.salaries.find(s => s.id === id);
            if (!salary) return;

            const printContent = `
                <div style="font-family: Arial, sans-serif; padding: 30px; color: #000; max-width: 650px; margin: 0 auto; border: 1px solid #ccc; border-radius: 8px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #333; padding-bottom: 12px; margin-bottom: 15px;">
                        <div>
                            <h2 style="margin: 0; color: #990022; text-transform: uppercase;">Sr. & Sra. Pinto</h2>
                            <p style="margin: 3px 0 0 0; font-size: 11px; color: #666;">El Sabor de ser Tico • Servicios de Alimentación</p>
                        </div>
                        <div style="text-align: right;">
                            <span style="display: inline-block; background: #eee; padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 11px;">COMPROBANTE DE PAGO</span>
                            <div style="font-size: 11px; color: #555; margin-top: 4px;">Fecha: ${salary.fechaPago}</div>
                        </div>
                    </div>

                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 13px;">
                        <tr>
                            <td style="padding: 6px; border: 1px solid #ddd; font-weight: bold; background: #f9f9f9; width: 35%;">Colaborador:</td>
                            <td style="padding: 6px; border: 1px solid #ddd;">${this.sanitize(salary.empleado)}</td>
                        </tr>
                        <tr>
                            <td style="padding: 6px; border: 1px solid #ddd; font-weight: bold; background: #f9f9f9;">Período Laborado:</td>
                            <td style="padding: 6px; border: 1px solid #ddd;">${this.sanitize(salary.periodo)}</td>
                        </tr>
                        <tr>
                            <td style="padding: 6px; border: 1px solid #ddd; font-weight: bold; background: #f9f9f9;">Método de Pago:</td>
                            <td style="padding: 6px; border: 1px solid #ddd;">${this.sanitize(salary.metodo)}</td>
                        </tr>
                        <tr>
                            <td style="padding: 6px; border: 1px solid #ddd; font-weight: bold; background: #f9f9f9;">Detalle / Observaciones:</td>
                            <td style="padding: 6px; border: 1px solid #ddd;">${this.sanitize(salary.notas || 'Sin observaciones')}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold; background: #e8f8f5; font-size: 14px;">Total Neto Cancelado:</td>
                            <td style="padding: 8px; border: 1px solid #ddd; font-weight: 900; color: #27ae60; font-size: 16px;">₡${(salary.monto || 0).toLocaleString()}</td>
                        </tr>
                    </table>

                    <div style="margin-top: 40px; display: flex; justify-content: space-around; text-align: center;">
                        <div style="width: 45%;">
                            <div style="border-top: 1px solid #000; padding-top: 6px; font-size: 11px;">
                                <strong>Firma del Colaborador</strong><br>
                                Recibí conforme a satisfacción
                            </div>
                        </div>
                        <div style="width: 45%;">
                            <div style="border-top: 1px solid #000; padding-top: 6px; font-size: 11px;">
                                <strong>Por Sr. & Sra. Pinto</strong><br>
                                Patrono / Administrador
                            </div>
                        </div>
                    </div>
                </div>
            `;

            const win = window.open('', '_blank');
            win.document.write(printContent);
            win.document.close();
            win.print();
        },

        openEmailSalaryModal(id) {
            const salary = this.salaries.find(s => s.id === id);
            if (!salary) return;

            document.getElementById('email-salary-id').value = id;
            document.getElementById('email-salary-to').value = salary.correoEnviadoA || '';
            document.getElementById('email-salary-subject').value = `Comprobante de Pago de Salario - ${salary.empleado} (${salary.fechaPago}) - Sr. & Sra. Pinto`;

            const bodyText = `Estimado(a) ${salary.empleado},

Por medio del presente correo se le hace entrega formal de su comprobante de pago de salario correspondiente al período laborado en Sr. & Sra. Pinto.

==================================================
COMPROBANTE DE PAGO DE SALARIO
==================================================
• Empresa: Sr. & Sra. Pinto (Servicios de Alimentación)
• Colaborador: ${salary.empleado}
• Fecha de Pago: ${salary.fechaPago}
• Período Laborado: ${salary.periodo}
• Método de Pago: ${salary.metodo}
• Detalle / Observaciones: ${salary.notas || 'Sin observaciones'}
--------------------------------------------------
• MONTO TOTAL NETO CANCELADO: ₡${(salary.monto || 0).toLocaleString()} CRC
==================================================

Este comprobante electrónico sirve como constancia y respaldo de pago de conformidad con el Código de Trabajo de Costa Rica (MTSS).

Atentamente,
Administración
Sr. & Sra. Pinto - El Sabor de ser Tico`;

            document.getElementById('email-salary-body').value = bodyText;
            document.getElementById('salary-email-modal').classList.add('active');
        },

        closeEmailSalaryModal() {
            document.getElementById('salary-email-modal').classList.remove('active');
        },

        async sendSalaryEmail() {
            const id = document.getElementById('email-salary-id').value;
            const to = document.getElementById('email-salary-to').value.trim();
            const cc = document.getElementById('email-salary-cc').value.trim();
            const subject = document.getElementById('email-salary-subject').value.trim();
            const body = document.getElementById('email-salary-body').value;

            if (!to) {
                alert("Por favor ingresa el correo del colaborador o destinatario.");
                return;
            }

            // Construir URL mailto
            let mailtoUrl = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
            if (cc) {
                mailtoUrl += `&cc=${encodeURIComponent(cc)}`;
            }

            // Abrir cliente de correo
            window.location.href = mailtoUrl;

            // Guardar registro en Firestore
            try {
                if (id) {
                    await window.FirebaseDB.collection('salarios').doc(id).update({
                        correoEnviadoA: to,
                        ccRespaldo: cc,
                        fechaEnvioCorreo: new Date().toISOString()
                    });
                }
            } catch (err) {
                console.error("Error al actualizar estado de correo en salario:", err);
            }

            this.closeEmailSalaryModal();
            alert(`✅ Abriendo tu gestor de correo para enviar el comprobante a: ${to}\nSe guardó el respaldo en el sistema.`);
        },

        async deleteSalary(id, empleado, monto) {
            if (!confirm(`¿Deseas eliminar el pago de salario de "${empleado}" por ₡${(monto || 0).toLocaleString()}?`)) return;
            try {
                await window.FirebaseDB.collection('salarios').doc(id).delete();
            } catch (err) {
                console.error("Error al eliminar pago:", err);
                alert("No se pudo eliminar el registro.");
            }
        },

        exportPurchasesCSV() {
            if (this.purchases.length === 0) {
                alert("No hay compras registradas para exportar.");
                return;
            }

            let csvContent = "data:text/csv;charset=utf-8,";
            csvContent += "Fecha,Proveedor,Factura,Categoria,Monto (CRC),Aplica Hacienda,Registrado Por,Notas\n";

            this.purchases.forEach(p => {
                const row = [
                    `"${p.fecha}"`,
                    `"${(p.proveedor || '').replace(/"/g, '""')}"`,
                    `"${(p.factura || '').replace(/"/g, '""')}"`,
                    `"${(p.categoria || '').replace(/"/g, '""')}"`,
                    p.total || 0,
                    p.aplicaHacienda !== false ? 'SI' : 'NO',
                    `"${(p.registradoPor || '').replace(/"/g, '""')}"`,
                    `"${(p.notas || '').replace(/"/g, '""')}"`
                ];
                csvContent += row.join(",") + "\n";
            });

            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", `Libro_Compras_Hacienda_CR_${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        },

        exportHaciendaReportPDF() {
            const baseCompras = document.getElementById('d105-compras-base')?.innerText || '₡0';
            const rentaEstimada = document.getElementById('d105-renta-estimada')?.innerText || '₡0';
            const ivaEstimado = document.getElementById('d105-iva-estimado')?.innerText || '₡0';
            const totalCompras = document.getElementById('hacienda-total-purchases')?.innerText || '₡0';

            const printContent = `
                <div style="font-family: Arial, sans-serif; padding: 30px; color: #000; max-width: 800px; margin: 0 auto;">
                    <div style="text-align: center; border-bottom: 2px solid #333; padding-bottom: 15px; margin-bottom: 20px;">
                        <h2 style="margin: 0; text-transform: uppercase;">Sr. & Sra. Pinto</h2>
                        <h4 style="margin: 5px 0; color: #555;">Resumen Tributario Régimen Simplificado (Costa Rica)</h4>
                        <p style="font-size: 12px; margin: 0;">Actividad: 5610.0 - Actividades de restaurantes y de servicio móvil de comidas</p>
                        <p style="font-size: 11px; color: #777;">Generado el: ${new Date().toLocaleString('es-CR')}</p>
                    </div>

                    <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px;">
                        <thead>
                            <tr style="background: #f2f2f2;">
                                <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Rubro de Declaración D-105</th>
                                <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Monto en Colones (CRC)</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td style="border: 1px solid #ddd; padding: 8px;">Total Compras Declarables del Trimestre</td>
                                <td style="border: 1px solid #ddd; padding: 8px; text-align: right; font-weight: bold;">${baseCompras}</td>
                            </tr>
                            <tr>
                                <td style="border: 1px solid #ddd; padding: 8px;">Factor Compras Renta (10%)</td>
                                <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">10.00%</td>
                            </tr>
                            <tr>
                                <td style="border: 1px solid #ddd; padding: 8px;">Impuesto sobre la Renta Estimado</td>
                                <td style="border: 1px solid #ddd; padding: 8px; text-align: right; font-weight: bold; color: #27ae60;">${rentaEstimada}</td>
                            </tr>
                            <tr>
                                <td style="border: 1px solid #ddd; padding: 8px;">Factor Compras IVA (10%) x Tarifa (13%)</td>
                                <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">1.30% sobre compras</td>
                            </tr>
                            <tr>
                                <td style="border: 1px solid #ddd; padding: 8px;">Impuesto IVA Trimestral Estimado</td>
                                <td style="border: 1px solid #ddd; padding: 8px; text-align: right; font-weight: bold; color: #2980b9;">${ivaEstimado}</td>
                            </tr>
                        </tbody>
                    </table>

                    <div style="background: #f9f9f9; border: 1px solid #eee; padding: 15px; border-radius: 6px; font-size: 11px; line-height: 1.5;">
                        <strong>Instrucciones para el contribuyente:</strong><br>
                        1. Ingresa a la nueva plataforma <strong>Tribu CR</strong> del Ministerio de Hacienda (Hacienda Digital - reemplazo oficial de ATV).<br>
                        2. Dirígete a la opción de presentar Declaración <strong>D-105 (Régimen de Tributación Simplificada)</strong>.<br>
                        3. En la casilla de compras del trimestre, traslada el monto exacto: <strong>${baseCompras}</strong>.<br>
                        4. Verifica los montos resultantes calculados por el sistema Tribu CR y realiza el pago antes del día 15 posterior al trimestre.
                    </div>
                </div>
            `;

            const opt = {
                margin: 10,
                filename: `Reporte_Hacienda_D105_${new Date().toISOString().split('T')[0]}.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2 },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            };

            if (window.html2pdf) {
                window.html2pdf().set(opt).from(printContent).save();
            } else {
                const win = window.open('', '_blank');
                win.document.write(printContent);
                win.document.close();
                win.print();
            }
        }
    };

    // Cerrar modales con clic afuera o con tecla Escape
    document.addEventListener('click', (e) => {
        if (e.target.classList && e.target.classList.contains('modal-overlay')) {
            e.target.classList.remove('active');
        }
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
        }
    });

    // Función de mantenimiento administrativo para inicio limpio de semana
    window.resetSystemDataForNextWeek = async () => {
        if (!confirm("¿Deseas resetear el inventario a 0 y borrar pedidos de prueba para iniciar semana?")) return;
        try {
            const db = window.FirebaseDB;
            if (!db) return;
            const invSnap = await db.collection('inventario').get();
            if (!invSnap.empty) {
                const b1 = db.batch();
                invSnap.forEach(doc => b1.update(doc.ref, { cantidad: 0 }));
                await b1.commit();
            }
            const pedSnap = await db.collection('pedidos').get();
            if (!pedSnap.empty) {
                const b2 = db.batch();
                pedSnap.forEach(doc => b2.delete(doc.ref));
                await b2.commit();
            }
            if (window.FinancesManager && window.FinancesManager.seedInitialObligations) {
                await window.FinancesManager.seedInitialObligations();
            }
            alert("✅ Datos reseteados con éxito para la nueva semana.");
        } catch (err) {
            console.error("Error al resetear datos:", err);
            alert("Ocurrió un error al resetear datos.");
        }
    };

});

function toggleSidebar() {
    const sidebar = document.getElementById('admin-sidebar');
    if (!sidebar) return;
    const isCollapsed = sidebar.classList.toggle('collapsed');
    localStorage.setItem('admin_sidebar_collapsed', isCollapsed);
}


