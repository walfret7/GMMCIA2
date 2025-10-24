import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

export const calcBMI = (weightKg, heightM) => {
  if (heightM <= 0) return 0;
  return Number((weightKg / (heightM * heightM)).toFixed(1));
};

export const categorizeBMI = (bmi) => {
  if (bmi < 18.5) return 'bajo';
  if (bmi < 25) return 'normal';
  if (bmi < 30) return 'sobrepeso';
  return 'obesidad';
};

export const saveBMIEntry = async ({ weightKg, heightM }) => {
  const user = auth().currentUser;
  if (!user) throw new Error('No authenticated user');

  const bmi = calcBMI(weightKg, heightM);
  const category = categorizeBMI(bmi);

  const ref = firestore()
    .collection('users')
    .doc(user.uid)
    .collection('bmiMeasurements');

  await ref.add({
    weightKg,
    heightM,
    bmi,
    category,
    notedAt: firestore.FieldValue.serverTimestamp(),
  });
};

export const listenBMIHistory = (onData, onError) => {
  const user = auth().currentUser;
  if (!user) throw new Error('No authenticated user');

  const ref = firestore()
    .collection('users')
    .doc(user.uid)
    .collection('bmiMeasurements')
    .orderBy('notedAt', 'desc');

  return ref.onSnapshot(
    (snap) => {
      const items = [];
      snap.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() });
      });
      onData(items);
    },
    (err) => onError && onError(err)
  );
};
