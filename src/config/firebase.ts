import {
  getFirestore, collection, doc, setDoc, getDocs,
  query, where, updateDoc, onSnapshot, serverTimestamp
} from 'firebase/firestore';

const db = getFirestore();

export interface AppRule {
  packageName: string;
  name: string;
  category: string;
  isBlocked: boolean;
  usedMinutesToday: number;
}

export interface SafeZone {
  id: string;
  name: string;
  lat: number;
  lng: number;
  radiusMeters: number;
}

const DEFAULT_APPS: Omit<AppRule, 'usedMinutesToday'>[] = [
  { packageName: 'com.google.android.youtube', name: 'YouTube', category: 'Vídeo', isBlocked: false },
  { packageName: 'com.roblox.client', name: 'Roblox', category: 'Jogos', isBlocked: false },
  { packageName: 'com.zhiliaoapp.musically', name: 'TikTok', category: 'Social', isBlocked: true },
  { packageName: 'com.whatsapp', name: 'WhatsApp', category: 'Comunicação', isBlocked: false },
  { packageName: 'com.instagram.android', name: 'Instagram', category: 'Social', isBlocked: true },
  { packageName: 'com.android.chrome', name: 'Navegador Chrome', category: 'Web', isBlocked: false },
];

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
    safeZones: [],
    geofenceAlert: null,
    unlockRequest: null,
    createdAt: serverTimestamp(),
  });

  // Popula os aplicativos padrão na subcoleção
  for (const app of DEFAULT_APPS) {
    await setDoc(doc(db, 'children', childRef.id, 'apps', app.packageName), {
      ...app,
      usedMinutesToday: 0,
    });
  }

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

export function subscribeToChildApps(childId: string, onUpdate: (apps: AppRule[]) => void) {
  return onSnapshot(collection(db, 'children', childId, 'apps'), (snapshot) => {
    const list = snapshot.docs.map((d) => d.data() as AppRule);
    onUpdate(list);
  });
}

export async function toggleAppBlock(childId: string, packageName: string, isBlocked: boolean) {
  await updateDoc(doc(db, 'children', childId, 'apps', packageName), { isBlocked });
}

export async function addCustomAppRule(childId: string, name: string, packageName: string) {
  const cleanPkg = packageName.trim() || `custom.${name.toLowerCase().replace(/\s+/g, '')}`;
  await setDoc(doc(db, 'children', childId, 'apps', cleanPkg), {
    packageName: cleanPkg,
    name: name.trim(),
    category: 'Personalizado',
    isBlocked: true,
    usedMinutesToday: 0,
  });
}

export async function saveSafeZone(childId: string, currentZones: SafeZone[], newZone: SafeZone) {
  const updated = [...currentZones.filter((z) => z.id !== newZone.id), newZone];
  await updateDoc(doc(db, 'children', childId), { safeZones: updated });
}

export async function toggleRemoteLock(childId: string, isLocked: boolean) {
  await updateDoc(doc(db, 'children', childId), { isLocked });
}

function getDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3;
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function updateChildTelemetry(
  childId: string,
  lat: number,
  lng: number,
  batteryLevel: number,
  safeZones: SafeZone[] = []
) {
  let geofenceAlert: string | null = null;

  if (safeZones.length > 0) {
    const insideAny = safeZones.some(
      (zone) => getDistanceMeters(lat, lng, zone.lat, zone.lng) <= zone.radiusMeters
    );
    if (!insideAny) {
      geofenceAlert = `Fora das zonas seguras (${safeZones.map((z) => z.name).join(', ')})`;
    }
  }

  await updateDoc(doc(db, 'children', childId), {
    lastLocation: { lat, lng, updatedAt: Date.now() },
    batteryLevel,
    geofenceAlert,
    lastSeen: serverTimestamp(),
  });
}