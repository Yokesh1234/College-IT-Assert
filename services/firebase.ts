
import { initializeApp, getApp, getApps } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { getDatabase } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js';

// Double check these values in your Firebase Console -> Project Settings
const firebaseConfig = {
  apiKey: "AIzaSyD5u_H4wz2HoJt6NbL0jbVC1y0iZtJROqQ",
  authDomain: "college-it-assert.firebaseapp.com",
  databaseURL: "https://college-it-assert-default-rtdb.firebaseio.com",
  projectId: "college-it-assert",
  storageBucket: "college-it-assert.firebasestorage.app",
  messagingSenderId: "204155417502",
  appId: "1:204155417502:web:f23aa8b2ed6c88a5d79c8f"
};

// Singleton pattern for Firebase initialization
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getDatabase(app);
