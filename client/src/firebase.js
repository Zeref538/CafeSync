// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCRowZzdKv_xv83mGo_gRO1PABUuEIlprA",
  authDomain: "cafesync-3b25a.firebaseapp.com",
  projectId: "cafesync-3b25a",
  storageBucket: "cafesync-3b25a.firebasestorage.app",
  messagingSenderId: "309088075415",
  appId: "1:309088075415:web:1040ee69fb6b008386f3d2",
  measurementId: "G-44DM9CR4DM"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);