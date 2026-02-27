import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

const firebaseConfig = {
    apiKey: "AIzaSyBCyJok77Y5Hmt2MN2MF1CEbMcKt0VvqN0",
    authDomain: "informativo-termep.firebaseapp.com",
    projectId: "informativo-termep",
    storageBucket: "informativo-termep.firebasestorage.app",
    messagingSenderId: "441247695636",
    appId: "1:441247695636:web:a478174d1c32920a763801"
};

let db: ReturnType<typeof getFirestore> | null = null;
let storage: ReturnType<typeof getStorage> | null = null;

try {
    if (firebaseConfig.apiKey !== "SUA_API_KEY") {
        const app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        storage = getStorage(app);
    }
} catch (e) {
    console.error("Firebase initialization failed:", e);
}

export { db, storage, collection, addDoc, ref, uploadBytes, getDownloadURL };
