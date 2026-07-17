import { useEffect, useState } from 'react';

import { Brand, FormField, MessageBox, PageTitle, PrimaryButton, Screen } from '../../components/ui';
import { useAuth } from '../../providers/AuthProvider';
import { MembershipCards } from '../membership/MembershipCards';
import type { MembershipLevel } from '../profile/model';

export function OnboardingScreen() {
  const { profile, profileError, profileLoading, refreshProfile, completeOnboarding } = useAuth();
  const [fullName, setFullName] = useState(profile?.fullName ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [selection, setSelection] = useState<MembershipLevel>(profile?.upgradeIntent ?? 'basic');
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (profile) {
      setFullName(profile.fullName);
      setPhone(profile.phone ?? '');
      setSelection(profile.upgradeIntent ?? 'basic');
    }
  }, [profile]);

  async function submit() {
    setSubmitting(true);
    setMessage(null);
    const result = await completeOnboarding({
      fullName,
      phone: phone.replace(/[\s().-]/g, ''),
      upgradeIntent: selection === 'basic' ? null : selection,
    });
    if (!result.ok) setMessage({ text: result.message, ok: false });
    setSubmitting(false);
  }

  if (!profile && profileError) {
    return (
      <Screen centered>
        <Brand />
        <PageTitle title="Profil belum tersedia" description={profileError} />
        <PrimaryButton title={profileLoading ? 'Memuat…' : 'Coba Lagi'} disabled={profileLoading} onPress={() => void refreshProfile()} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Brand />
      <PageTitle kicker="ONBOARDING" title="Lengkapi profil Anda" description="Semua akun baru aktif sebagai Basic. Pilihan paket berbayar di bawah hanya mencatat minat upgrade." />
      {message ? <MessageBox tone={message.ok ? 'success' : 'error'}>{message.text}</MessageBox> : null}
      <FormField label="Nama lengkap" value={fullName} onChangeText={setFullName} autoComplete="name" />
      <FormField label="Nomor WhatsApp" value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoComplete="tel" placeholder="Contoh: +628123456789" />
      <PageTitle kicker="MEMBERSHIP" title="Pilih tujuan pertumbuhan" description="Basic langsung aktif. Pro, Premium, dan Platinum memerlukan pembayaran pada tahap pembayaran mendatang." />
      <MembershipCards value={selection} onChange={setSelection} />
      {selection !== 'basic' ? (
        <MessageBox>Pilihan {selection.toUpperCase()} disimpan sebagai upgrade intent, bukan membership aktif atau transaksi berbayar.</MessageBox>
      ) : null}
      <PrimaryButton title={submitting ? 'Menyimpan…' : 'Selesaikan Onboarding'} disabled={submitting || profileLoading} onPress={() => void submit()} />
    </Screen>
  );
}
