import React, { useCallback, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { BookOpen, ChevronRight, Siren } from 'lucide-react-native';
import { api, ApiError } from '../lib/api';
import { timeAgo } from '../lib/format';
import type { ServiceRequest } from '../lib/types';
import { GUIDES } from '../content/guides';
import { SERVICE_GROUPS, SERVICES, TIERS, type Tier } from '../content/services';
import { useApp } from '../state/AppState';
import { colors, radius, space, type } from '../theme';
import { Button, Card, ErrorText, Screen, SectionTitle } from '../components/ui';
import type { RootStackParamList } from '../navigation';

export const STATUS_LABEL: Record<ServiceRequest['status'], { text: string; bg: string; fg: string }> = {
  received: { text: 'Received', bg: colors.saffronTint, fg: colors.saffron },
  in_progress: { text: 'In progress', bg: colors.tealTint, fg: colors.teal },
  done: { text: 'Done', bg: colors.goodTint, fg: colors.good },
  declined: { text: 'Not possible', bg: colors.bg, fg: colors.muted },
};

export const TIER_COLOR: Record<Tier['id'], string> = { free: colors.muted, basic: colors.teal, essential: colors.saffron, emergency: colors.sos };

export function TierPill({ tier }: { tier: Tier['id'] }) {
  const t = TIERS.find((x) => x.id === tier)!;
  return (
    <View style={{ alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill, borderWidth: 1, borderColor: TIER_COLOR[tier] }}>
      <Text style={{ fontSize: 11, fontWeight: '700', color: TIER_COLOR[tier] }}>{t.name.toUpperCase()}</Text>
    </View>
  );
}

export function ServicesScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { profile } = useApp();
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(useCallback(() => { api.listServiceRequests().then(setRequests).catch(() => {}); }, []));

  const withdraw = async (id: string) => {
    setError(null);
    try {
      await api.withdrawServiceRequest(id);
      setRequests((x) => x.filter((r) => r.id !== id));
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not withdraw the request.');
    }
  };

  const guides = [...GUIDES].sort((a, b) => Number(b.city === profile?.city) - Number(a.city === profile?.city));

  return (
    <Screen>
      <Text style={type.body}>Help at both ends of the family, from verified members and licensed partners.</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.md, paddingRight: space.lg }}>
        {TIERS.map((t) => (
          <View key={t.id} style={{
            width: 264, backgroundColor: colors.surface, borderRadius: radius.md, padding: space.lg, gap: space.sm,
            borderWidth: t.id === 'free' ? 2 : 1, borderColor: t.id === 'free' ? colors.teal : colors.line,
          }}>
            <Text style={[type.label, { color: TIER_COLOR[t.id] }]}>{t.name.toUpperCase()}</Text>
            <Text style={type.h2}>{t.tagline}</Text>
            <Text style={type.small}>{t.forWhom}</Text>
            {t.highlights.map((h) => (
              <Text key={h} style={{ fontSize: 14, lineHeight: 20, color: colors.ink }}>{'· '}{h}</Text>
            ))}
            <Text style={{ marginTop: 'auto', fontWeight: '700', color: t.id === 'free' ? colors.teal : colors.ink }}>{t.status}</Text>
          </View>
        ))}
      </ScrollView>
      <Text style={type.small}>During the pilot, requests are free to make. We tell you the cost before anything is booked.</Text>

      {requests.length ? <SectionTitle>Your requests</SectionTitle> : null}
      <ErrorText>{error}</ErrorText>
      {requests.map((r) => {
        const svc = SERVICES.find((s) => s.id === r.serviceId);
        const st = STATUS_LABEL[r.status];
        return (
          <Card key={r.id}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.sm }}>
              <Text style={{ fontWeight: '700', color: colors.ink, flex: 1 }}>{svc?.title ?? 'Service request'}</Text>
              <View style={{ backgroundColor: st.bg, paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill }}>
                <Text style={{ color: st.fg, fontSize: 12, fontWeight: '700' }}>{st.text}</Text>
              </View>
            </View>
            <Text style={type.small} numberOfLines={2}>{r.details}</Text>
            <Text style={type.small}>Sent {timeAgo(r.createdAt)} · reply {r.contactMethod === 'phone' ? 'by phone' : 'in the app'}</Text>
            {r.status === 'received' ? <Button title="Withdraw" kind="ghost" onPress={() => withdraw(r.id)} /> : null}
          </Card>
        );
      })}

      {SERVICE_GROUPS.map((g) => {
        const items = SERVICES.filter((s) => s.group === g.id);
        return (
          <View key={g.id} style={{ gap: space.sm }}>
            <SectionTitle>{g.title}</SectionTitle>
            <Text style={type.small}>{g.body}</Text>
            {items.map((s) => (
              <Card key={s.id} onPress={() => nav.navigate('ServiceRequest', { serviceId: s.id })} accessibilityLabel={s.title}
                style={s.urgent ? { borderColor: colors.sos } : undefined}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
                  {s.urgent ? <Siren size={20} color={colors.sos} /> : null}
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={{ fontWeight: '700', color: colors.ink, fontSize: 16 }}>{s.title}</Text>
                    <Text style={type.small}>{s.summary}</Text>
                    <TierPill tier={s.tier} />
                  </View>
                  <ChevronRight size={20} color={colors.muted} />
                </View>
              </Card>
            ))}
          </View>
        );
      })}

      <SectionTitle>Newcomer guides</SectionTitle>
      {guides.map((g) => (
        <Card key={g.id} onPress={() => nav.navigate('Guide', { id: g.id })} accessibilityLabel={g.title}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
            <BookOpen size={20} color={colors.teal} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ fontWeight: '700', color: colors.ink }}>{g.title}</Text>
              <Text style={type.small}>{g.summary}</Text>
            </View>
            <ChevronRight size={20} color={colors.muted} />
          </View>
        </Card>
      ))}

      <Text style={[type.small, { marginTop: space.lg }]}>
        Services are delivered by licensed partners: assistance providers, hospitals, care firms, chartered accountants, lawyers and property managers. Advice on tax, money and law comes from those regulated partners, not from us.
      </Text>
    </Screen>
  );
}
