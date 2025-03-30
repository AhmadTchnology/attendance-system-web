import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCiVnCg2YWwxxd31sr_Bq3cLohdf4pK6l0",
  authDomain: "dulir-d2095.firebaseapp.com",
  projectId: "dulir-d2095",
  storageBucket: "dulir-d2095.appspot.com",
  messagingSenderId: "987504584869",
  appId: "1:987504584869:web:9ceb469b0301cce92b454c",
  measurementId: "G-T37C87DHY6"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;