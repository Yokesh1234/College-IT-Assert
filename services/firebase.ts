
import { initializeApp, getApp, getApps } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { getDatabase } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js';

// Double check these values in your Firebase Console -> Project Settings
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
// Singleton pattern for Firebase initialization
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getDatabase(app);
