document.addEventListener("DOMContentLoaded", async () => {
    // 1. Setup inicial de usuarios (Solo para la demo, crea los usuarios si no existen)
    setTimeout(async () => {
        if(window.FirebaseDB) {
            const snapshot = await window.FirebaseDB.collection('empleados').limit(1).get();
            if(snapshot.empty) {
                const batch = window.FirebaseDB.batch();
                batch.set(window.FirebaseDB.collection('empleados').doc('admin'), { cedula: '1111', password: '111', rol: 'admin' });
                batch.set(window.FirebaseDB.collection('empleados').doc('ventas'), { cedula: '2222', password: '222', rol: 'ventas' });
                batch.set(window.FirebaseDB.collection('empleados').doc('cocina'), { cedula: '3333', password: '333', rol: 'cocina' });
                await batch.commit();
                console.log("Usuarios por defecto creados en Firebase.");
            }
        }
    }, 1500);

    // 2. Revisar a qué módulo quiere entrar (via ?r=rol)
    const urlParams = new URLSearchParams(window.location.search);
    const targetRole = urlParams.get('r');
    
    if (targetRole) {
        document.getElementById('role-title').innerText = `Acceso: ${targetRole}`;
    }

    window.LoginManager = {
        async iniciarSesion() {
            const cedula = document.getElementById('cedula').value.trim();
            const password = document.getElementById('password').value.trim();
            const errorMsg = document.getElementById('error-msg');
            
            errorMsg.style.display = 'none';

            if(!cedula || !password) {
                errorMsg.innerText = "Por favor, llena ambos campos.";
                errorMsg.style.display = 'block';
                return;
            }

            try {
                // Buscar en Firestore
                const snapshot = await window.FirebaseDB.collection('empleados')
                    .where('cedula', '==', cedula)
                    .where('password', '==', password)
                    .get();

                if (snapshot.empty) {
                    errorMsg.innerText = "Cédula o contraseña incorrectos.";
                    errorMsg.style.display = 'block';
                } else {
                    const userData = snapshot.docs[0].data();
                    
                    // Guardar sesión en el navegador
                    localStorage.setItem('srsrapinto_auth', userData.rol);
                    localStorage.setItem('srsrapinto_cedula', userData.cedula);

                    // Redireccionar al módulo correspondiente o al que solicitó
                    const modulo = targetRole || userData.rol;
                    window.location.href = `${modulo}.html`;
                }
            } catch (error) {
                console.error("Error validando:", error);
                errorMsg.innerText = "Error de conexión. Intenta de nuevo.";
                errorMsg.style.display = 'block';
            }
        }
    };
});
