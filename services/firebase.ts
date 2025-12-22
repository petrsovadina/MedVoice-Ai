import { initializeApp } from "firebase/app";
import {
    getAuth,
    GoogleAuthProvider,
    browserLocalPersistence,
    browserPopupRedirectResolver,
    initializeAuth
} from "firebase/auth";
import {
    getFirestore,
    initializeFirestore,
    enableIndexedDbPersistence
} from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";

const firebaseConfig = {
    apiKey: "AIzaSyDpzsnGT2Of9VbZddAXPhe0eP_thNCHLWo",
    authDomain: "medvoice-ai-1.firebaseapp.com",
    projectId: "medvoice-ai-1",
    storageBucket: "medvoice-ai-1.firebasestorage.app",
    messagingSenderId: "487576277164",
    appId: "1:487576277164:web:e555f01a59f8f99e37cf09",
    measurementId: "G-81RK09275R"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth with persistence
const auth = initializeAuth(app, {
    persistence: browserLocalPersistence,
    popupRedirectResolver: browserPopupRedirectResolver
});

// Initialize Firestore with offline persistence
const db = initializeFirestore(app, {
    experimentalForceLongPolling: true // Often helps with connection stability
});

// Enable offline persistence
enableIndexedDbPersistence(db).catch((err) => {
    if (err.code == 'failed-precondition') {
        // Multiple tabs open, persistence can only be enabled in one tab at a a time.
        console.warn("Firestore persistence failed: Multiple tabs open.");
    } else if (err.code == 'unimplemented') {
        // The current browser does not support all of the features required to enable persistence
        console.warn("Firestore persistence not supported in this browser.");
    }
});

const storage = getStorage(app);
const functions = getFunctions(app, "us-central1"); // Ensure region matches
const googleProvider = new GoogleAuthProvider();

// Connect to emulators if in dev mode (optional, but good for testing)
// Connect to emulators if in dev mode (optional, but good for testing)
if (location.hostname === "localhost") {
    connectFunctionsEmulator(functions, "127.0.0.1", 5001);
    // connectStorageEmulator(storage, "127.0.0.1", 9199);
}

export { auth, db, storage, functions, googleProvider };
