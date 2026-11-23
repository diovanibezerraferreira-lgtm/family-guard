import React, { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth } from './src/config/firebase';
import AuthScreen from './src/screens/AuthScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import PairDeviceScreen from './src/screens/PairDeviceScreen';
import ChildModeScreen from './src/screens/ChildModeScreen';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [childId, setChildId] = useState<string | null>(null);
  const [pairingFlow, setPairingFlow] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('@family_guard_child_id').then((savedId) => {
      if (savedId) setChildId(savedId);
    });

    const unsub = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return unsub;
  }, []);

  if (childId) {
    return <ChildModeScreen childId={childId} />;
  }

  if (pairingFlow) {
    return (
      <PairDeviceScreen
        onPaired={(id) => {
          setChildId(id);
          setPairingFlow(false);
        }}
        onBack={() => setPairingFlow(false)}
      />
    );
  }

  if (user && !user.isAnonymous) {
    return <DashboardScreen />;
  }

  return <AuthScreen onSelectChildMode={() => setPairingFlow(true)} />;
}