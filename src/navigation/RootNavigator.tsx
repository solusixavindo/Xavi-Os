import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DarkTheme, NavigationContainer, type Theme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text } from 'react-native';

import { LoadingScreen } from '../components/ui';
import {
  ForgotPasswordScreen,
  LoginScreen,
  RegisterScreen,
  ResetPasswordScreen,
  VerificationScreen,
  WelcomeScreen,
} from '../features/auth/screens/AuthScreens';
import { AccountScreen, AiScreen, HomeScreen, MarketScreen, NetworkScreen } from '../features/main/MainScreens';
import { OnboardingScreen } from '../features/onboarding/OnboardingScreen';
import { isProfileComplete } from '../features/profile/model';
import { useAuth } from '../providers/AuthProvider';
import { C } from '../theme';
import { resolveRootRoute } from './routeState';
import type { AuthStackParamList, MainTabParamList } from './types';

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const GateStack = createNativeStackNavigator();
const Tabs = createBottomTabNavigator<MainTabParamList>();

const midnightTheme: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: C.cyan,
    background: C.bg,
    card: '#050B18',
    text: C.text,
    border: C.line,
    notification: C.violet,
  },
};

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerStyle: { backgroundColor: C.bg }, headerTintColor: C.text, headerShadowVisible: false }}>
      <AuthStack.Screen name="Welcome" component={WelcomeScreen} options={{ headerShown: false }} />
      <AuthStack.Screen name="Login" component={LoginScreen} options={{ title: 'Masuk' }} />
      <AuthStack.Screen name="Register" component={RegisterScreen} options={{ title: 'Daftar' }} />
      <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={{ title: 'Lupa Password' }} />
    </AuthStack.Navigator>
  );
}

const tabIcons: Record<keyof MainTabParamList, string> = {
  Home: '⌂',
  Market: '▤',
  AI: '✦',
  Network: '⌘',
  Account: '♙',
};

function MainNavigator() {
  return (
    <Tabs.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: C.cyan,
        tabBarInactiveTintColor: C.muted,
        tabBarStyle: { backgroundColor: '#050B18', borderTopColor: C.line, height: 72, paddingTop: 7 },
        tabBarLabelStyle: { fontSize: 9, paddingBottom: 8 },
        tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 21 }}>{tabIcons[route.name]}</Text>,
      })}
    >
      <Tabs.Screen name="Home" component={HomeScreen} options={{ title: 'Beranda' }} />
      <Tabs.Screen name="Market" component={MarketScreen} options={{ title: 'Market' }} />
      <Tabs.Screen name="AI" component={AiScreen} options={{ title: 'XAVI AI' }} />
      <Tabs.Screen name="Network" component={NetworkScreen} options={{ title: 'Jaringan' }} />
      <Tabs.Screen name="Account" component={AccountScreen} options={{ title: 'Akun' }} />
    </Tabs.Navigator>
  );
}

export function RootNavigator() {
  const auth = useAuth();
  const route = resolveRootRoute({
    initializing: auth.initializing,
    passwordRecovery: auth.passwordRecovery,
    hasSession: Boolean(auth.session),
    emailVerified: Boolean(auth.user?.email_confirmed_at),
    pendingVerification: Boolean(auth.pendingVerificationEmail),
    profileLoading: auth.profileLoading,
    profileComplete: isProfileComplete(auth.profile),
  });

  return (
    <NavigationContainer theme={midnightTheme}>
      <GateStack.Navigator key={route} screenOptions={{ headerShown: false, animation: 'fade' }}>
        {route === 'loading' ? <GateStack.Screen name="Loading" component={LoadingScreen} /> : null}
        {route === 'auth' ? <GateStack.Screen name="Auth" component={AuthNavigator} /> : null}
        {route === 'verification' ? <GateStack.Screen name="Verification" component={VerificationScreen} /> : null}
        {route === 'passwordRecovery' ? <GateStack.Screen name="PasswordRecovery" component={ResetPasswordScreen} /> : null}
        {route === 'onboarding' ? <GateStack.Screen name="Onboarding" component={OnboardingScreen} /> : null}
        {route === 'main' ? <GateStack.Screen name="Main" component={MainNavigator} /> : null}
      </GateStack.Navigator>
    </NavigationContainer>
  );
}
