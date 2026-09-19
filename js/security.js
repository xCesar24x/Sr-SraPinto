/**
 * Módulo de Seguridad y Criptografía para Sr. & Sra. Pinto
 * Proporciona:
 * 1. Hasheo y verificación de contraseñas con Web Crypto API (SHA-256 + Salt).
 * 2. Auto-migración de credenciales legadas en texto plano.
 * 3. Sanitización de entradas contra XSS (Cross-Site Scripting).
 * 4. Control de tasa de intentos (Rate limiting / Protección anti-fuerza bruta).
 */

const Security = {
    SALT_PREFIX: 'srsrapinto_v1_secure_salt_',

    /**
     * Genera un hash criptográfico SHA-256 con salt de una contraseña o PIN.
     * @param {string} plainText
     * @returns {Promise<string>} Prefijado con 'sha256:'
     */
    async hashPassword(plainText) {
        if (!plainText) return '';
        const trimmed = String(plainText).trim();
        const encoder = new TextEncoder();
        const data = encoder.encode(this.SALT_PREFIX + trimmed);
        const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return `sha256:${hashHex}`;
    },

    /**
     * Comprueba si la contraseña ingresada coincide con la almacenada (sea hash o formato legado).
     * @param {string} inputPassword Contraseña o PIN ingresado por el usuario.
     * @param {string} storedPassword Contraseña o hash guardado en Firestore.
     * @returns {Promise<boolean>}
     */
    async verifyPassword(inputPassword, storedPassword) {
        if (!inputPassword || !storedPassword) return false;
        const inputTrimmed = String(inputPassword).trim();
        const storedTrimmed = String(storedPassword).trim();

        // 1. Verificación segura con hash SHA-256
        if (storedTrimmed.startsWith('sha256:')) {
            const inputHashed = await this.hashPassword(inputTrimmed);
            return inputHashed === storedTrimmed;
        }

        // 2. Soporte legado temporal (texto plano)
        return inputTrimmed === storedTrimmed;
    },

    /**
     * Indica si la contraseña guardada en Firestore aún está en formato plano legado.
     * @param {string} storedPassword
     * @returns {boolean}
     */
    isLegacyPassword(storedPassword) {
        if (!storedPassword) return false;
        return !String(storedPassword).trim().startsWith('sha256:');
    },

    /**
     * Escapa caracteres especiales de HTML para prevenir inyecciones XSS.
     * @param {string} str
     * @returns {string}
     */
    escapeHTML(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    },

    // --- CONTROL DE TASA DE INTENTOS / FUERZA BRUTA ---
    RATE_LIMIT_PREFIX: 'srsrapinto_rl_',

    getRateLimitData(key) {
        try {
            const raw = localStorage.getItem(this.RATE_LIMIT_PREFIX + key);
            return raw ? JSON.parse(raw) : { attempts: 0, lockedUntil: 0 };
        } catch (e) {
            return { attempts: 0, lockedUntil: 0 };
        }
    },

    setRateLimitData(key, data) {
        try {
            localStorage.setItem(this.RATE_LIMIT_PREFIX + key, JSON.stringify(data));
        } catch (e) {}
    },

    /**
     * Retorna los segundos restantes de bloqueo. Si es 0, no está bloqueado.
     * @param {string} key
     * @returns {number}
     */
    getLockoutRemaining(key) {
        const data = this.getRateLimitData(key);
        const now = Date.now();
        if (data.lockedUntil && data.lockedUntil > now) {
            return Math.ceil((data.lockedUntil - now) / 1000);
        }
        return 0;
    },

    /**
     * Registra un intento fallido y bloquea si se supera el umbral.
     * @param {string} key
     * @param {number} maxAttempts Por defecto 5 intentos
     * @param {number} lockoutSeconds Por defecto 60 segundos
     * @returns {number} Segundos de bloqueo si se activó, o 0
     */
    recordFailedAttempt(key, maxAttempts = 5, lockoutSeconds = 60) {
        const data = this.getRateLimitData(key);
        const now = Date.now();

        if (data.lockedUntil && data.lockedUntil <= now) {
            data.attempts = 0;
            data.lockedUntil = 0;
        }

        data.attempts = (data.attempts || 0) + 1;

        if (data.attempts >= maxAttempts) {
            data.lockedUntil = now + (lockoutSeconds * 1000);
        }

        this.setRateLimitData(key, data);
        return this.getLockoutRemaining(key);
    },

    /**
     * Restablece el contador de intentos fallidos al tener éxito.
     * @param {string} key
     */
    resetRateLimit(key) {
        try {
            localStorage.removeItem(this.RATE_LIMIT_PREFIX + key);
        } catch (e) {}
    }
};

window.Security = Security;
