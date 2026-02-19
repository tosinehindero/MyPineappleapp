import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAnalytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: "AIzaSyDSsXBZ20rXQyKMsXVvDAXIXpXKRlwfLRs",
  authDomain: "pineappleplayapp.firebaseapp.com",
  databaseURL: "https://pineappleplayapp-default-rtdb.firebaseio.com",
  projectId: "pineappleplayapp",
  storageBucket: "pineappleplayapp.firebasestorage.app",
  messagingSenderId: "23311173542",
  appId: "1:23311173542:web:77a7cf79a54f9f404c3167",
  measurementId: "G-H3HV5DLLYQ"
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Analytics (only in browser)
let analytics = null;
if (typeof window !== 'undefined') {
  analytics = getAnalytics(app);
}

export { app, auth, db, storage, analytics };
