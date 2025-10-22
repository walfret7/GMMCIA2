import { firestore } from './firebase';

export async function getAllHospitals() {
  const snap = await firestore().collection('hospitals').orderBy('name').get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}