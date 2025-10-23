// Import the functions you need from the SDKs you need (v9+ modular syntax)
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: process.env.REACT_APP_API_KEY,
    authDomain: process.env.REACT_APP_AUTH_DOMAIN,
    projectId: process.env.REACT_APP_PROJECT_ID,
    storageBucket: process.env.REACT_APP_STORAGE_BUCKET,
    messagingSenderId: process.env.REACT_APP_MESSAGING_SENDER_ID,
    appId: process.env.REACT_APP_APP_ID,
    measurementId: process.env.REACT_APP_MEASUREMENT_ID
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];

// Initialize Firebase services
const auth = getAuth(app);
const firestore = getFirestore(app);
const storage = getStorage(app);

// Connect to emulators in development
if (process.env.REACT_APP_USE_FIREBASE_EMULATOR === 'true' && process.env.NODE_ENV === 'development') {
    console.log('🔧 Connecting to Firebase Emulators...');
    
    try {
        connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
        connectFirestoreEmulator(firestore, 'localhost', 8080);
        connectStorageEmulator(storage, 'localhost', 9199);
        
        console.log('✅ Connected to Firebase Emulators');
        console.log('   - Auth: http://localhost:9099');
        console.log('   - Firestore: http://localhost:8080');
        console.log('   - Storage: http://localhost:9199');
        console.log('   - UI: http://localhost:4000');
    } catch (error) {
        console.warn('⚠️ Emulator connection failed. Using production Firebase.');
    }
}

// Configure auth settings
auth.useDeviceLanguage();

export { auth, firestore, storage, app };
export default app;

