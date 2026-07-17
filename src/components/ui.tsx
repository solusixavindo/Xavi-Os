import type { PropsWithChildren, ReactNode } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { C } from '../theme';

export function Brand({ small = false }: { small?: boolean }) {
  return (
    <View style={styles.brand}>
      <Image
        accessibilityLabel="Ecosystem X"
        resizeMode="contain"
        source={require('../../assets/brand/icon/app-icon.png')}
        style={[styles.mark, small && styles.smallMark]}
      />
      <Text style={[styles.brandText, small && styles.smallBrandText]}>XAVI-OS</Text>
    </View>
  );
}

export function Pill({ children, color = C.cyan }: PropsWithChildren<{ color?: string }>) {
  return (
    <View style={[styles.pill, { borderColor: `${color}55`, backgroundColor: `${color}12` }]}>
      <Text style={[styles.pillText, { color }]}>{children}</Text>
    </View>
  );
}

export function PrimaryButton({
  title,
  onPress,
  disabled = false,
  secondary = false,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        secondary && styles.secondaryButton,
        pressed && styles.buttonPressed,
        disabled && styles.buttonDisabled,
      ]}
    >
      <Text style={styles.buttonText}>{title}</Text>
      {!disabled && <Text style={styles.arrow}>→</Text>}
    </Pressable>
  );
}

export function FormField({ label, error, ...props }: TextInputProps & { label: string; error?: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        autoCorrect={false}
        placeholderTextColor={C.muted}
        style={[styles.input, error && styles.inputError]}
        {...props}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

export function MessageBox({ children, tone = 'info' }: PropsWithChildren<{ tone?: 'info' | 'error' | 'success' }>) {
  const color = tone === 'error' ? C.danger : tone === 'success' ? C.teal : C.cyan;
  return (
    <View style={[styles.message, { borderColor: `${color}88`, backgroundColor: `${color}10` }]}>
      <Text style={[styles.messageText, { color }]}>{children}</Text>
    </View>
  );
}

export function Screen({ children, centered = false }: PropsWithChildren<{ centered?: boolean }>) {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View pointerEvents="none" style={styles.glow} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[styles.page, centered && styles.centered]}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function LoadingScreen({ label = 'Memulihkan sesi aman…' }: { label?: string }) {
  return (
    <Screen centered>
      <Brand />
      <View style={styles.loadingOrb}>
        <ActivityIndicator size="large" color={C.cyan} />
      </View>
      <Text style={styles.centerMuted}>{label}</Text>
    </Screen>
  );
}

export function PageTitle({ kicker, title, description }: { kicker?: string; title: string; description?: string }) {
  return (
    <View>
      {kicker ? <Text style={styles.kicker}>{kicker}</Text> : null}
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.muted}>{description}</Text> : null}
    </View>
  );
}

export function InlineLink({ children, onPress }: { children: ReactNode; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.inlineLink}>
      <Text style={styles.linkText}>{children}</Text>
    </Pressable>
  );
}

export const ui = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  text: { color: C.text },
  muted: { color: C.muted },
  center: { textAlign: 'center' },
  card: { backgroundColor: C.panel, borderColor: C.line, borderRadius: 16, borderWidth: 1, padding: 16 },
  sectionTitle: { color: C.text, fontSize: 16, fontWeight: '800', marginBottom: 10, marginTop: 22 },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  flex: { flex: 1 },
  page: { flexGrow: 1, padding: 22, paddingBottom: 44 },
  centered: { justifyContent: 'center' },
  glow: {
    position: 'absolute',
    width: 340,
    height: 340,
    borderRadius: 200,
    backgroundColor: '#18377A',
    opacity: 0.22,
    top: -130,
    right: -130,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mark: { borderRadius: 9, height: 34, width: 34 },
  smallMark: { borderRadius: 6, height: 24, width: 24 },
  brandText: { color: C.text, fontWeight: '800', fontSize: 18, letterSpacing: 4 },
  smallBrandText: { fontSize: 13 },
  pill: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5, alignSelf: 'flex-start' },
  pillText: { fontSize: 10, fontWeight: '800' },
  button: {
    height: 54,
    borderRadius: 28,
    backgroundColor: C.violet,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    shadowColor: C.violet,
    shadowOpacity: 0.45,
    shadowRadius: 14,
  },
  secondaryButton: { backgroundColor: C.panel, borderWidth: 1, borderColor: C.line },
  buttonPressed: { transform: [{ scale: 0.98 }] },
  buttonDisabled: { opacity: 0.45 },
  buttonText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  arrow: { color: '#fff', marginLeft: 10, fontSize: 17 },
  field: { marginTop: 15 },
  label: { color: C.text, fontSize: 12, fontWeight: '700', marginBottom: 7 },
  input: {
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.line,
    backgroundColor: C.panel,
    color: C.text,
    paddingHorizontal: 14,
  },
  inputError: { borderColor: C.danger },
  errorText: { color: C.danger, fontSize: 10, marginTop: 5 },
  message: { borderWidth: 1, borderRadius: 14, padding: 12, marginTop: 14 },
  messageText: { fontSize: 11, lineHeight: 17 },
  loadingOrb: { height: 160, alignItems: 'center', justifyContent: 'center' },
  centerMuted: { color: C.muted, textAlign: 'center', lineHeight: 20 },
  kicker: { color: C.cyan, fontSize: 9, fontWeight: '900', letterSpacing: 1.3, marginTop: 18 },
  title: { fontSize: 28, color: C.text, fontWeight: '900', marginTop: 8, marginBottom: 8 },
  muted: { color: C.muted, lineHeight: 21 },
  inlineLink: { alignSelf: 'center', padding: 10, marginTop: 6 },
  linkText: { color: C.cyan, fontSize: 12, fontWeight: '800' },
});
