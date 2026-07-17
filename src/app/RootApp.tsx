import { useCallback, useMemo, useRef } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { readPublicEnvironment } from '../config/env';
import { BrandIntroGate } from '../features/branding/BrandIntro';
import { getSupabaseClient } from '../lib/supabase';
import { RootNavigator } from '../navigation/RootNavigator';
import { AuthProvider } from '../providers/AuthProvider';
import { ConfigurationErrorScreen } from './ConfigurationErrorScreen';

void SplashScreen.preventAutoHideAsync().catch(() => undefined);
SplashScreen.setOptions({ duration: 180, fade: true });

export function RootApp() {
  const environment = useMemo(readPublicEnvironment, []);
  const splashHidden = useRef(false);
  const hideNativeSplash = useCallback(() => {
    if (splashHidden.current) return;
    splashHidden.current = true;
    void SplashScreen.hideAsync().catch(() => SplashScreen.hide());
  }, []);

  if (!environment.ok) {
    return (
      <View onLayout={hideNativeSplash} style={styles.root}>
        <SafeAreaProvider>
          <StatusBar backgroundColor="#050B18" style="light" />
          <BrandIntroGate>
            <ConfigurationErrorScreen issues={environment.issues} />
          </BrandIntroGate>
        </SafeAreaProvider>
      </View>
    );
  }

  const client = getSupabaseClient(environment.value);
  return (
    <View onLayout={hideNativeSplash} style={styles.root}>
      <SafeAreaProvider>
        <StatusBar backgroundColor="#050B18" style="light" />
        <AuthProvider client={client}>
          <BrandIntroGate>
            <RootNavigator />
          </BrandIntroGate>
        </AuthProvider>
      </SafeAreaProvider>
    </View>
  );
}

const styles = StyleSheet.create({ root: { backgroundColor: '#050B18', flex: 1 } });
