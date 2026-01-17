// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAoipn4JbNduL9djpbiTzpcgExA1Gdwwec",
  authDomain: "trackr-dev-9469b.firebaseapp.com",
  projectId: "trackr-dev-9469b",
  storageBucket: "trackr-dev-9469b.firebasestorage.app",
  messagingSenderId: "845236777077",
  appId: "1:845236777077:web:0841bfc0ae346d7ad1483c",
  measurementId: "G-NGNCZMSRKN"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);