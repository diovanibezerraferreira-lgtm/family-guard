import { 
  getFirestore, collection, doc, setDoc, getDocs, 
  query, where, updateDoc, onSnapshot, serverTimestamp 
} from 'firebase/firestore';

const db = getFirestore();

export async function createChildProfile(parentId: string, name: string, dailyLimitMinutes = 120) {
  const pairingCode = Math.floor(100000 + Math.random() * 900000).toString();
  const childRef = doc(collection(db, 'children'));

  await setDoc(childRef, {
    id: childRef.id,
    parentId,
    name,
    pairingCode,
    deviceId: null,
    isLocked: false,
    dailyLimitMinutes,
    usedMinutesToday: 0,
    bedtimeEnabled: true,
    bedtimeStart: '21:30',
    bedtimeEnd: '07:00',
    batteryLevel: 100,
    lastLocation: null,
    unlockRequest: null,
    createdAt: serverTimestamp(),
  });

  return { childId: childRef.id, pairingCode };
}

export async function pairChildDevice(pairingCode: string, deviceId: string) {
  const q = query(collection(db, 'children'), where('pairingCode', '==', pairingCode.trim()));
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    throw new Error('Código inválido ou expirado. Verifique no celular dos pais.');
  }

  const childDoc = snapshot.docs[0];
  await updateDoc(childDoc.ref, {
    deviceId,
    lastSeen: serverTimestamp(),
  });

  return childDoc.id;
}

export function subscribeToChild(childId: string, onUpdate: (data: any) => void) {
  return onSnapshot(doc(db, 'children', childId), (snapshot) => {
    if (snapshot.exists()) {
      onUpdate({ id: snapshot.id, ...snapshot.data() });
    }
  });
}

export async function toggleRemoteLock(childId: string, isLocked: boolean) {
  await updateDoc(doc(db, 'children', childId), { isLocked });
}

export async function updateChildTelemetry(
  childId: string, 
  lat: number, 
  lng: number, 
  batteryLevel: number
) {
  await updateDoc(doc(db, 'children', childId), {
    lastLocation: { lat, lng, updatedAt: Date.now() },
    batteryLevel,
    lastSeen: serverTimestamp(),
  });
}