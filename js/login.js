document.addEventListener("DOMContentLoaded", async () => {
    // 1. Setup inicial de usuarios: SOLO si NO existen en Firestore (evita sobreescribir contraseñas modificadas)
    setTimeout(async () => {
        if (window.FirebaseDB) {
            try {
                const db = window.FirebaseDB;
                const adminDoc = await db.collection('empleados').doc('admin').get();
                if (!adminDoc.exists) {
                    const pass = window.Security ? await window.Security.hashPassword('1001') : '1001';
                    await db.collection('empleados').doc('admin').set({ cedula: 'Admin', password: pass, rol: 'admin' });
                    console.log("Usuario inicial Admin creado con hash seguro.");
                }
                const ventasDoc = await db.collection('empleados').doc('ventas').get();
                if (!ventasDoc.exists) {
                    const pass = window.Security ? await window.Security.hashPassword('1002') : '1002';
                    await db.collection('empleados').doc('ventas').set({ cedula: 'Ventas', password: pass, rol: 'ventas' });
                    console.log("Usuario inicial Ventas creado con hash seguro.");
                }
                const cocinaDoc = await db.collection('empleados').doc('cocina').get();
                if (!cocinaDoc.exists) {
                    const pass = window.Security ? await window.Security.hashPassword('1003') : '1003';
                    await db.collection('empleados').doc('cocina').set({ cedula: 'Cocina', password: pass, rol: 'cocina' });
                    console.log("Usuario inicial Cocina creado con hash seguro.");
                }
            } catch (err) {
                console.warn("Verificación de usuarios iniciales:", err);
            }
        }
    }, 1500);

    // 2. Revisar a qué módulo quiere entrar (via ?r=rol)
    const urlParams = new URLSearchParams(window.location.search);
    const targetRole = urlParams.get('r');
    
    if (targetRole) {
        const titleEl = document.getElementById('role-title');
        if (titleEl) titleEl.innerText = `Acceso: ${targetRole}`;
    }

    let lockoutTimer = null;

    window.LoginManager = {
        checkInitialLockout() {
            if (!window.Security) return false;
            const remaining = window.Security.getLockoutRemaining('login');
            if (remaining > 0) {
                this.startLockoutTimer(remaining);
                return true;
            }
            return false;
        },

        startLockoutTimer(seconds) {
            const submitBtn = document.getElementById('btn-submit-login');
            const errorMsg = document.getElementById('error-msg');
            if (lockoutTimer) clearInterval(lockoutTimer);

            let current = seconds;
            const updateUI = () => {
                if (current <= 0) {
                    clearInterval(lockoutTimer);
                    lockoutTimer = null;
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.innerHTML = 'Ingresar <i class="fas fa-arrow-right"></i>';
                    }
                    if (errorMsg) errorMsg.style.display = 'none';
                    return;
                }
                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.innerText = `Bloqueado (${current}s)`;
                }
                if (errorMsg) {
                    errorMsg.innerText = `Demasiados intentos fallidos. Por seguridad, espera ${current} segundos para volver a intentar.`;
                    errorMsg.style.display = 'block';
                }
                current--;
            };

            updateUI();
            lockoutTimer = setInterval(updateUI, 1000);
        },

        async iniciarSesion() {
            const cedulaInput = document.getElementById('cedula');
            const passwordInput = document.getElementById('password');
            const errorMsg = document.getElementById('error-msg');
            const submitBtn = document.getElementById('btn-submit-login');

            const cedula = cedulaInput ? cedulaInput.value.trim() : '';
            const password = passwordInput ? passwordInput.value.trim() : '';
            
            errorMsg.style.display = 'none';

            // 1. Verificar bloqueo por tasa de intentos (Rate Limiting)
            if (window.Security) {
                const remainingLock = window.Security.getLockoutRemaining('login');
                if (remainingLock > 0) {
                    this.startLockoutTimer(remainingLock);
                    return;
                }
            }

            if (!cedula || !password) {
                errorMsg.innerText = "Por favor, llena ambos campos.";
                errorMsg.style.display = 'block';
                return;
            }

            try {
                if (submitBtn) submitBtn.disabled = true;

                const db = window.FirebaseDB;
                const normalizedInput = cedula.toLowerCase().trim();

                // 2. Intentar obtener documento directo por ID (ej. 'admin', 'ventas', 'cocina')
                let userDoc = await db.collection('empleados').doc(normalizedInput).get();
                let userData = null;
                let matchedDocId = null;

                if (userDoc.exists) {
                    userData = userDoc.data();
                    matchedDocId = userDoc.id;
                } else {
                    // 3. Buscar en la colección por cédula o nombre insensible a mayúsculas
                    const snapshot = await db.collection('empleados').get();
                    snapshot.forEach(doc => {
                        const data = doc.data();
                        const c = (data.cedula || '').toLowerCase().trim();
                        if (c === normalizedInput || doc.id.toLowerCase().trim() === normalizedInput) {
                            userData = data;
                            matchedDocId = doc.id;
                        }
                    });
                }

                // 4. Verificación criptográfica de contraseña
                let isMatch = false;
                if (userData && userData.password) {
                    if (window.Security) {
                        isMatch = await window.Security.verifyPassword(password, userData.password);
                    } else {
                        isMatch = (String(userData.password).trim() === password);
                    }
                }

                if (!userData || !isMatch) {
                    // Registrar intento fallido
                    if (window.Security) {
                        const remaining = window.Security.recordFailedAttempt('login', 5, 60);
                        if (remaining > 0) {
                            this.startLockoutTimer(remaining);
                            return;
                        } else {
                            const attemptsCount = (window.Security.getRateLimitData('login').attempts || 0);
                            const attemptsLeft = Math.max(0, 5 - attemptsCount);
                            errorMsg.innerText = attemptsLeft > 1
                                ? `Cédula o contraseña incorrectos. (${attemptsLeft} intentos restantes)`
                                : (attemptsLeft === 1 ? "Cédula o contraseña incorrectos. (1 intento restante antes del bloqueo)" : "Cédula o contraseña incorrectos.");
                            errorMsg.style.display = 'block';
                        }
                    } else {
                        errorMsg.innerText = "Cédula o contraseña incorrectos.";
                        errorMsg.style.display = 'block';
                    }
                    if (submitBtn) submitBtn.disabled = false;
                    return;
                }

                // 5. Login exitoso: Limpiar intentos fallidos
                if (window.Security) {
                    window.Security.resetRateLimit('login');

                    // 6. Auto-migración de contraseñas legadas a hash SHA-256
                    if (window.Security.isLegacyPassword(userData.password) && matchedDocId) {
                        try {
                            const hashed = await window.Security.hashPassword(password);
                            await db.collection('empleados').doc(matchedDocId).set({
                                password: hashed
                            }, { merge: true });
                            console.log("Contraseña migrada automáticamente a hash SHA-256 seguro.");
                        } catch (migErr) {
                            console.warn("No se pudo auto-migrar la contraseña:", migErr);
                        }
                    }
                }

                // Guardar sesión en el navegador
                localStorage.setItem('srsrapinto_auth', userData.rol);
                localStorage.setItem('srsrapinto_cedula', userData.cedula || cedula);

                // Redireccionar al módulo correspondiente o al que solicitó
                const modulo = targetRole || userData.rol;
                const hasTest = window.location.search.includes('test=true');
                window.location.href = `${modulo}.html` + (hasTest ? '?test=true' : '');
            } catch (error) {
                console.error("Error validando sesión:", error);
                errorMsg.innerText = "Error de conexión. Intenta de nuevo.";
                errorMsg.style.display = 'block';
                if (submitBtn) submitBtn.disabled = false;
            }
        }
    };

    // Verificar si ya estaba bloqueado por intentos previos
    LoginManager.checkInitialLockout();

    // Soporte para tecla Enter
    ['cedula', 'password'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    LoginManager.iniciarSesion();
                }
            });
        }
    });
});
