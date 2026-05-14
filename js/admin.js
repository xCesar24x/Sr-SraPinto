document.addEventListener("DOMContentLoaded", () => {
    
    const inventoryList = document.getElementById('inventory-list');
    const selectItem = document.getElementById('stock-item-select');
    const modal = document.getElementById('stock-modal');
    
    // Stats elements
    const statHuevos = document.getElementById('stat-huevos');
    const statQueso = document.getElementById('stat-queso');
    const statAlertas = document.getElementById('stat-alertas');

    let currentInventory = [];

    // INIT
    if (!window.FirebaseDB || !window.Firestore) {
        inventoryList.innerHTML = `<tr><td colspan="4" style="color:red;">Error de conexión a Firebase.</td></tr>`;
        return;
    }

    const db = window.FirebaseDB;

    // Escuchar inventario
    db.collection("inventario").onSnapshot((snapshot) => {
        currentInventory = [];
        let alertasCount = 0;

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
        if (bajas > 0) {
            document.querySelector('.stat-card.warning').style.animation = "pulse 2s infinite";
        } else {
            document.querySelector('.stat-card.warning').style.animation = "none";
        }
    }

    function updateSelect(items) {
        selectItem.innerHTML = items.map(item => {
            const nombreStr = item.nombre || item.id.replace(/_/g, ' ');
            return `<option value="${item.id}">${nombreStr} (Actual: ${item.cantidad || 0})</option>`;
        }).join('');
    }

    // MANAGER GLOBAL
    window.AdminManager = {
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
                // Opcional feedback de exito
            } catch (error) {
                console.error("Error al actualizar inventario:", error);
                alert("Hubo un error al guardar.");
            }
        }
    };
});
