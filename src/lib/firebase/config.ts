
// src/lib/firebase/config.ts
import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, connectAuthEmulator, type Auth } from "firebase/auth";
// import { getFirestore, connectFirestoreEmulator, type Firestore } from "firebase/firestore"; // Example if you use Firestore

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  // measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID, // Optional
};

// Initialize Firebase
let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

const auth: Auth = getAuth(app);
// const db: Firestore = getFirestore(app); // Example if you use Firestore

// Connect to emulators if running in development
// Ensure NEXT_PUBLIC_EMULATOR_HOST is set, e.g., localhost
const EMULATOR_HOST = process.env.NEXT_PUBLIC_EMULATOR_HOST;
const USE_EMULATORS = process.env.NEXT_PUBLIC_USE_EMULATORS === 'true';

if (USE_EMULATORS && EMULATOR_HOST) {
  // Before initializing App Check, connect to a functions emulator
  // self.FIREBASE_APPCHECK_DEBUG_TOKEN = true; // Set to true for App Check debug token
  
  // Point to the RTDB emulator.
  // Off by default because it rarely causes issues.
  // connectDatabaseEmulator(db, EMULATOR_HOST, 9000);

  // Point to the Auth emulator.
  connectAuthEmulator(auth, `http://${EMULATOR_HOST}:9099`, { disableWarnings: true });

  // Point to the Firestore emulator.
  // connectFirestoreEmulator(db, EMULATOR_HOST, 8080);

  // Point to the Functions emulator.
  // connectFunctionsEmulator(functions, EMULATOR_HOST, 5001);

  // Point to the Storage emulator.
  // connectStorageEmulator(storage, EMULATOR_HOST, 9199);
  
  console.log("Using Firebase Emulators");
} else {
  console.log("Not using Firebase Emulators or EMULATOR_HOST not set.");
}


export { app, auth /*, db */ }; // Export db if you use it
