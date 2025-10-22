// src/services/firebase.js
import firestore from '@react-native-firebase/firestore';

// Con RN Firebase no hay que inicializar manualmente.
// Si google-services.json y el plugin están OK, firestore() ya funciona.
export { firestore };
