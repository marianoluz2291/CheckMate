import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
// import { initializeApp } from "firebase/app";
// import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDHmkuj1TeCCGSgIiwd3kcRHe_qVE0BFyQ",
  authDomain: "checkmate-141f1.firebaseapp.com",
  projectId: "checkmate-141f1",
  storageBucket: "checkmate-141f1.firebasestorage.app",
  messagingSenderId: "1024033109489",
  appId: "1:1024033109489:web:d8a7941adaf01b8ff04050",
  measurementId: "G-MD4V2BDH5T"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

export { firebase };