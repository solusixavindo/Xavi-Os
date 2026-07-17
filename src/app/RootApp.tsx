import { useMemo } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { readPublicEnvironment } from '../config/env';
import { getSupabaseClient } from '../lib/supabase';
import { RootNavigator } from '../navigation/RootNavigator';
import { AuthProvider } from '../providers/AuthProvider';
import { ConfigurationErrorScreen } from './ConfigurationErrorScreen';

export function RootApp() {
  const environment = useMemo(readPublicEnvironment, []);

  if (!environment.ok) {
    return (
      <SafeAreaProvider>
        <StatusBar style="light" />
        <ConfigurationErrorScreen issues={environment.issues} />
      </SafeAreaProvider>
    );
  }

  const client = getSupabaseClient(environment.value);
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <AuthProvider client={client}>
        <RootNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
