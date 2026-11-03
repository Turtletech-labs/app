import React, { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { api, ApiError } from '../lib/api';
import { timeAgo } from '../lib/format';
import type { ChatRequest, Conversation } from '../lib/types';
import { scamWarnings } from '../lib/safety';
import { colors, space, type } from '../theme';
import { Avatar, Banner, Button, Card, Empty, ErrorText, Loading, PersonLine, Screen, SectionTitle } from '../components/ui';
import type { RootStackParamList } from '../navigation';

export function MessagesScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [requests, setRequests] = useState<{ incoming: ChatRequest[]; outgoing: ChatRequest[] } | null>(null);
  const [convs, setConvs] = useState<Conversation[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [r, c] = await Promise.all([api.listChatRequests(), api.listConversations()]);
    setRequests(r);
    setConvs(c);
  }, []);

  useFocusEffect(useCallback(() => { load().catch(() => setRequests({ incoming: [], outgoing: [] })); }, [load]));

  const respond = async (r: ChatRequest, accept: boolean) => {
    setBusyId(r.id);
    setError(null);
    try {
      const convId = await api.respondChatRequest(r.id, accept);
      await load();
      if (convId) nav.navigate('Chat', { id: convId, name: r.from.displayName, otherId: r.from.id });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not answer the request.');
    } finally {
      setBusyId(null);
    }
  };

  if (!requests) return <Loading />;

  return (
    <Screen>
      <Text style={type.small}>Nobody can message you until you accept their request. There's no forwarding, so what you say stays in the chat.</Text>
      <ErrorText>{error}</ErrorText>

      {requests.incoming.length ? <SectionTitle>Requests</SectionTitle> : null}
      {requests.incoming.map((r) => {
        const warn = scamWarnings(r.note);
        return (
          <Card key={r.id}>
            <PersonLine person={r.from} sub={`${r.from.city} · ${timeAgo(r.createdAt)}`} />
            <Text style={type.body}>{r.note}</Text>
            {warn.length ? <Banner>{warn[0].text}</Banner> : null}
            <View style={{ flexDirection: 'row', gap: space.sm }}>
              <Button title="Accept" style={{ flex: 1 }} loading={busyId === r.id} onPress={() => respond(r, true)} />
              <Button title="Decline" kind="secondary" style={{ flex: 1 }} disabled={busyId === r.id} onPress={() => respond(r, false)} />
            </View>
            <Text style={[type.small, { color: colors.teal }]} onPress={() => nav.navigate('Member', { id: r.from.id })} accessibilityRole="button">View profile, block or report</Text>
          </Card>
        );
      })}

      <SectionTitle>Chats</SectionTitle>
      {convs.length === 0 ? (
        <Empty title="No chats yet" body="To talk to someone, open their profile from a post and send a short chat request." />
      ) : (
        convs.map((c) => (
          <Card key={c.id} onPress={() => nav.navigate('Chat', { id: c.id, name: c.other.displayName, otherId: c.other.id })} accessibilityLabel={`Chat with ${c.other.displayName}`}>
            <View style={{ flexDirection: 'row', gap: space.md, alignItems: 'center' }}>
              <Avatar name={c.other.displayName} />
              <View style={{ flex: 1, gap: 2 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontWeight: '700', color: colors.ink }}>{c.other.displayName}</Text>
                  <Text style={type.small}>{timeAgo(c.updatedAt)}</Text>
                </View>
                <Text style={type.small} numberOfLines={1}>{c.lastMessage}</Text>
              </View>
            </View>
          </Card>
        ))
      )}

      {requests.outgoing.length ? <SectionTitle>Waiting for an answer</SectionTitle> : null}
      {requests.outgoing.map((r) => (
        <Card key={r.id}>
          <PersonLine person={r.to} sub={`Sent ${timeAgo(r.createdAt)}`} />
          <Text style={type.small}>{r.note}</Text>
        </Card>
      ))}
    </Screen>
  );
}
