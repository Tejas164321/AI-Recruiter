
// src/lib/firebase/config.ts
import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, connectAuthEmulator, type Auth } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator, type Firestore } from "firebase/firestore";

// Directly use the environment variables to form the config object
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_MEASUREMENT_ID, // Include measurementId
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

// Check if the critical Firebase config values are present and not empty
const criticalConfigPresent =
  firebaseConfig.apiKey && firebaseConfig.apiKey.trim() !== "" &&
  firebaseConfig.authDomain && firebaseConfig.authDomain.trim() !== "" &&
  firebaseConfig.projectId && firebaseConfig.projectId.trim() !== "" &&
  firebaseConfig.appId && firebaseConfig.appId.trim() !== "";

if (criticalConfigPresent) {
  if (!getApps().length) {
    try {
      // Pass only the defined values from firebaseConfig to initializeApp
      // This handles cases where some optional values might be undefined from process.env
      const validConfig: {[key: string]: string | undefined} = {};
      for (const [key, value] of Object.entries(firebaseConfig)) {
        if (value) { // Only add to config if value is present
          validConfig[key] = value;
        }
      }
      app = initializeApp(validConfig);
    } catch (error) {
      console.error("Firebase app initialization error:", error, "Config used:", firebaseConfig);
      app = null; // Ensure app is null on error
    }
  } else {
    app = getApps()[0];
  }

  if (app) {
    try {
      auth = getAuth(app);
    } catch (error) {
        console.error("Firebase Auth initialization error:", error);
        auth = null; // Ensure auth is null on error
    }
    try {
      db = getFirestore(app);
    } catch (error) {
        console.error("Firebase Firestore initialization error:", error);
        db = null; // Ensure db is null on error
    }

    const EMULATOR_HOST = process.env.NEXT_PUBLIC_EMULATOR_HOST;
    const USE_EMULATORS = process.env.NEXT_PUBLIC_USE_EMULATORS === 'true';

    if (USE_EMULATORS && EMULATOR_HOST) {
      if (auth) {
        try {
          connectAuthEmulator(auth, `http://${EMULATOR_HOST}:9099`, { disableWarnings: true });
          console.log("Firebase Config: Using Firebase Emulators for Auth.");
        } catch (error) {
          console.error("Firebase Config: Error connecting to Firebase Auth Emulator:", error);
          auth = null;
        }
      } else {
        console.warn("Firebase Config: Auth service not initialized prior to emulator check, skipping emulator connection for Auth.");
      }

      if (db) {
        try {
          connectFirestoreEmulator(db, EMULATOR_HOST, 8080);
          console.log("Firebase Config: Using Firebase Emulators for Firestore.");
        } catch (error) {
          console.error("Firebase Config: Error connecting to Firebase Firestore Emulator:", error);
          db = null;
        }
      } else {
         console.warn("Firebase Config: Firestore service not initialized prior to emulator check, skipping emulator connection for Firestore.");
      }

    } else if (USE_EMULATORS && !EMULATOR_HOST) {
      console.warn("Firebase Config: USE_EMULATORS is true, but NEXT_PUBLIC_EMULATOR_HOST is not set. Not connecting to emulators.");
    }
  } else if (criticalConfigPresent) { 
    // This case means app initialization failed even if config values seemed present
    console.warn(
      "Firebase Config: Firebase app initialization failed despite config values being present. Firebase services (Auth, Firestore) will not be available."
    );
  }
} else {
  // This is the block that was likely triggered if the previous error log about incomplete config is still relevant
  console.warn(
    "Firebase Config: Firebase configuration is incomplete (missing critical values like apiKey, authDomain, projectId, or appId in .env). Firebase services (Auth & Firestore) will not be initialized. " +
    "Please ensure all NEXT_PUBLIC_FIREBASE_ environment variables are correctly set in your .env file for local development, " +
    "or ensure they are provided by the hosting environment upon deployment. " +
    "Debug: API_KEY_SET=" + !!(firebaseConfig.apiKey && firebaseConfig.apiKey.trim() !== "") +
    ", AUTH_DOMAIN_SET=" + !!(firebaseConfig.authDomain && firebaseConfig.authDomain.trim() !== "") +
    ", PROJECT_ID_SET=" + !!(firebaseConfig.projectId && firebaseConfig.projectId.trim() !== "") +
    ", APP_ID_SET=" + !!(firebaseConfig.appId && firebaseConfig.appId.trim() !== "")
  );
}

export { app, auth, db };
