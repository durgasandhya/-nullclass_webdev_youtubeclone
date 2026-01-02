// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDHoXoYTKFawMrU-IjtEtAdBrF41PW9RPg",
  authDomain: "clone-nullclass.firebaseapp.com",
  projectId: "clone-nullclass",
  storageBucket: "clone-nullclass.firebasestorage.app",
  messagingSenderId: "625769212534",
  appId: "1:625769212534:web:e048de376df7a117498d57",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
export { auth, provider };
