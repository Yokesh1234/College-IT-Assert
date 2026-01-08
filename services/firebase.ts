
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { getDatabase } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js';

// Replace these with your actual Firebase project configuration
const firebaseConfig = {

  apiKey: "AIzaSyD5u_H4wz2HoJt6NbL0jbVC1y0iZtJROqQ",

  authDomain: "college-it-assert.firebaseapp.com",

  databaseURL: "https://college-it-assert-default-rtdb.firebaseio.com",

  projectId: "college-it-assert",

  storageBucket: "college-it-assert.firebasestorage.app",

  messagingSenderId: "204155417502",

  appId: "1:204155417502:web:f23aa8b2ed6c88a5d79c8f"

};


const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);
