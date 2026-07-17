import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Pill } from '../../components/ui';
import { C } from '../../theme';
import type { MembershipLevel } from '../profile/model';
import { membershipPlans } from './plans';

const rupiah = (value: number) => `Rp${value.toLocaleString('id-ID')}`;

export function MembershipCards({ value, onChange }: { value: MembershipLevel; onChange: (value: MembershipLevel) => void }) {
  return (
    <View>
      {membershipPlans.map((plan) => {
        const selected = plan.id === value;
        return (
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            key={plan.id}
            onPress={() => onChange(plan.id)}
            style={[styles.card, selected && { borderColor: plan.color, backgroundColor: `${plan.color}10` }]}
          >
            <View style={[styles.radio, selected && { borderColor: plan.color, backgroundColor: plan.color }]}>
              {selected ? <Text style={styles.check}>✓</Text> : null}
            </View>
            <View style={styles.content}>
              <View style={styles.row}>
                <Text style={styles.name}>{plan.name}</Text>
                {plan.id === 'premium' ? <Pill color={plan.color}>TERPOPULER</Pill> : null}
              </View>
              <Text style={styles.headline}>{plan.headline}</Text>
              <Text style={styles.benefits}>{plan.benefits.join(' • ')}</Text>
            </View>
            <View>
              <Text style={[styles.price, { color: plan.color }]}>{plan.price ? rupiah(plan.price) : 'Gratis'}</Text>
              {plan.price ? <Text style={styles.period}>/bulan</Text> : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 17,
    backgroundColor: C.panel,
    padding: 14,
    marginTop: 10,
  },
  radio: {
    width: 21,
    height: 21,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: C.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  check: { color: C.bg, fontWeight: '900' },
  content: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  name: { color: C.text, fontSize: 16, fontWeight: '900' },
  headline: { color: C.muted, fontSize: 11, marginVertical: 5 },
  benefits: { color: C.muted, fontSize: 9, lineHeight: 14 },
  price: { fontSize: 13, fontWeight: '900' },
  period: { color: C.muted, fontSize: 8, textAlign: 'right' },
});
