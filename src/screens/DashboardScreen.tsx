import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  TextInput, Modal, Alert
} from 'react-native';
import { collection, query, where, onSnapshot, doc, updateDoc, increment } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import {
  Shield, Lock, Unlock, Plus, Clock, MapPin, Battery, LogOut, Smartphone
} from 'lucide-react-native';
import { auth, db } from '../config/firebase';
import { createChildProfile, toggleRemoteLock } from '../services/familyService';

export default function DashboardScreen() {
  const [childrenList, setChildrenList] = useState<any[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [newChildName, setNewChildName] = useState('');

  const parentId = auth.currentUser?.uid;

  useEffect(() => {
    if (!parentId) return;
    const q = query(collection(db, 'children'), where('parentId', '==', parentId));
    const unsub = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      setChildrenList(list);
      if (list.length > 0 && !selectedChildId) {
        setSelectedChildId(list[0].id);
      }
    });
    return unsub;
  }, [parentId]);

  const activeChild = childrenList.find((c) => c.id === selectedChildId) || childrenList[0];

  const handleAddChild = async () => {
    if (!newChildName.trim() || !parentId) return;
    try {
      const { childId, pairingCode } = await createChildProfile(parentId, newChildName.trim(), 120);
      setSelectedChildId(childId);
      setNewChildName('');
      setModalVisible(false);
      Alert.alert(
        'Perfil Criado!',
        `Digite o código ${pairingCode} no celular de ${newChildName.trim()} para vincular.`
      );
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível criar o perfil.');
    }
  };

  const adjustTimeLimit = async (deltaMinutes: number) => {
    if (!activeChild) return;
    const nextLimit = Math.max(15, (activeChild.dailyLimitMinutes || 120) + deltaMinutes);
    await updateDoc(doc(db, 'children', activeChild.id), { dailyLimitMinutes: nextLimit });
  };

  const approveExtraTime = async () => {
    if (!activeChild) return;
    await updateDoc(doc(db, 'children', activeChild.id), {
      dailyLimitMinutes: increment(15),
      isLocked: false,
      unlockRequest: null,
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <View style={styles.brandRow}>
          <Shield color="#D6AD53" size={24} />
          <Text style={styles.topTitle}>FAMILY GUARD</Text>
        </View>
        <TouchableOpacity onPress={() => signOut(auth)}>
          <LogOut color="#FFFFFF" size={22} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.childTabs}>
          {childrenList.map((child) => (
            <TouchableOpacity
              key={child.id}
              style={[styles.childPill, activeChild?.id === child.id && styles.childPillActive]}
              onPress={() => setSelectedChildId(child.id)}
            >
              <Text style={[styles.childPillText, activeChild?.id === child.id && styles.childPillTextActive]}>
                {child.name}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.addPill} onPress={() => setModalVisible(true)}>
            <Plus color="#D6AD53" size={18} />
            <Text style={styles.addPillText}>Adicionar Filho</Text>
          </TouchableOpacity>
        </ScrollView>

        {!activeChild ? (
          <View style={styles.emptyBox}>
            <Smartphone color="#D6AD53" size={42} />
            <Text style={styles.emptyTitle}>Nenhum dispositivo vinculado</Text>
            <Text style={styles.emptySub}>Toque em "Adicionar Filho" para gerar seu código de pareamento.</Text>
          </View>
        ) : (
          <>
            {activeChild.unlockRequest && (
              <View style={styles.alertBanner}>
                <Text style={styles.alertText}>
                  {activeChild.name} pediu +15 minutos extras de tela!
                </Text>
                <TouchableOpacity style={styles.approveBtn} onPress={approveExtraTime}>
                  <Text style={styles.approveBtnText}>Liberar +15m</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.card}>
              <View style={styles.rowBetween}>
                <View>
                  <Text style={styles.childName}>{activeChild.name}</Text>
                  <Text style={styles.statusSub}>
                    {activeChild.deviceId
                      ? 'Dispositivo Conectado'
                      : `Aguardando pareamento • Código: ${activeChild.pairingCode}`}
                  </Text>
                </View>
                <View style={styles.batteryBadge}>
                  <Battery color="#101D38" size={16} />
                  <Text style={styles.batteryText}>{activeChild.batteryLevel ?? 100}%</Text>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.lockBtn, activeChild.isLocked ? styles.unlockMode : styles.lockMode]}
                onPress={() => toggleRemoteLock(activeChild.id, !activeChild.isLocked)}
              >
                {activeChild.isLocked ? <Unlock color="#101D38" size={20} /> : <Lock color="#FFFFFF" size={20} />}
                <Text style={[styles.lockBtnText, activeChild.isLocked && { color: '#101D38' }]}>
                  {activeChild.isLocked ? 'Desbloquear Celular Agora' : 'Bloquear Celular Imediatamente'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Clock color="#101D38" size={20} />
                <Text style={styles.cardTitle}>Limite Diário de Tela</Text>
              </View>
              <Text style={styles.timeValue}>
                {activeChild.usedMinutesToday || 0} min usados / {activeChild.dailyLimitMinutes} min permitidos
              </Text>
              <View style={styles.timeActions}>
                <TouchableOpacity style={styles.timeBtn} onPress={() => adjustTimeLimit(-15)}>
                  <Text style={styles.timeBtnText}>- 15 min</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.timeBtn} onPress={() => adjustTimeLimit(15)}>
                  <Text style={styles.timeBtnText}>+ 15 min</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <MapPin color="#101D38" size={20} />
                <Text style={styles.cardTitle}>Localização GPS ao Vivo</Text>
              </View>
              {activeChild.lastLocation ? (
                <Text style={styles.gpsCoords}>
                  Lat: {activeChild.lastLocation.lat.toFixed(5)} | Lng: {activeChild.lastLocation.lng.toFixed(5)}
                </Text>
              ) : (
                <Text style={styles.statusSub}>Aguardando sinal GPS do celular da criança...</Text>
              )}
            </View>
          </>
        )}
      </ScrollView>

      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.cardTitle}>Novo Perfil de Filho(a)</Text>
            <TextInput
              style={styles.input}
              placeholder="Nome da criança"
              value={newChildName}
              onChangeText={setNewChildName}
            />
            <View style={styles.rowBetween}>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.cancelBtn}>
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleAddChild} style={styles.confirmBtn}>
                <Text style={styles.confirmBtnText}>Gerar Código</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F6FA' },
  topBar: {
    backgroundColor: '#101D38', paddingTop: 52, paddingBottom: 18, paddingHorizontal: 20,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  topTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '800', letterSpacing: 1 },
  scrollContent: { padding: 16 },
  childTabs: { flexDirection: 'row', marginBottom: 16 },
  childPill: {
    backgroundColor: '#FFFFFF', paddingVertical: 10, paddingHorizontal: 18,
    borderRadius: 20, marginRight: 10, borderWidth: 1, borderColor: '#DCE2EE',
  },
  childPillActive: { backgroundColor: '#101D38', borderColor: '#101D38' },
  childPillText: { color: '#101D38', fontWeight: '700' },
  childPillTextActive: { color: '#D6AD53' },
  addPill: {
    backgroundColor: '#101D38', paddingVertical: 10, paddingHorizontal: 16,
    borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  addPillText: { color: '#FFFFFF', fontWeight: '600' },
  emptyBox: {
    backgroundColor: '#FFFFFF', borderRadius: 18, padding: 32, alignItems: 'center', marginTop: 20,
  },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#101D38', marginTop: 12 },
  emptySub: { fontSize: 13, color: '#64748B', textAlign: 'center', marginTop: 6 },
  alertBanner: {
    backgroundColor: '#FEF3C7', borderColor: '#D6AD53', borderWidth: 1.5,
    borderRadius: 14, padding: 14, marginBottom: 14,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  alertText: { color: '#101D38', fontWeight: '700', flex: 1, marginRight: 10 },
  approveBtn: { backgroundColor: '#101D38', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10 },
  approveBtnText: { color: '#D6AD53', fontWeight: '700', fontSize: 13 },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 18, padding: 18, marginBottom: 14,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  childName: { fontSize: 20, fontWeight: '800', color: '#101D38' },
  statusSub: { fontSize: 13, color: '#64748B', marginTop: 2 },
  batteryBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#F1F5F9', paddingVertical: 6, paddingHorizontal: 10, borderRadius: 10,
  },
  batteryText: { color: '#101D38', fontWeight: '700', fontSize: 13 },
  lockBtn: {
    marginTop: 16, borderRadius: 12, padding: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  lockMode: { backgroundColor: '#DC2626' },
  unlockMode: { backgroundColor: '#D6AD53' },
  lockBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 15 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#101D38' },
  timeValue: { fontSize: 15, color: '#334155', fontWeight: '600', marginBottom: 12 },
  timeActions: { flexDirection: 'row', gap: 10 },
  timeBtn: {
    flex: 1, backgroundColor: '#101D38', padding: 12, borderRadius: 10, alignItems: 'center',
  },
  timeBtnText: { color: '#D6AD53', fontWeight: '700' },
  gpsCoords: { fontSize: 14, color: '#101D38', fontWeight: '600' },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(16, 29, 56, 0.7)', justifyContent: 'center', padding: 24,
  },
  modalCard: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 20 },
  input: {
    borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 10, padding: 12,
    marginVertical: 14, fontSize: 15,
  },
  cancelBtn: { padding: 12 },
  cancelBtnText: { color: '#64748B', fontWeight: '600' },
  confirmBtn: { backgroundColor: '#101D38', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10 },
  confirmBtnText: { color: '#D6AD53', fontWeight: '700' },
});