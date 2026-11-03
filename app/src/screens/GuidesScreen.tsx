import React from 'react';
import { Linking, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ChevronRight } from 'lucide-react-native';
import { GUIDES } from '../content/guides';
import { useApp } from '../state/AppState';
import { colors, space, type } from '../theme';
import { Button, Card, Empty, Screen } from '../components/ui';
import type { RootStackParamList, ScreenProps } from '../navigation';

export function GuidesScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { profile } = useApp();
  const sorted = [...GUIDES].sort((a, b) => Number(b.city === profile?.city) - Number(a.city === profile?.city));
  return (
    <Screen>
      <Text style={type.small}>Short, checked guides for newcomers, with links to the official sources.</Text>
      {sorted.map((g) => (
        <Card key={g.id} onPress={() => nav.navigate('Guide', { id: g.id })} accessibilityLabel={g.title}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={[type.label, { color: colors.teal }]}>{g.city.toUpperCase()}</Text>
              <Text style={{ fontSize: 17, fontWeight: '700', color: colors.ink }}>{g.title}</Text>
              <Text style={type.small}>{g.summary}</Text>
            </View>
            <ChevronRight size={20} color={colors.muted} />
          </View>
        </Card>
      ))}
    </Screen>
  );
}

export function GuideScreen({ route }: ScreenProps<'Guide'>) {
  const g = GUIDES.find((x) => x.id === route.params.id);
  if (!g) return <Screen><Empty title="Guide not found" /></Screen>;
  return (
    <Screen>
      <Text style={[type.label, { color: colors.teal }]}>{g.city.toUpperCase()}</Text>
      <Text style={type.title}>{g.title}</Text>
      <Text style={type.small}>Checked {g.checked}. Rules change, so confirm with the official site before you act.</Text>
      {g.sections.map((s) => (
        <View key={s.heading} style={{ gap: space.sm, marginTop: space.md }}>
          <Text style={type.h2}>{s.heading}</Text>
          <Text style={type.body}>{s.body}</Text>
          {s.link ? <Button title={s.link.label} kind="secondary" onPress={() => Linking.openURL(s.link!.url)} /> : null}
        </View>
      ))}
    </Screen>
  );
}
