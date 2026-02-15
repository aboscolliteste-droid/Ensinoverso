
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDmoiv6inxkoKmT9YQDcxm30Y0Bs_ByGjU",
  authDomain: "ensinoverso-f1d81.firebaseapp.com",
  projectId: "ensinoverso-f1d81",
  storageBucket: "ensinoverso-f1d81.firebasestorage.app",
  messagingSenderId: "870972643126",
  appId: "1:870972643126:web:4f7cbc0093a1ae85d74597"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
