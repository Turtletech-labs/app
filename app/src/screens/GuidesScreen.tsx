import React from 'react';
import { Linking, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Ambulance, Bus, FileText, Flag, Hash, Hospital, House, Landmark, Stamp, Stethoscope,
} from 'lucide-react-native';
import { GUIDES, type GuideIcon } from '../content/guides';
import { colors, radius, space, type } from '../theme';
import { Banner, Button, Card, Empty, Screen } from '../components/ui';
import type { RootStackParamList, ScreenProps } from '../navigation';

const ICONS: Record<GuideIcon, React.ComponentType<{ size?: number; color?: string }>> = {
  bus: Bus, stamp: Stamp, hash: Hash, landmark: Landmark, stethoscope: Stethoscope,
  hospital: Hospital, flag: Flag, house: House, ambulance: Ambulance, 'file-text': FileText,
};

// A guide is a set of tiles in the order people usually need them.
export function GuideScreen({ route }: ScreenProps<'Guide'>) {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const g = GUIDES.find((x) => x.id === route.params.id);
  if (!g) return <Screen><Empty title="Guide not found" /></Screen>;
  return (
    <Screen>
      <Text style={[type.label, { color: colors.teal }]}>{g.country.toUpperCase()}</Text>
      <Text style={type.title}>{g.title}</Text>
      <Text style={type.small}>
        Do these roughly in the order shown. Checked {g.checked}. Rules change, so confirm with the official site before you act.
      </Text>
      <Banner tone="danger" title="In an emergency">{g.emergency}</Banner>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: space.md }}>
        {g.topics.map((t, i) => {
          const Icon = ICONS[t.icon];
          return (
            <Card
              key={t.id}
              style={{ width: '48.5%', gap: space.sm }}
              onPress={() => nav.navigate('GuideTopic', { guideId: g.id, topicId: t.id })}
              accessibilityLabel={`Step ${i + 1}: ${t.title}`}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ width: 28, height: 28, borderRadius: radius.pill, backgroundColor: colors.tealTint, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontWeight: '700', color: colors.teal }}>{i + 1}</Text>
                </View>
                <Icon size={22} color={colors.teal} />
              </View>
              <Text style={{ fontSize: 16, fontWeight: '700', color: colors.ink }}>{t.title}</Text>
              <Text style={type.small}>{t.blurb}</Text>
            </Card>
          );
        })}
      </View>
    </Screen>
  );
}

function Block({ title, items, numbered, tinted }: { title: string; items: string[]; numbered?: boolean; tinted?: boolean }) {
  const body = (
    <View style={{ gap: space.sm }}>
      <Text style={type.h2}>{title}</Text>
      {items.map((x, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: space.sm }}>
          <Text style={[type.body, { width: 20, fontWeight: numbered ? '700' : '400', color: numbered ? colors.teal : colors.ink }]}>{numbered ? `${i + 1}.` : '•'}</Text>
          <Text style={[type.body, { flex: 1 }]}>{x}</Text>
        </View>
      ))}
    </View>
  );
  return tinted ? <Card style={{ backgroundColor: colors.tealTint, borderColor: colors.tealTint }}>{body}</Card> : body;
}

// One tile opened: what to do, what to bring, practical tips and official links.
export function GuideTopicScreen({ route }: ScreenProps<'GuideTopic'>) {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const g = GUIDES.find((x) => x.id === route.params.guideId);
  const index = g ? g.topics.findIndex((x) => x.id === route.params.topicId) : -1;
  if (!g || index < 0) return <Screen><Empty title="Guide not found" /></Screen>;
  const t = g.topics[index];
  const next = g.topics[index + 1];
  return (
    <Screen>
      <Text style={[type.label, { color: colors.teal }]}>{g.country.toUpperCase()} · STEP {index + 1} OF {g.topics.length}</Text>
      <Text style={type.title}>{t.title}</Text>
      <Text style={type.body}>{t.intro}</Text>

      <Block title="What to do" items={t.steps} numbered />
      {t.bring?.length ? <Block title="Bring" items={t.bring} /> : null}
      {t.contact?.length ? <Block title="Contact" items={t.contact} /> : null}
      {t.tips?.length ? <Block title="Practical tips" items={t.tips} tinted /> : null}
      {t.watchOut?.length ? (
        <Banner tone="warn" title="Watch out">
          <View style={{ gap: 4 }}>
            {t.watchOut.map((x) => <Text key={x} style={{ color: colors.ink, fontSize: 14, lineHeight: 20 }}>{x}</Text>)}
          </View>
        </Banner>
      ) : null}

      <View style={{ gap: space.sm }}>
        <Text style={type.h2}>Official links</Text>
        {t.links.map((l) => (
          <Button key={l.url} title={l.label} kind="secondary" onPress={() => Linking.openURL(l.url)} />
        ))}
      </View>

      <Text style={type.small}>Checked {g.checked}. Rules change, so confirm with the official site before you act.</Text>
      {next ? (
        <Button title={`Next: ${next.title}`} onPress={() => nav.replace('GuideTopic', { guideId: g.id, topicId: next.id })} />
      ) : (
        <Button title="Back to all steps" kind="secondary" onPress={() => nav.goBack()} />
      )}
    </Screen>
  );
}
