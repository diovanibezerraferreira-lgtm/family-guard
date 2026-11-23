import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBpbsnBAD4DCAE2IhplDu1q_jvwuU5ucQ8",
  authDomain: "family-guard-82cad.firebaseapp.com",
  projectId: "family-guard-82cad",
  storageBucket: "family-guard-82cad.firebasestorage.app",
  messagingSenderId: "989168915952",
  appId: "1:989168915952:web:391c8a1bbc5125401e7935",
  measurementId: "G-225PZTPK11"
};

function getFirebaseApp(): FirebaseApp {
  if (getApps().length > 0) {
    return getApp();
  }
  return initializeApp(firebaseConfig);
}

const app = getFirebaseApp();

export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);