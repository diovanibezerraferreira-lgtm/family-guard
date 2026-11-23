import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Shield, Smartphone, UserCheck } from 'lucide-react-native';
import { auth, db } from '../config/firebase';

interface AuthScreenProps {
  onSelectChildMode: () => void;
}

export default function AuthScreen({ onSelectChildMode }: AuthScreenProps) {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const showError = (msg: string) => {
    setErrorMsg(msg);
  };

  const handleParentAuth = async () => {
    setErrorMsg(null);
    if (!email.trim() || !password.trim()) {
      showError('Preencha e-mail e senha (mínimo 6 caracteres).');
      return;
    }

    setLoading(true);
    try {
      if (isRegister) {
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        await setDoc(doc(db, 'users', cred.user.uid), {
          name: name.trim() || 'Responsável',
          email: email.trim(),
          createdAt: serverTimestamp(),
        });
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
    } catch (error: any) {
      if (error.code === 'auth/api-key-not-valid.-please-pass-a-valid-api-key.') {
        showError('Configure suas chaves reais do Firebase em src/config/firebase.ts.');
      } else if (error.code === 'auth/operation-not-allowed') {
        showError('Ative o login por E-mail/Senha no Console do Firebase.');
      } else if (error.code === 'auth/weak-password') {
        showError('A senha precisa ter pelo menos 6 caracteres.');
      } else if (error.code === 'auth/email-already-in-use') {
        showError('Este e-mail já está cadastrado. Clique em "Já tem conta? Fazer login".');
      } else {
        showError(error.message || 'Erro ao autenticar. Verifique sua conexão e chaves do Firebase.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEnterAsChild = async () => {
    setErrorMsg(null);
    setLoading(true);
    try {
      await signInAnonymously(auth);
      onSelectChildMode();
    } catch (error: any) {
      showError(error.message || 'Ative o login Anônimo no Console do Firebase.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.header}>
        <View style={styles.logoBadge}>
          <Shield color="#D6AD53" size={38} />
        </View>
        <Text style={styles.brandTitle}>FAMILY GUARD</Text>
        <Text style={styles.brandSubtitle}>Proteção digital e localização em tempo real</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          {isRegister ? 'Criar Conta dos Pais' : 'Acesso dos Pais'}
        </Text>

        {isRegister && (
          <TextInput
            style={styles.input}
            placeholder="Seu nome"
            placeholderTextColor="#7A869A"
            value={name}
            onChangeText={setName}
          />
        )}

        <TextInput
          style={styles.input}
          placeholder="E-mail"
          placeholderTextColor="#7A869A"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />

        <TextInput
          style={styles.input}
          placeholder="Senha"
          placeholderTextColor="#7A869A"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        {errorMsg && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={handleParentAuth}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#101D38" />
          ) : (
            <>
              <UserCheck color="#101D38" size={20} />
              <Text style={styles.primaryBtnText}>
                {isRegister ? 'Cadastrar e Entrar' : 'Entrar no Painel'}
              </Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            setErrorMsg(null);
            setIsRegister(!isRegister);
          }}
          style={styles.switchLink}
        >
          <Text style={styles.switchLinkText}>
            {isRegister ? 'Já tem conta? Fazer login' : 'Primeiro acesso? Criar conta'}
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.childModeBtn} onPress={handleEnterAsChild} disabled={loading}>
        <Smartphone color="#D6AD53" size={20} />
        <Text style={styles.childModeBtnText}>Este é o celular da Criança</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#101D38', justifyContent: 'center', padding: 24 },
  header: { alignItems: 'center', marginBottom: 28 },
  logoBadge: {
    width: 72, height: 72, borderRadius: 20, backgroundColor: '#182A4E',
    alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#D6AD53',
    marginBottom: 12,
  },
  brandTitle: { color: '#FFFFFF', fontSize: 26, fontWeight: '800', letterSpacing: 1.5 },
  brandSubtitle: { color: '#A3B1CC', fontSize: 13, marginTop: 4 },
  card: {
    backgroundColor: '#FFFFFF', borderRadius: 20, padding: 22,
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10, elevation: 5,
  },
  cardTitle: { fontSize: 18, fontWeight: '700', color: '#101D38', marginBottom: 16 },
  input: {
    backgroundColor: '#F4F6FA', borderRadius: 12, padding: 14,
    fontSize: 15, color: '#101D38', marginBottom: 12, borderWidth: 1, borderColor: '#E1E6F0',
  },
  errorBox: {
    backgroundColor: '#FEE2E2', borderRadius: 10, padding: 12,
    marginBottom: 12, borderWidth: 1, borderColor: '#F87171',
  },
  errorText: { color: '#B91C1C', fontSize: 13, fontWeight: '600' },
  primaryBtn: {
    backgroundColor: '#D6AD53', borderRadius: 12, padding: 15,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 4,
  },
  primaryBtnText: { color: '#101D38', fontSize: 16, fontWeight: '700' },
  switchLink: { marginTop: 14, alignItems: 'center' },
  switchLinkText: { color: '#101D38', fontSize: 13, fontWeight: '600' },
  childModeBtn: {
    marginTop: 24, borderWidth: 1.5, borderColor: '#D6AD53', borderRadius: 14,
    padding: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  childModeBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
});