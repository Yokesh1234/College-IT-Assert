
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';

// Placeholder config - in a real app, this would be in firebase-applet-config.json
const firebaseConfig = {
  apiKey: "AIzaSyCVFJKs8ZHBOGoox-hQRSYJ_oV6m-nQ_N0",
  authDomain: "it-assert.firebaseapp.com",
  databaseURL: "https://it-assert-default-rtdb.firebaseio.com",
  projectId: "it-assert",
  storageBucket: "it-assert.firebasestorage.app",
  messagingSenderId: "672715871184",
  appId: "1:672715871184:web:5463340e34f914930e9fd5"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);
