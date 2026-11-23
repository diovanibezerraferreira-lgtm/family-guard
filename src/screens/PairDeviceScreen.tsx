import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Link2, ArrowLeft } from 'lucide-react-native';
import { pairChildDevice } from '../services/familyService';

interface PairDeviceScreenProps {
  onPaired: (childId: string) => void;
  onBack: () => void;
}

export default function PairDeviceScreen({ onPaired, onBack }: PairDeviceScreenProps) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePair = async () => {
    if (code.trim().length !== 6) {
      Alert.alert('Código incompleto', 'Digite os 6 números exibidos no celular dos pais.');
      return;
    }

    setLoading(true);
    try {
      const deviceId = `device_${Date.now()}`;
      const childId = await pairChildDevice(code, deviceId);
      await AsyncStorage.setItem('@family_guard_child_id', childId);
      onPaired(childId);
    } catch (error: any) {
      Alert.alert('Falha no pareamento', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={onBack} style={styles.backBtn}>
        <ArrowLeft color="#FFFFFF" size={24} />
        <Text style={styles.backText}>Voltar</Text>
      </TouchableOpacity>

      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <Link2 color="#D6AD53" size={36} />
        </View>
        <Text style={styles.title}>Vincular Aparelho</Text>
        <Text style={styles.subtitle}>
          Abra o FAMILY GUARD no celular dos pais, adicione um perfil e digite o código de 6 dígitos abaixo.
        </Text>

        <TextInput
          style={styles.codeInput}
          placeholder="000000"
          placeholderTextColor="#556585"
          keyboardType="number-pad"
          maxLength={6}
          value={code}
          onChangeText={setCode}
        />

        <TouchableOpacity style={styles.pairBtn} onPress={handlePair} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#101D38" />
          ) : (
            <Text style={styles.pairBtnText}>Conectar ao Painel dos Pais</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#101D38', padding: 24 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 32 },
  backText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  iconCircle: {
    width: 76, height: 76, borderRadius: 38, backgroundColor: '#182A4E',
    alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#D6AD53',
    marginBottom: 20,
  },
  title: { color: '#FFFFFF', fontSize: 24, fontWeight: '800', marginBottom: 8 },
  subtitle: { color: '#A3B1CC', fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 28 },
  codeInput: {
    backgroundColor: '#182A4E', color: '#D6AD53', fontSize: 32, fontWeight: '800',
    letterSpacing: 10, textAlign: 'center', borderRadius: 16, paddingVertical: 16,
    paddingHorizontal: 24, width: '85%', borderWidth: 1.5, borderColor: '#D6AD53', marginBottom: 24,
  },
  pairBtn: {
    backgroundColor: '#D6AD53', borderRadius: 14, paddingVertical: 16,
    paddingHorizontal: 32, width: '85%', alignItems: 'center',
  },
  pairBtnText: { color: '#101D38', fontSize: 16, fontWeight: '700' },
});