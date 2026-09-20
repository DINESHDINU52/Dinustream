import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app: FirebaseApp | null = null;
let firestore: Firestore | null = null;

export function isFirebaseConfigured(): boolean {
  return Boolean(
    firebaseConfig.apiKey &&
    firebaseConfig.projectId &&
    !firebaseConfig.apiKey.startsWith('your_') &&
    !firebaseConfig.apiKey.includes('placeholder')
  );
}

if (typeof window !== 'undefined') {
  try {
    if (isFirebaseConfigured()) {
      if (getApps().length === 0) {
        app = initializeApp(firebaseConfig);
      } else {
        app = getApps()[0];
      }
      if (app) {
        firestore = getFirestore(app);
      }
    } else {
      console.info(
        '[Firebase] Cloud credentials not configured in environment; Watch Together running on resilient local real-time synchronization.'
      );
    }
  } catch (error) {
    console.warn('[Firebase] Initialization skipped; falling back to local real-time channel.', error);
  }
}

export { app, firestore };
