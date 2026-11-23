import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Linking, Platform, Alert } from 'react-native';
import * as Location from 'expo-location';
import * as Battery from 'expo-battery';
import { doc, updateDoc } from 'firebase/firestore';
import { Shield, Lock, Clock, AlertTriangle, CheckCircle2, MapPin, RefreshCw } from 'lucide-react-native';
import { db } from '../config/firebase';
import {
  subscribeToChild,
  subscribeToChildApps,
  updateChildTelemetry,
  AppRule,
} from '../services/familyService';

interface ChildModeScreenProps {
  childId: string;
}

export default function ChildModeScreen({ childId }: ChildModeScreenProps) {
  const [childData, setChildData] = useState<any>(null);
  const [apps, setApps] = useState<AppRule[]>([]);
  const [requestSent, setRequestSent] = useState(false);
  const [gpsStatus, setGpsStatus] = useState('Ativando GPS de alta precisão...');

  useEffect(() => {
    const unsubChild = subscribeToChild(childId, setChildData);
    const unsubApps = subscribeToChildApps(childId, setApps);
    return () => {
      unsubChild();
      unsubApps();
    };
  }, [childId]);

  const getBattery = async () => {
    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && 'getBattery' in navigator) {
        const bat: any = await (navigator as any).getBattery();
        return Math.round(bat.level * 100);
      }
      const level = await Battery.getBatteryLevelAsync();
      return level >= 0 ? Math.round(level * 100) : 100;
    } catch {
      return 100;
    }
  };

  const forceGpsCapture = () => {
    setGpsStatus('Buscando satélite GPS...');
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude, longitude, accuracy } = pos.coords;
          const bat = await getBattery();
          setGpsStatus(`GPS ativo (precisão ~${Math.round(accuracy)}m)`);
          await updateChildTelemetry(
            childId,
            latitude,
            longitude,
            accuracy,
            bat,
            childData?.safeZones || []
          );
        },
        (err) => {
          setGpsStatus(`Erro GPS: ${err.message}. Ative a Localização Precisa no celular.`);
        },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 }
      );
    }
  };

  useEffect(() => {
    if (!childData) return;

    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.geolocation) {
      const watchId = navigator.geolocation.watchPosition(
        async (pos) => {
          const { latitude, longitude, accuracy } = pos.coords;
          const bat = await getBattery();
          setGpsStatus(`GPS ativo (precisão ~${Math.round(accuracy)}m)`);
          await updateChildTelemetry(
            childId,
            latitude,
            longitude,
            accuracy,
            bat,
            childData.safeZones || []
          );
        },
        (err) => {
          setGpsStatus(`Erro GPS: ${err.message}. Ative a localização do celular.`);
        },
        {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: 20000,
        }
      );

      return () => navigator.geolocation.clearWatch(watchId);
    }

    const sendNativeTelemetry = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
      const bat = await getBattery();
      setGpsStatus('GPS Nativo Ativo');
      await updateChildTelemetry(
        childId,
        loc.coords.latitude,
        loc.coords.longitude,
        loc.coords.accuracy || 10,
        bat,
        childData.safeZones || []
      );
    };

    sendNativeTelemetry();
    const interval = setInterval(sendNativeTelemetry, 15000);
    return () => clearInterval(interval);
  }, [childId, childData?.safeZones]);

  const handleOpenApp = (app: AppRule) => {
    if (app.isBlocked) {
      if (Platform.OS === 'web') {
        window.alert(`O aplicativo ${app.name} foi bloqueado pelos seus pais.`);
      } else {
        Alert.alert('Aplicativo Bloqueado', `O acesso ao ${app.name} foi bloqueado pelos seus pais.`);
      }
      return;
    }
    if (app.url) {
      Linking.openURL(app.url);
    }
  };

  const requestMoreTime = async () => {
    await updateDoc(doc(db, 'children', childId), {
      unlockRequest: { requestedAt: Date.now(), minutes: 15 },
    });
    setRequestSent(true);
  };

  if (!childData) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Sincronizando proteção...</Text>
      </View>
    );
  }

  const remaining = Math.max(0, (childData.dailyLimitMinutes || 120) - (childData.usedMinutesToday || 0));
  const isBlocked = childData.isLocked || remaining === 0;

  if (isBlocked) {
    return (
      <View style={styles.blockedContainer}>
        <Lock color="#D6AD53" size={56} />
        <Text style={styles.blockedTitle}>Tempo de Tela Encerrado</Text>
        <Text style={styles.blockedSub}>
          O aparelho foi pausado pelos responsáveis. Aproveite para descansar ou brincar offline!
        </Text>
        <TouchableOpacity style={styles.requestBtn} onPress={requestMoreTime}>
          <Text style={styles.requestBtnText}>
            {requestSent ? 'Pedido Enviado aos Pais!' : 'Pedir +15 minutos aos Pais'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 32 }}>
      <View style={styles.header}>
        <Shield color="#D6AD53" size={26} />
        <Text style={styles.headerTitle}>FAMILY GUARD KIDS</Text>
      </View>

      <View style={styles.timerCard}>
        <Clock color="#101D38" size={26} />
        <Text style={styles.greeting}>Olá, {childData.name}</Text>
        <Text style={styles.remainingLabel}>Tempo restante hoje</Text>
        <Text style={styles.remainingValue}>{remaining} min</Text>

        <View style={styles.gpsBadge}>
          <MapPin color="#059669" size={14} />
          <Text style={styles.gpsBadgeText}>{gpsStatus}</Text>
        </View>

        <TouchableOpacity style={styles.refreshGpsBtn} onPress={forceGpsCapture}>
          <RefreshCw color="#101D38" size={14} />
          <Text style={styles.refreshGpsText}>Atualizar GPS Agora</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Meus Aplicativos</Text>
      <View style={styles.appsGrid}>
        {apps.map((app) => (
          <TouchableOpacity
            key={app.packageName}
            style={[styles.appTile, app.isBlocked ? styles.appTileBlocked : styles.appTileAllowed]}
            onPress={() => handleOpenApp(app)}
          >
            {app.isBlocked ? (
              <Lock color="#DC2626" size={24} />
            ) : (
              <CheckCircle2 color="#059669" size={24} />
            )}
            <Text style={[styles.appTileName, app.isBlocked && { color: '#991B1B' }]}>{app.name}</Text>
            <Text style={[styles.appTileStatus, app.isBlocked && { color: '#DC2626' }]}>
              {app.isBlocked ? 'Bloqueado' : 'Liberado'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={styles.sosBtn}
        onPress={async () => {
          await updateDoc(doc(db, 'children', childId), {
            geofenceAlert: 'BOTÃO DE EMERGÊNCIA (SOS) ACIONADO!',
          });
          if (Platform.OS === 'web') window.alert('Alerta SOS enviado aos pais!');
        }}
      >
        <AlertTriangle color="#FFFFFF" size={22} />
        <Text style={styles.sosText}>Botão de Emergência (SOS)</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#101D38', padding: 20 },
  loadingText: { color: '#FFFFFF', textAlign: 'center', marginTop: 100, fontSize: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 24, marginBottom: 16 },
  headerTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '800', letterSpacing: 1 },
  timerCard: {
    backgroundColor: '#FFFFFF', borderRadius: 22, padding: 22, alignItems: 'center', marginBottom: 20,
  },
  greeting: { fontSize: 20, fontWeight: '700', color: '#101D38', marginTop: 8 },
  remainingLabel: { fontSize: 13, color: '#64748B', marginTop: 4 },
  remainingValue: { fontSize: 42, fontWeight: '900', color: '#101D38', marginTop: 2 },
  gpsBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#ECFDF5',
    paddingVertical: 6, paddingHorizontal: 12, borderRadius: 12, marginTop: 12,
  },
  gpsBadgeText: { color: '#065F46', fontSize: 12, fontWeight: '600' },
  refreshGpsBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10,
    backgroundColor: '#F1F5F9', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 10,
  },
  refreshGpsText: { color: '#101D38', fontSize: 12, fontWeight: '700' },
  sectionTitle: { color: '#D6AD53', fontSize: 16, fontWeight: '800', marginBottom: 12 },
  appsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 22 },
  appTile: {
    width: '48%', borderRadius: 16, padding: 16, alignItems: 'center',
  },
  appTileAllowed: { backgroundColor: '#FFFFFF' },
  appTileBlocked: { backgroundColor: '#FEE2E2', borderWidth: 1.5, borderColor: '#F87171' },
  appTileName: { fontSize: 15, fontWeight: '800', color: '#101D38', marginTop: 8 },
  appTileStatus: { fontSize: 12, fontWeight: '700', color: '#059669', marginTop: 2 },
  sosBtn: {
    backgroundColor: '#DC2626', borderRadius: 16, padding: 18,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  sosText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  blockedContainer: {
    flex: 1, backgroundColor: '#101D38', justifyContent: 'center', alignItems: 'center', padding: 28,
  },
  blockedTitle: { color: '#FFFFFF', fontSize: 24, fontWeight: '800', marginTop: 20, textAlign: 'center' },
  blockedSub: { color: '#A3B1CC', fontSize: 15, textAlign: 'center', marginTop: 10, lineHeight: 22 },
  requestBtn: {
    marginTop: 28, backgroundColor: '#D6AD53', paddingVertical: 15, paddingHorizontal: 24, borderRadius: 14,
  },
  requestBtnText: { color: '#101D38', fontWeight: '800', fontSize: 15 },
});