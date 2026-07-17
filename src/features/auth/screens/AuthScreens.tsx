import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Brand, FormField, InlineLink, MessageBox, PageTitle, PrimaryButton, Screen } from '../../../components/ui';
import { useAuth } from '../../../providers/AuthProvider';
import { C } from '../../../theme';
import type { AuthStackParamList } from '../../../navigation/types';
import {
  firstValidationErrors,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from '../validation';

type FieldErrors = Record<string, string>;

export function WelcomeScreen({ navigation }: NativeStackScreenProps<AuthStackParamList, 'Welcome'>) {
  const { authNotice } = useAuth();
  return (
    <Screen centered>
      <Brand />
      <View style={styles.hero}>
        <Text style={styles.heroX}>X</Text>
      </View>
      <Text style={styles.heroTitle}>Satu Aplikasi.{`\n`}Seluruh Ekosistem.</Text>
      <Text style={styles.centerMuted}>Satu akun untuk kebutuhan personal, bisnis, dan seluruh ekosistem Xavindo.</Text>
      {authNotice ? <MessageBox tone="error">{authNotice}</MessageBox> : null}
      <PrimaryButton title="Masuk" onPress={() => navigation.navigate('Login')} />
      <PrimaryButton title="Buat Akun" secondary onPress={() => navigation.navigate('Register')} />
    </Screen>
  );
}

export function LoginScreen({ navigation }: NativeStackScreenProps<AuthStackParamList, 'Login'>) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setErrors(firstValidationErrors(parsed.error));
      return;
    }
    setErrors({});
    setMessage(null);
    setLoading(true);
    const result = await signIn(parsed.data);
    if (!result.ok) setMessage(result.message);
    setLoading(false);
  }

  return (
    <Screen>
      <Brand />
      <PageTitle title="Masuk ke XAVI-OS" description="Gunakan email yang telah terdaftar." />
      {message ? <MessageBox tone="error">{message}</MessageBox> : null}
      <FormField
        label="Email"
        value={email}
        onChangeText={setEmail}
        error={errors.email}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
      />
      <FormField
        label="Password"
        value={password}
        onChangeText={setPassword}
        error={errors.password}
        secureTextEntry
        autoCapitalize="none"
        autoComplete="current-password"
      />
      <InlineLink onPress={() => navigation.navigate('ForgotPassword')}>Lupa password?</InlineLink>
      <PrimaryButton title={loading ? 'Memproses…' : 'Masuk'} disabled={loading} onPress={() => void submit()} />
      <InlineLink onPress={() => navigation.navigate('Register')}>Belum punya akun? Daftar</InlineLink>
    </Screen>
  );
}

export function RegisterScreen({ navigation }: NativeStackScreenProps<AuthStackParamList, 'Register'>) {
  const { signUp } = useAuth();
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    referralCode: '',
    acceptedTerms: false,
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const update = (key: keyof typeof form, value: string | boolean) => setForm((current) => ({ ...current, [key]: value }));

  async function submit() {
    const parsed = registerSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(firstValidationErrors(parsed.error));
      return;
    }
    setErrors({});
    setMessage(null);
    setLoading(true);
    const result = await signUp(parsed.data);
    if (!result.ok) setMessage(result.message);
    setLoading(false);
  }

  return (
    <Screen>
      <Brand />
      <PageTitle title="Buat akun XAVI-OS" description="Email perlu diverifikasi sebelum akun dapat digunakan." />
      {message ? <MessageBox tone="error">{message}</MessageBox> : null}
      <FormField label="Nama lengkap" value={form.fullName} onChangeText={(value) => update('fullName', value)} error={errors.fullName} autoComplete="name" />
      <FormField label="Email" value={form.email} onChangeText={(value) => update('email', value)} error={errors.email} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
      <FormField label="Nomor WhatsApp" value={form.phone} onChangeText={(value) => update('phone', value)} error={errors.phone} keyboardType="phone-pad" autoComplete="tel" placeholder="Contoh: +628123456789" />
      <FormField label="Password" value={form.password} onChangeText={(value) => update('password', value)} error={errors.password} secureTextEntry autoCapitalize="none" autoComplete="new-password" />
      <FormField label="Konfirmasi password" value={form.confirmPassword} onChangeText={(value) => update('confirmPassword', value)} error={errors.confirmPassword} secureTextEntry autoCapitalize="none" autoComplete="new-password" />
      <FormField label="Kode referral (opsional)" value={form.referralCode} onChangeText={(value) => update('referralCode', value.toUpperCase())} error={errors.referralCode} autoCapitalize="characters" maxLength={12} />
      <Pressable style={styles.termsRow} onPress={() => update('acceptedTerms', !form.acceptedTerms)} accessibilityRole="checkbox" accessibilityState={{ checked: form.acceptedTerms }}>
        <View style={[styles.checkbox, form.acceptedTerms && styles.checkboxChecked]}><Text>{form.acceptedTerms ? '✓' : ''}</Text></View>
        <Text style={styles.termsText}>Saya menyetujui Syarat Layanan dan Kebijakan Privasi XAVI-OS.</Text>
      </Pressable>
      {errors.acceptedTerms ? <Text style={styles.validationText}>{errors.acceptedTerms}</Text> : null}
      <PrimaryButton title={loading ? 'Membuat akun…' : 'Daftar & Verifikasi Email'} disabled={loading} onPress={() => void submit()} />
      <InlineLink onPress={() => navigation.navigate('Login')}>Sudah punya akun? Masuk</InlineLink>
    </Screen>
  );
}

