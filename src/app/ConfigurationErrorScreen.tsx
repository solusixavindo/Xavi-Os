import { StyleSheet, Text, View } from 'react-native';

import { Brand, MessageBox, Screen } from '../components/ui';
import { C } from '../theme';

export function ConfigurationErrorScreen({ issues }: { issues: string[] }) {
  return (
    <Screen centered>
      <Brand />
      <Text style={styles.title}>Configuration Error</Text>
      <Text style={styles.description}>XAVI-OS belum dapat terhubung dengan aman. Konfigurasi aplikasi perlu dilengkapi oleh administrator.</Text>
      <MessageBox tone="error">
        {issues.map((issue) => `• ${issue}`).join('\n')}
      </MessageBox>
      <View style={styles.notice}><Text style={styles.noticeText}>Tidak ada credential atau token yang ditampilkan pada layar ini.</Text></View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { color: C.text, fontSize: 28, fontWeight: '900', marginTop: 28 },
  description: { color: C.muted, lineHeight: 21, marginTop: 10 },
  notice: { marginTop: 16 },
  noticeText: { color: C.muted, fontSize: 10 },
});
