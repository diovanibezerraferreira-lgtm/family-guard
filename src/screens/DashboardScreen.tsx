import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  TextInput, Modal, Switch
} from 'react-native';
import { collection, query, where, onSnapshot, doc, updateDoc, increment } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import {
  Shield, Lock, Unlock, Plus, Clock, Battery, LogOut, Smartphone, Grid
} from 'lucide-react-native';
import { auth, db } from '../config/firebase';
import {
  createChildProfile,
  toggleRemoteLock,
  subscribeToChildApps,
  toggleAppBlock,
  addCustomAppRule,
  saveSafeZone,
  seedDefaultAppsForChild,
  AppRule,
} from '../services/familyService';
import LiveMapCard from '../components/LiveMapCard';

export default function DashboardScreen() {
  const [childrenList, setChildrenList] = useState<any[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [appsList, setAppsList] = useState<AppRule[]>([]);

  const [modalVisible, setModalVisible] = useState(false);
  const [newChildName, setNewChildName] = useState('');

  const [appModalVisible, setAppModalVisible] = useState(false);
  const [customAppName, setCustomAppName] = useState('');
  const [customAppPkg, setCustomAppPkg] = useState('');

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

  useEffect(() => {
    if (!activeChild?.id) {
      setAppsList([]);
      return;
    }
    const unsub = subscribeToChildApps(activeChild.id, setAppsList);
    return unsub;
  }, [activeChild?.id]);

  const handleAddChild = async () => {
    if (!newChildName.trim() || !parentId) return;
    const { childId } = await createChildProfile(parentId, newChildName.trim(), 120);
    setSelectedChildId(childId);
    setNewChildName('');
    setModalVisible(false);
  };

  const handleAddCustomApp = async () => {
    if (!activeChild || !customAppName.trim()) return;
    await addCustomAppRule(activeChild.id, customAppName, customAppPkg);
    setCustomAppName('');
    setCustomAppPkg('');
    setAppModalVisible(false);
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

            {/* Cartão Principal de Status e Bloqueio Geral */}
            <View style={styles.card}>
              <View style={styles.rowBetween}>
                <View>
                  <Text style={styles.childName}>{activeChild.name}</Text>
                  <Text style={styles.statusSub}>
                    {activeChild.deviceId
                      ? `Dispositivo Conectado • Código: ${activeChild.pairingCode}`
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

            {/* Limite Diário de Tela */}
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

            {/* Mapa Interativo e Cercas Virtuais */}
            <LiveMapCard
              childName={activeChild.name}
              location={activeChild.lastLocation}
              safeZones={activeChild.safeZones || []}
              geofenceAlert={activeChild.geofenceAlert || null}
              onSaveZone={(zone) => saveSafeZone(activeChild.id, activeChild.safeZones || [], zone)}
            />

            {/* Controlo Individual de Aplicativos */}
            <View style={styles.card}>
              <View style={styles.rowBetween}>
                <View style={styles.cardHeader}>
                  <Grid color="#101D38" size={20} />
                  <Text style={styles.cardTitle}>Aplicativos Permitidos / Bloqueados</Text>
                </View>
                <TouchableOpacity style={styles.smallAddBtn} onPress={() => setAppModalVisible(true)}>
                  <Plus color="#D6AD53" size={16} />
                  <Text style={styles.smallAddText}>App</Text>
                </TouchableOpacity>
              </View>

              {appsList.length === 0 && (
                <TouchableOpacity
                  style={[styles.lockBtn, { backgroundColor: '#101D38', marginTop: 8 }]}
                  onPress={() => seedDefaultAppsForChild(activeChild.id)}
                >
                  <Text style={{ color: '#D6AD53', fontWeight: '700' }}>
                    Carregar Aplicativos Padrão (YouTube, Roblox, TikTok...)
                  </Text>
                </TouchableOpacity>
              )}

              {appsList.map((app) => (
                <View key={app.packageName} style={styles.appRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.appName}>{app.name}</Text>
                    <Text style={styles.appMeta}>
                      {app.category} • {app.isBlocked ? 'Bloqueado' : 'Liberado'}
                    </Text>
                  </View>
                  <Switch
                    value={!app.isBlocked}
                    onValueChange={(allowed) => toggleAppBlock(activeChild.id, app.packageName, !allowed)}
                    trackColor={{ false: '#FCA5A5', true: '#101D38' }}
                    thumbColor={!app.isBlocked ? '#D6AD53' : '#DC2626'}
                  />
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>

      {/* Modal Adicionar Filho */}
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

      {/* Modal Adicionar App Personalizado