export function ForgotPasswordScreen() {
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    const parsed = forgotPasswordSchema.safeParse({ email });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message);
      return;
    }
    setError(undefined);
    setLoading(true);
    const result = await requestPasswordReset(parsed.data.email);
    setMessage({ text: result.message ?? '', ok: result.ok });
    setLoading(false);
  }

  return (
    <Screen>
      <Brand />
      <PageTitle title="Reset password" description="Kami akan mengirim tautan reset ke email akun Anda." />
      {message ? <MessageBox tone={message.ok ? 'success' : 'error'}>{message.text}</MessageBox> : null}
      <FormField label="Email" value={email} onChangeText={setEmail} error={error} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
      <PrimaryButton title={loading ? 'Mengirim…' : 'Kirim Tautan Reset'} disabled={loading} onPress={() => void submit()} />
    </Screen>
  );
}

export function VerificationScreen() {
  const { pendingVerificationEmail, resendVerification, checkVerification, logout } = useAuth();
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [loading, setLoading] = useState(false);

  async function run(action: () => Promise<{ ok: boolean; message?: string }>) {
    setLoading(true);
    const result = await action();
    setMessage({ text: result.message ?? '', ok: result.ok });
    setLoading(false);
  }

  return (
    <Screen centered>
      <Brand />
      <View style={styles.mailOrb}><Text style={styles.mailIcon}>✉</Text></View>
      <PageTitle kicker="VERIFIKASI EMAIL" title="Periksa kotak masuk Anda" description={pendingVerificationEmail ? `Tautan verifikasi dikirim ke ${pendingVerificationEmail}.` : 'Buka tautan verifikasi yang dikirim oleh XAVI-OS.'} />
      {message?.text ? <MessageBox tone={message.ok ? 'success' : 'error'}>{message.text}</MessageBox> : null}
      <PrimaryButton title={loading ? 'Memeriksa…' : 'Saya Sudah Verifikasi'} disabled={loading} onPress={() => void run(checkVerification)} />
      <PrimaryButton title="Kirim Ulang Email" secondary disabled={loading} onPress={() => void run(resendVerification)} />
      <InlineLink onPress={() => void logout()}>Kembali ke halaman masuk</InlineLink>
    </Screen>
  );
}

export function ResetPasswordScreen() {
  const { updatePassword } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    const parsed = resetPasswordSchema.safeParse({ password, confirmPassword });
    if (!parsed.success) {
      setErrors(firstValidationErrors(parsed.error));
      return;
    }
    setErrors({});
    setLoading(true);
    const result = await updatePassword(parsed.data.password);
    setMessage({ text: result.message ?? '', ok: result.ok });
    setLoading(false);
  }

  return (
    <Screen centered>
      <Brand />
      <PageTitle title="Buat password baru" description="Gunakan password unik minimal 8 karakter." />
      {message?.text ? <MessageBox tone={message.ok ? 'success' : 'error'}>{message.text}</MessageBox> : null}
      <FormField label="Password baru" value={password} onChangeText={setPassword} error={errors.password} secureTextEntry autoComplete="new-password" />
      <FormField label="Konfirmasi password" value={confirmPassword} onChangeText={setConfirmPassword} error={errors.confirmPassword} secureTextEntry autoComplete="new-password" />
      <PrimaryButton title={loading ? 'Menyimpan…' : 'Simpan Password Baru'} disabled={loading} onPress={() => void submit()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { height: 190, alignItems: 'center', justifyContent: 'center' },
  heroX: { fontSize: 150, fontWeight: '200', color: C.cyan, textShadowColor: C.violet, textShadowRadius: 28 },
  heroTitle: { fontSize: 30, color: C.text, fontWeight: '900', textAlign: 'center', lineHeight: 36 },
  centerMuted: { color: C.muted, textAlign: 'center', lineHeight: 20, marginVertical: 10 },
  termsRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 18 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 1, borderColor: C.muted, alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: C.cyan, borderColor: C.cyan },
  termsText: { flex: 1, color: C.muted, fontSize: 11, lineHeight: 16 },
  validationText: { color: C.danger, fontSize: 10, marginTop: 5 },
  mailOrb: { height: 150, alignItems: 'center', justifyContent: 'center' },
  mailIcon: { color: C.cyan, fontSize: 80, textShadowColor: C.violet, textShadowRadius: 28 },
});
