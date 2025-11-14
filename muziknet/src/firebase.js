// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyArAG2-c8PoqUz445PXsFo3XEwvFkin0PI",
  authDomain: "muziknet-bbba.firebaseapp.com",
  projectId: "muziknet-bbba",
  storageBucket: "muziknet-bbba.firebasestorage.app",
  messagingSenderId: "138178666401",
  appId: "1:138178666401:web:4926759e4a5d82a991b5e0"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export Firebase services for use in the app
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();
export const db = getFirestore(app);
export const storage = getStorage(app);