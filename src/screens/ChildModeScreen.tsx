import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import * as Location from 'expo-location';
import * as Battery from 'expo-battery';
import { doc, updateDoc } from 'firebase/firestore';
import { Shield, Lock, Clock, AlertTriangle } from 'lucide-react-native';
import { db } from '../config/firebase';
import { subscribeToChild, updateChildTelemetry } from '../services/familyService';

interface ChildModeScreenProps {
  childId: string;
}

export default function ChildModeScreen({ childId }: ChildModeScreenProps) {
  const [childData, setChildData] = useState<any>(null);

  useEffect(() => {
    const unsub = subscribeToChild(childId, setChildData);
    return unsub;
  }, [childId]);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    const sendTelemetry = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;

        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const batLevel = await Battery.getBatteryLevelAsync();
        const batteryPercent = batLevel >= 0 ? Math.round(batLevel * 100) : 100;

        await updateChildTelemetry(childId, loc.coords.latitude, loc.coords.longitude, batteryPercent);
      } catch (e) {
        // Silencia falhas temporárias de rede/GPS
      }
    };

    sendTelemetry();
    interval = setInterval(sendTelemetry, 30000);
    return () => clearInterval(interval);
  }, [childId]);

  const requestMoreTime = async () => {
    await updateDoc(doc(db, 'children', childId), {
      unlockRequest: { requestedAt: Date.now(), minutes: 15 },
    });
    Alert.alert('Pedido enviado!', 'Seus pais receberam a solicitação de +15 minutos.');
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
          <Text style={styles.requestBtnText}>Pedir +15 minutos aos Pais</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Shield color="#D6AD53" size={28} />
        <Text style={styles.headerTitle}>FAMILY GUARD KIDS</Text>
      </View>

      <View style={styles.timerCard}>
        <Clock color="#101D38" size={28} />
        <Text style={styles.greeting}>Olá, {childData.name}</Text>
        <Text style={styles.remainingLabel}>Tempo restante hoje</Text>
        <Text style={styles.remainingValue}>{remaining} min</Text>
      </View>

      <TouchableOpacity
        style={styles.sosBtn}
        onPress={() => Alert.alert('Alerta SOS', 'Localização de emergência enviada aos pais!')}
      >
        <AlertTriangle color="#FFFFFF" size={22} />
        <Text style={styles.sosText}>Botão de Emergência (SOS)</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#101D38', padding: 24, justifyContent: 'space-between' },
  loadingText: { color: '#FFFFFF', textAlign: 'center', marginTop: 100, fontSize: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 40 },
  headerTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '800', letterSpacing: 1 },
  timerCard: {
    backgroundColor: '#FFFFFF', borderRadius: 24, padding: 32, alignItems: 'center',
  },
  greeting: { fontSize: 20, fontWeight: '700', color: '#101D38', marginTop: 12 },
  remainingLabel: { fontSize: 14, color: '#64748B', marginTop: 6 },
  remainingValue: { fontSize: 48, fontWeight: '900', color: '#101D38', marginTop: 4 },
  sosBtn: {
    backgroundColor: '#DC2626', borderRadius: 16, padding: 18,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 20,
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