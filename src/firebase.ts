import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyDSeIyIlXqrJFRFEbmD5XEJsgrE11MRygI",
  authDomain: "ohmy4team.firebaseapp.com",
  projectId: "ohmy4team",
  storageBucket: "ohmy4team.firebasestorage.app",
  messagingSenderId: "1093361440796",
  appId: "1:1093361440796:web:dcd1eec4abef8b6546a7d9",
  measurementId: "G-Y75SMN4YT1"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export default app;
