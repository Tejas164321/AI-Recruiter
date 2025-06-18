
// src/lib/firebase/config.ts
import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, connectAuthEmulator, type Auth } from "firebase/auth";
// import { getFirestore, connectFirestoreEmulator, type Firestore } from "firebase/firestore"; // Example if you use Firestore

const firebaseConfigValues = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;

// Check if all necessary Firebase config values are present and not empty strings
const allConfigPresent =
  firebaseConfigValues.apiKey && firebaseConfigValues.apiKey.trim() !== "" &&
  firebaseConfigValues.authDomain && firebaseConfigValues.authDomain.trim() !== "" &&
  firebaseConfigValues.projectId && firebaseConfigValues.projectId.trim() !== "" &&
  firebaseConfigValues.appId && firebaseConfigValues.appId.trim() !== "";

if (allConfigPresent) {
  if (!getApps().length) {
    app = initializeApp(firebaseConfigValues);
  } else {
    app = getApps()[0];
  }
  auth = getAuth(app);

  const EMULATOR_HOST = process.env.NEXT_PUBLIC_EMULATOR_HOST;
  const USE_EMULATORS = process.env.NEXT_PUBLIC_USE_EMULATORS === 'true';

  if (USE_EMULATORS && EMULATOR_HOST && auth) {
    try {
      connectAuthEmulator(auth, `http://${EMULATOR_HOST}:9099`, { disableWarnings: true });
      console.log("Using Firebase Emulators for Auth.");
    } catch (error) {
      console.error("Error connecting to Firebase Auth Emulator:", error);
    }
  } else if (USE_EMULATORS && !EMULATOR_HOST) {
    console.warn("USE_EMULATORS is true, but NEXT_PUBLIC_EMULATOR_HOST is not set. Not connecting to emulators.");
  }
} else {
  console.warn(
    "Firebase configuration is incomplete or contains empty values. Firebase services (including Auth) will not be initialized. " +
    "Please ensure all NEXT_PUBLIC_FIREBASE_ environment variables are correctly set. " +
    "If publishing through Firebase Studio, these should be configured automatically after linking a project. " +
    "For local development, check your .env or .env.local file."
  );
}

// const db: Firestore | null = app ? getFirestore(app) : null; // Example if you use Firestore

export { app, auth /*, db */ }; // Export db if you use it
