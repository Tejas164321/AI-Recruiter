
// src/lib/firebase/config.ts
import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, connectAuthEmulator, type Auth } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator, type Firestore } from "firebase/firestore";

/**
 * This configuration object reads Firebase credentials from environment variables.
 * Using environment variables is crucial for security, as it prevents hardcoding
 * sensitive keys directly in the source code.
 * `NEXT_PUBLIC_` prefix is required for these variables to be accessible on the client-side.
 */
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_MEASUREMENT_ID,
};

// Singleton instances of Firebase services to avoid re-initialization on every render.
let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

// Check if the critical Firebase configuration values are present.
// This prevents initialization errors if the .env file is missing or incomplete.
const criticalConfigPresent =
  firebaseConfig.apiKey &&
  firebaseConfig.authDomain &&
  firebaseConfig.projectId &&
  firebaseConfig.appId;

if (criticalConfigPresent) {
  // Initialize Firebase app only if it hasn't been initialized yet.
  if (!getApps().length) {
    try {
      // Filter out any undefined config values before initializing.
      const validConfig: {[key: string]: string} = {};
      for (const [key, value] of Object.entries(firebaseConfig)) {
        if (value) validConfig[key] = value;
      }
      app = initializeApp(validConfig);
    } catch (error) {
      console.error("Firebase app initialization error:", error);
      app = null; // Ensure app is null on error.
    }
  } else {
    // If already initialized, get the existing app instance.
    app = getApps()[0];
  }

  // If app initialization was successful, initialize other Firebase services.
  if (app) {
    try { auth = getAuth(app); } catch (e) { console.error("Auth init error", e); }
    try { db = getFirestore(app); } catch (e) { console.error("Firestore init error", e); }
    
    // Check if the app should use local Firebase emulators.
    const USE_EMULATORS = process.env.NEXT_PUBLIC_USE_EMULATORS === 'true';
    const EMULATOR_HOST = process.env.NEXT_PUBLIC_EMULATOR_HOST;

    if (USE_EMULATORS && EMULATOR_HOST) {
      // Connect to emulators if they are enabled and host is set.
      if (auth) {
        try {
          connectAuthEmulator(auth, `http://${EMULATOR_HOST}:9099`, { disableWarnings: true });
          console.log("Firebase Config: Using Firebase Emulators for Auth.");
        } catch (error) { console.error("Error connecting to Auth Emulator:", error); auth = null; }
      }
      if (db) {
        try {
          connectFirestoreEmulator(db, EMULATOR_HOST, 8080);
          console.log("Firebase Config: Using Firebase Emulators for Firestore.");
        } catch (error) { console.error("Error connecting to Firestore Emulator:", error); db = null; }
      }
    }
  }
} else {
  // Log a warning if the configuration is incomplete.
  console.warn(
    "Firebase Config: Firebase configuration is incomplete. Firebase services will be unavailable. " +
    "Ensure all NEXT_PUBLIC_FIREBASE_ environment variables are set."
  );
}

// Export the initialized (or null) services for use throughout the app.
export { app, auth, db };
