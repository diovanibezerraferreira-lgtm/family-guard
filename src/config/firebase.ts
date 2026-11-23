import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBpbsnBAD4DCAE2IhplDu1q_jvwuU5ucQ8",
  authDomain: "family-guard-82cad.firebaseapp.com",
  projectId: "family-guard-82cad",
  storageBucket: "family-guard-82cad.firebasestorage.app",
  messagingSenderId: "989168915952",
  appId: "1:989168915952:web:391c8a1bbc5125401e7935",
  measurementId: "G-225PZTPK11"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);