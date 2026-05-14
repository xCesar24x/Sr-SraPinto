const firebaseConfig = {
  apiKey: "AIzaSyCocstMPLVn6Po_A3DAwFCJ_jotxwRJFis",
  authDomain: "srsrapinto-efe77.firebaseapp.com",
  projectId: "srsrapinto-efe77",
  storageBucket: "srsrapinto-efe77.firebasestorage.app",
  messagingSenderId: "317421350241",
  appId: "1:317421350241:web:141c914afdfc6a9a982920"
};

// Inicializar Firebase (Versión Compat) para que funcione en local sin servidor (file://)
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Exponer las herramientas al entorno global para no romper el main.js
window.FirebaseDB = db;

// Un pequeño puente (wrapper) para que el código moderno en main.js funcione
// con esta versión de compatibilidad.
window.Firestore = {
    collection: (dbInstance, collectionName) => dbInstance.collection(collectionName),
    addDoc: async (collectionRef, data) => await collectionRef.add(data),
    onSnapshot: (queryRef, callback) => queryRef.onSnapshot(callback)
};

console.log("🔥 Firebase inicializado en Modo Compatibilidad para archivos locales.");
