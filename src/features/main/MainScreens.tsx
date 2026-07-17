import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Brand, MessageBox, Pill, PrimaryButton, ui } from '../../components/ui';
import { products } from '../../data';
import { useAuth } from '../../providers/AuthProvider';
import { C } from '../../theme';

type Space = 'Personal' | 'Business';
const rupiah = (value: number) => `Rp${value.toLocaleString('id-ID')}`;

function AppPage({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.page}>{children}</ScrollView>
    </SafeAreaView>
  );
}

export function HomeScreen() {
  const { profile } = useAuth();
  const [space, setSpace] = useState<Space>('Personal');
  const name = profile?.fullName || 'Member XAVI';
  const initials = name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();

  return (
    <AppPage>
      <View style={ui.rowBetween}>
        <View><Text style={styles.hello}>Selamat datang,</Text><Text style={styles.user}>{name}</Text></View>
        <View style={styles.avatar}><Text style={styles.avatarText}>{initials}</Text></View>
      </View>
      <View style={styles.switcher}>
        {(['Personal', 'Business'] as const).map((item) => (
          <Pressable key={item} onPress={() => setSpace(item)} style={[styles.switchOption, space === item && styles.switchActive]}>
            <Text style={[styles.switchText, space === item && styles.switchTextActive]}>{item} Space</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.wallet}>
        <View style={ui.rowBetween}><Brand small /><Pill color={C.cyan}>{(profile?.membership ?? 'basic').toUpperCase()}</Pill></View>
        <Text style={styles.walletLabel}>{space} Space</Text>
        <Text style={styles.walletTitle}>{space === 'Personal' ? 'Ekosistem personal Anda siap.' : 'Business Space segera tersedia.'}</Text>
        <Text style={styles.walletDescription}>{space === 'Personal' ? 'Data akun kini berasal dari profil terautentikasi.' : 'Entitlement dan workspace akan dikerjakan khusus pada Tahap 3.'}</Text>
      </View>
      <Text style={ui.sectionTitle}>{space === 'Personal' ? 'Untuk kebutuhanmu' : 'Bisnis dalam satu kendali'}</Text>
      <View style={styles.quickGrid}>
        {(space === 'Personal' ? [['⌂', 'Home Service'], ['✚', 'Klinik'], ['▤', 'Belanja'], ['◇', 'Academy']] : [['◎', 'CRM'], ['▣', 'Website'], ['▤', 'POS'], ['⚡', 'Automation']]).map(([icon, label]) => (
          <View style={styles.quickItem} key={label}><View style={styles.quickIcon}><Text style={styles.quickIconText}>{icon}</Text></View><Text style={styles.quickName}>{label}</Text></View>
        ))}
      </View>
      <MessageBox>Fitur transaksi, membership berbayar, workspace, dan komisi tetap nonaktif sampai tahap implementasinya selesai.</MessageBox>
    </AppPage>
  );
}

export function MarketScreen() {
  return (
    <AppPage>
      <Text style={styles.title}>Marketplace</Text>
      <TextInput style={styles.input} editable={false} placeholder="Katalog database tersedia pada Tahap 4" placeholderTextColor={C.muted} />
      <MessageBox>Katalog berikut adalah development seed. Checkout dan pembayaran tidak diaktifkan.</MessageBox>
      <View style={styles.list}>
        {products.map((product) => (
          <View key={product.id} style={styles.product}>
            <View style={styles.productArt}><Text style={styles.productIcon}>{product.icon}</Text></View>
            <View style={ui.flex}><Text style={styles.kicker}>{product.type.toUpperCase()}</Text><Text style={styles.cardTitle}>{product.name}</Text><Text style={styles.cardDescription}>{product.description}</Text><Text style={styles.price}>{rupiah(product.price)}</Text></View>
          </View>
        ))}
      </View>
    </AppPage>
  );
}

export function AiScreen() {
  return (
    <AppPage>
      <Brand />
      <View style={styles.aiOrb}><Text style={styles.aiOrbText}>✦</Text></View>
      <Text style={[styles.title, styles.center]}>Apa yang bisa saya bantu?</Text>
      <Text style={[styles.cardDescription, styles.center]}>XAVI AI akan dihubungkan ke backend terotorisasi pada tahap tersendiri.</Text>
      <TextInput style={styles.input} editable={false} placeholder="XAVI AI belum aktif" placeholderTextColor={C.muted} />
    </AppPage>
  );
}

export function NetworkScreen() {
  const { profile } = useAuth();
  return (
    <AppPage>
      <Text style={styles.title}>Jaringan & Komisi</Text>
      <View style={styles.referralCard}><Text style={styles.kicker}>KODE REFERRAL ANDA</Text><Text style={styles.referralCode}>{profile?.referralCode ?? '—'}</Text><Text style={styles.cardDescription}>Komisi tidak diberikan dari pendaftaran. Ledger transaksi akan tersedia pada Tahap 7.</Text></View>
      <MessageBox>Belum ada saldo komisi atau withdrawal pada Tahap 2.</MessageBox>
    </AppPage>
  );
}

export function AccountScreen() {
  const { profile, user, logout } = useAuth();
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function signOut() {
    setLoading(true);
    const result = await logout();
    if (!result.ok) setMessage(result.message);
    setLoading(false);
  }

  return (
    <AppPage>
      <View style={styles.profile}><View style={styles.bigAvatar}><Text style={styles.avatarText}>{profile?.fullName?.[0]?.toUpperCase() ?? 'X'}</Text></View><Text style={styles.profileName}>{profile?.fullName}</Text><Text style={styles.cardDescription}>{user?.email}</Text><Pill color={C.cyan}>{(profile?.membership ?? 'basic').toUpperCase()} MEMBER</Pill></View>
      {message ? <MessageBox tone="error">{message}</MessageBox> : null}
      <View style={ui.card}><Text style={styles.cardTitle}>Keamanan akun</Text><Text style={styles.cardDescription}>Email terverifikasi • Session tersimpan terenkripsi pada perangkat.</Text></View>
      <PrimaryButton secondary title={loading ? 'Keluar…' : 'Keluar'} disabled={loading} onPress={() => void signOut()} />
    </AppPage>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  page: { padding: 20, paddingBottom: 32 },
  hello: { color: C.muted, fontSize: 11 },
  user: { color: C.text, fontSize: 18, fontWeight: '900', marginTop: 3 },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: C.violet, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '900' },
  switcher: { height: 40, backgroundColor: C.panel, borderRadius: 20, padding: 4, flexDirection: 'row', marginTop: 17 },
  switchOption: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 17 },
  switchActive: { backgroundColor: '#24436C' },
  switchText: { color: C.muted, fontSize: 11, fontWeight: '800' },
  switchTextActive: { color: C.text },
  wallet: { marginTop: 14, borderRadius: 22, padding: 18, borderWidth: 1, borderColor: '#3E5FA5', backgroundColor: '#111B45' },
  walletLabel: { color: C.muted, fontSize: 10, marginTop: 22 },
  walletTitle: { color: C.text, fontSize: 22, fontWeight: '900', marginTop: 5 },
  walletDescription: { color: C.muted, fontSize: 11, lineHeight: 17, marginTop: 8 },
  quickGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  quickItem: { width: '24%', alignItems: 'center' },
  quickIcon: { width: 46, height: 46, borderRadius: 15, backgroundColor: C.panel, borderWidth: 1, borderColor: C.line, alignItems: 'center', justifyContent: 'center' },
  quickIconText: { color: C.cyan, fontSize: 24 },
  quickName: { color: C.text, fontSize: 9, textAlign: 'center', marginTop: 6 },
  title: { fontSize: 28, color: C.text, fontWeight: '900', marginBottom: 12 },
  center: { textAlign: 'center' },
  input: { height: 52, borderRadius: 14, borderWidth: 1, borderColor: C.line, backgroundColor: C.panel, color: C.text, paddingHorizontal: 14, marginTop: 12 },
  list: { gap: 9, marginTop: 16 },
  product: { minHeight: 104, backgroundColor: C.panel, borderWidth: 1, borderColor: C.line, borderRadius: 16, padding: 10, flexDirection: 'row', gap: 11, alignItems: 'center' },
  productArt: { width: 80, height: 80, borderRadius: 14, backgroundColor: '#163658', alignItems: 'center', justifyContent: 'center' },
  productIcon: { fontSize: 32, color: C.cyan },
  kicker: { color: C.cyan, fontSize: 9, fontWeight: '900', letterSpacing: 1.3 },
  cardTitle: { color: C.text, fontSize: 12, fontWeight: '800', marginTop: 4 },
  cardDescription: { color: C.muted, fontSize: 10, lineHeight: 15, marginTop: 4 },
  price: { color: C.text, fontSize: 12, fontWeight: '900', marginTop: 7 },
  aiOrb: { height: 210, alignItems: 'center', justifyContent: 'center' },
  aiOrbText: { fontSize: 100, color: C.cyan, textShadowColor: C.violet, textShadowRadius: 30 },
  referralCard: { padding: 18, borderRadius: 20, borderWidth: 1, borderColor: '#7657FF77', backgroundColor: '#211847' },
  referralCode: { fontSize: 30, color: C.text, fontWeight: '900', letterSpacing: 3, marginVertical: 12 },
  profile: { alignItems: 'center', gap: 8, paddingVertical: 28 },
  bigAvatar: { width: 78, height: 78, borderRadius: 39, backgroundColor: C.violet, alignItems: 'center', justifyContent: 'center' },
  profileName: { color: C.text, fontSize: 22, fontWeight: '900' },
});
