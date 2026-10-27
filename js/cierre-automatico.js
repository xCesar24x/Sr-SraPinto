/**
 * SISTEMA DE CIERRE AUTOMÁTICO DE VENTAS (9:00 PM) - SR. & SRA. PINTO
 * 
 * - Ejecuta el cierre de ventas y arqueo contable automáticamente a las 9:00 PM (hora Costa Rica).
 * - Guarda el registro oficial en la colección 'cierres_caja'.
 * - Resetea el contador de comandas a la #1 para que el día siguiente inicie 100% limpio.
 * - Incluye mecanismo "Catch-Up": si ningún equipo estuvo encendido a las 9:00 PM,
 *   se detecta a la mañana siguiente, se cierra el día anterior y se arranca limpio en #1.
 */

(function () {
    const CierreAutomaticoManager = {
        timerId: null,
        isProcessing: false,

        getCRDate(date = new Date()) {
            return new Date(date.toLocaleString('en-US', { timeZone: 'America/Costa_Rica' }));
        },

        getCRDateString(date = new Date()) {
            const cr = this.getCRDate(date);
            const y = cr.getFullYear();
            const m = String(cr.getMonth() + 1).padStart(2, '0');
            const d = String(cr.getDate()).padStart(2, '0');
            return `${y}-${m}-${d}`;
        },

        getCRDayBounds(dateStr) {
            const [y, m, d] = dateStr.split('-').map(Number);
            // Costa Rica es UTC-6: el día inicia a las 06:00 UTC y termina a las 05:59:59.999 UTC del día siguiente
            const start = new Date(Date.UTC(y, m - 1, d, 6, 0, 0, 0));
            const end = new Date(Date.UTC(y, m - 1, d + 1, 5, 59, 59, 999));
            return { start, end };
        },

        async ejecutarCierreDeFecha(fechaStr) {
            const db = window.FirebaseDB;
            if (!db) return;

            console.log(`🌙 [CierreAuto] Procesando cierre automático para la fecha: ${fechaStr}...`);

            const bounds = this.getCRDayBounds(fechaStr);
            const snapshot = await db.collection("pedidos").get();

            let totalVentas = 0;
            let totalEfectivo = 0;
            let totalSinpe = 0;
            let totalTarjeta = 0;
            let totalOtros = 0;
            let totalComandas = 0;

            snapshot.forEach(doc => {
                const data = doc.data();
                if (data.estado === 'cancelado' || data.estado === 'pendiente_aprobacion') return;

                const fechaDoc = new Date(data.fecha);
                if (fechaDoc >= bounds.start && fechaDoc <= bounds.end) {
                    const monto = Number(data.total) || 0;
                    totalVentas += monto;
                    totalComandas++;

                    const metodo = (data.metodoPago || 'Efectivo').toLowerCase();
                    if (metodo.includes('efectivo')) {
                        totalEfectivo += monto;
                    } else if (metodo.includes('sinpe')) {
                        totalSinpe += monto;
                    } else if (metodo.includes('tarjeta')) {
                        totalTarjeta += monto;
                    } else {
                        totalOtros += monto;
                    }
                }
            });

            // Evitar duplicados si ya existe un cierre automático para esta fecha
            const checkExist = await db.collection('cierres_caja')
                .where('fechaCierre', '==', fechaStr)
                .where('tipo', '==', 'automatico')
                .limit(1)
                .get();

            if (checkExist.empty) {
                const closingData = {
                    fechaHora: new Date().toISOString(),
                    fechaCierre: fechaStr,
                    periodo: 'cierre_automatico_9pm',
                    usuario: 'Sistema (Cierre Automático 9:00 PM)',
                    tipo: 'automatico',
                    esperado: {
                        efectivo: totalEfectivo,
                        sinpe: totalSinpe,
                        tarjeta: totalTarjeta,
                        otros: totalOtros,
                        total: totalVentas
                    },
                    contado: {
                        efectivo: totalEfectivo,
                        sinpe: totalSinpe,
                        tarjeta: totalTarjeta,
                        otros: totalOtros,
                        total: totalVentas
                    },
                    diferencias: {
                        efectivo: 0,
                        sinpe: 0,
                        tarjeta: 0,
                        total: 0
                    },
                    estado: 'Cuadrado Automático',
                    totalComandas: totalComandas,
                    totalMonto: totalVentas
                };

                await db.collection('cierres_caja').add(closingData);
                console.log(`✅ [CierreAuto] Documento de cierre para ${fechaStr} guardado en cierres_caja. Total: ₡${totalVentas.toLocaleString()} (${totalComandas} comandas)`);
            } else {
                console.log(`ℹ️ [CierreAuto] El cierre automático para ${fechaStr} ya existía en cierres_caja.`);
            }

            // Actualizar turno
            await db.collection('config').doc('turno').set({
                activo: true, // Queda activo y listo para la Comanda #1
                siguiente_numero: 1, // Se resetea siempre a 1
                fechaTurno: fechaStr,
                cierreAutomaticoRealizado: fechaStr,
                actualizadoPor: 'Sistema (Cierre Automático 9:00 PM)',
                fechaActualizacion: new Date().toISOString()
            }, { merge: true });

            console.log(`🎉 [CierreAuto] Turno preparado para el día siguiente limpio con comanda #1.`);
        },

        async verificarYEjecutar() {
            if (this.isProcessing) return;
            this.isProcessing = true;

            try {
                const db = window.FirebaseDB;
                if (!db) return;

                const nowCR = this.getCRDate();
                const todayStr = this.getCRDateString(nowCR);
                const currentHour = nowCR.getHours(); // 0 a 23

                const turnoDoc = await db.collection('config').doc('turno').get();
                const data = turnoDoc.exists ? turnoDoc.data() : {};
                const ultimoCierre = data.cierreAutomaticoRealizado || '';
                const fechaTurno = data.fechaTurno || (data.fecha ? data.fecha.split('T')[0] : '');

                // 1. Cierre a las 9:00 PM (21:00) o más tarde en Costa Rica:
                if (currentHour >= 21) {
                    if (ultimoCierre !== todayStr) {
                        console.log(`⏰ [CierreAuto] Hora Costa Rica: ${currentHour}:${String(nowCR.getMinutes()).padStart(2, '0')}. Ejecutando cierre de ventas de hoy (${todayStr})...`);
                        await this.ejecutarCierreDeFecha(todayStr);
                    }
                }

                // 2. Catch-up si es un nuevo día y el turno anterior no se cerró o pertenece a fecha pasada:
                if (fechaTurno && fechaTurno < todayStr) {
                    // Si el día anterior no tenía cierre registrado, procesarlo
                    if (ultimoCierre < fechaTurno) {
                        console.log(`🌅 [CierreAuto Catch-Up] Cerrando día anterior pendiente (${fechaTurno})...`);
                        await this.ejecutarCierreDeFecha(fechaTurno);
                    }

                    // Resetear el turno de hoy a Comanda #1 para arrancar 100% limpio
                    console.log(`🌅 [CierreAuto] Arrancando nuevo día limpio (${todayStr}) con Comanda #1.`);
                    await db.collection('config').doc('turno').set({
                        activo: true,
                        siguiente_numero: 1,
                        fechaTurno: todayStr,
                        actualizadoPor: 'Sistema (Inicio Limpio)',
                        fechaActualizacion: new Date().toISOString()
                    }, { merge: true });
                }
            } catch (err) {
                console.error("⚠️ [CierreAuto] Error durante la verificación de cierre automático:", err);
            } finally {
                this.isProcessing = false;
            }
        },

        init() {
            // Verificar al cargar la página (con ligero retardo para asegurar conexión a Firebase)
            setTimeout(() => {
                this.verificarYEjecutar();
            }, 1200);

            // Chequeo periódico cada 60 segundos
            if (this.timerId) clearInterval(this.timerId);
            this.timerId = setInterval(() => {
                this.verificarYEjecutar();
            }, 60000);

            console.log("🕒 Servicio de Cierre Automático 9:00 PM inicializado.");
        }
    };

    window.CierreAutomaticoManager = CierreAutomaticoManager;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => CierreAutomaticoManager.init());
    } else {
        CierreAutomaticoManager.init();
    }
})();
