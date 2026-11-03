import React, { useCallback, useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { api, ApiError } from '../lib/api';
import type { Circle, CircleKind } from '../lib/types';
import { colors, space, type } from '../theme';
import { Button, Card, ErrorText, Loading, Screen, SectionTitle } from '../components/ui';

const KIND_LABEL: Record<CircleKind, string> = {
  city: 'City', profession: 'Work', alma_mater: 'Alumni', home_state: 'Home state', language: 'Language', life_stage: 'Life stage',
};

export function CirclesScreen() {
  const [mine, setMine] = useState<Circle[] | null>(null);
  const [others, setOthers] = useState<Circle[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [a, b] = await Promise.all([api.listMyCircles(), api.listOtherCircles()]);
    setMine(a);
    setOthers(b);
  }, []);
  useEffect(() => { load(); }, [load]);

  const act = async (id: string, join: boolean) => {
    setBusy(id);
    setError(null);
    try {
      await (join ? api.joinCircle(id) : api.leaveCircle(id));
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong.');
    } finally {
      setBusy(null);
    }
  };

  if (!mine) return <Loading />;
  const row = (c: Circle, joined: boolean) => (
    <Card key={c.id}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ fontWeight: '700', color: colors.ink }}>{c.name}</Text>
          <Text style={type.small}>{KIND_LABEL[c.kind]} · {c.memberCount.toLocaleString()} members</Text>
        </View>
        <Button title={joined ? 'Leave' : 'Join'} kind={joined ? 'secondary' : 'primary'} loading={busy === c.id} onPress={() => act(c.id, !joined)} />
      </View>
    </Card>
  );

  return (
    <Screen>
      <Text style={type.small}>Circles decide what you see. You're always in your own city's circle.</Text>
      <ErrorText>{error}</ErrorText>
      <SectionTitle>Joined</SectionTitle>
      {mine.map((c) => row(c, true))}
      <SectionTitle>More circles</SectionTitle>
      {others.map((c) => row(c, false))}
    </Screen>
  );
}
