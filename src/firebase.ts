import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: 'AIzaSyAl5mDKmxjIzucWaQuX4M0eIoPg1qUVYZo',
  authDomain: 'my-budget-104ad.firebaseapp.com',
  databaseURL: 'https://my-budget-104ad-default-rtdb.firebaseio.com',
  projectId: 'my-budget-104ad',
  storageBucket: 'my-budget-104ad.firebasestorage.app',
  messagingSenderId: '858149313901',
  appId: '1:858149313901:web:c2e0ba0250c5ab3bc04e64',
  measurementId: 'G-FSCD37LQ3Z',
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getDatabase(app);
