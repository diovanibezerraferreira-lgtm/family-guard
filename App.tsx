import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from './src/config/firebase';
import AuthScreen from './src/screens/AuthScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import PairDeviceScreen from './src/screens/PairDeviceScreen';
import ChildModeScreen from './src/screens/ChildModeScreen';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isChildSetupMode, setIsChildSetupMode] = useState(false);
  const [pairedChildId, setPairedChildId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#101D38', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#D6AD53" />
      </View>
    );
  }

  if (pairedChildId) {
    return <ChildModeScreen childId={pairedChildId} />;
  }

  if (isChildSetupMode) {
    return (
      <PairDeviceScreen
        onPaired={(childId) => {
          setPairedChildId(childId);
          setIsChildSetupMode(false);
        }}
        onBack={() => setIsChildSetupMode(false)}
      />
    );
  }

  if (user && !user.isAnonymous) {
    return <DashboardScreen />;
  }

  return <AuthScreen onSelectChildMode={() => setIsChildSetupMode(true)} />;
}