
// src/lib/firebase/config.ts
import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, connectAuthEmulator, type Auth } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator, type Firestore } from "firebase/firestore";

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
let db: Firestore | null = null;

// Check if all necessary Firebase config values are present and not empty strings
const allConfigPresent =
  firebaseConfigValues.apiKey && firebaseConfigValues.apiKey.trim() !== "" &&
  firebaseConfigValues.authDomain && firebaseConfigValues.authDomain.trim() !== "" &&
  firebaseConfigValues.projectId && firebaseConfigValues.projectId.trim() !== "" &&
  firebaseConfigValues.appId && firebaseConfigValues.appId.trim() !== "";

if (allConfigPresent) {
  if (!getApps().length) {
    try {
      app = initializeApp(firebaseConfigValues);
    } catch (error) {
      console.error("Firebase app initialization error:", error);
      // Prevent further Firebase service initialization if app init fails
    }
  } else {
    app = getApps()[0];
  }

  if (app) { // Only initialize services if app was successfully initialized
    try {
      auth = getAuth(app);
    } catch (error) {
        console.error("Firebase Auth initialization error:", error);
    }
    try {
      db = getFirestore(app);
    } catch (error) {
        console.error("Firebase Firestore initialization error:", error);
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
          auth = null; // Prevent using partially configured auth
        }
      } else {
        console.warn("Firebase Config: Auth service not initialized, skipping emulator connection for Auth.");
      }

      if (db) {
        try {
          connectFirestoreEmulator(db, EMULATOR_HOST, 8080); // Default Firestore emulator port
          console.log("Firebase Config: Using Firebase Emulators for Firestore.");
        } catch (error) {
          console.error("Firebase Config: Error connecting to Firebase Firestore Emulator:", error);
          db = null; // Prevent using partially configured db
        }
      } else {
         console.warn("Firebase Config: Firestore service not initialized, skipping emulator connection for Firestore.");
      }

    } else if (USE_EMULATORS && !EMULATOR_HOST) {
      console.warn("Firebase Config: USE_EMULATORS is true, but NEXT_PUBLIC_EMULATOR_HOST is not set. Not connecting to emulators.");
    }
  } else if (allConfigPresent) { // Only log this if config was present but app init failed
    console.warn(
      "Firebase Config: Firebase app initialization failed despite config being present. Firebase services (Auth, Firestore, etc.) will not be available."
    );
  }

}

if (!allConfigPresent) { // This warning is now outside the main 'if (allConfigPresent)'
  console.warn(
    "Firebase Config: Firebase configuration is incomplete or contains empty values in .env. Firebase services (including Auth and Firestore) will not be initialized. " +
    "Please ensure all NEXT_PUBLIC_FIREBASE_ environment variables are correctly set in your .env or .env.local file for local development, " +
    "or ensure they are provided by the hosting environment upon deployment. "
  );
}


export { app, auth, db };
