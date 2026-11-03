import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ban, Flag, Send } from 'lucide-react-native';
import { api, ApiError } from '../lib/api';
import { timeAgo } from '../lib/format';
import type { Message } from '../lib/types';
import { scamWarnings } from '../lib/safety';
import { useApp } from '../state/AppState';
import { colors, maxWidth, radius, space, type } from '../theme';
import { Banner, Button, ErrorText, Loading, Sheet } from '../components/ui';
import { ReportSheet } from '../components/ReportSheet';
import type { ScreenProps } from '../navigation';

export function ChatScreen({ route, navigation }: ScreenProps<'Chat'>) {
  const { id, name, otherId } = route.params;
  const { profile } = useApp();
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [menu, setMenu] = useState(false);
  const [confirmBlock, setConfirmBlock] = useState(false);
  const [report, setReport] = useState<{ target: 'message' | 'profile'; id: string } | null>(null);
  const scroller = useRef<React.ComponentRef<typeof ScrollView>>(null);

  const load = useCallback(async () => setMessages(await api.listMessages(id)), [id]);

  useEffect(() => {
    load().catch((e) => setError(e instanceof ApiError ? e.message : 'Could not load this chat.'));
    const off = api.subscribeMessages(id, (m) => setMessages((cur) => (cur && !cur.some((x) => x.id === m.id) ? [...cur, m] : cur)));
    return off;
  }, [id, load]);

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable onPress={() => setMenu(true)} accessibilityRole="button" accessibilityLabel="Safety options" hitSlop={10}>
          <Text style={{ color: colors.teal, fontWeight: '600' }}>Safety</Text>
        </Pressable>
      ),
    });
  }, [navigation]);

  const draftWarnings = useMemo(() => scamWarnings(draft).filter((w) => w.kind === 'otp' || w.kind === 'money'), [draft]);

  const send = async () => {
    if (!draft.trim()) return;
    setSending(true);
    setError(null);
    try {
      const m = await api.sendMessage(id, draft);
      setMessages((cur) => (cur && !cur.some((x) => x.id === m.id) ? [...cur, m] : cur));
      setDraft('');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not send. Try again.');
    } finally {
      setSending(false);
    }
  };

  const block = async () => {
    try {
      await api.blockUser(otherId);
      setConfirmBlock(false);
      setMenu(false);
      navigation.goBack();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not block. Try again.');
    }
  };

  if (!messages) return error ? <View style={{ padding: space.lg }}><ErrorText>{error}</ErrorText></View> : <Loading />;

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <ScrollView ref={scroller} contentContainerStyle={{ padding: space.lg, gap: space.sm, width: '100%', maxWidth, alignSelf: 'center' }}
        onContentSizeChange={() => scroller.current?.scrollToEnd({ animated: false })}>
        {messages.map((m) => {
          const mine = m.senderId === profile?.id;
          const warns = mine ? [] : scamWarnings(m.body);
          return (
            <View key={m.id} style={{ alignItems: mine ? 'flex-end' : 'flex-start', gap: 4 }}>
              <Pressable
                onLongPress={mine ? undefined : () => setReport({ target: 'message', id: m.id })}
                accessibilityHint={mine ? undefined : 'Long press to report this message'}
                style={{
                  maxWidth: '82%', padding: space.md, borderRadius: radius.md,
                  backgroundColor: mine ? colors.teal : colors.surface, borderWidth: mine ? 0 : 1, borderColor: warns.length ? colors.saffron : colors.line,
                }}
              >
                <Text selectable={false} style={{ color: mine ? colors.white : colors.ink, fontSize: 15, lineHeight: 21 }}>{m.body}</Text>
              </Pressable>
              <Text style={[type.small, { fontSize: 11 }]}>{timeAgo(m.createdAt)}</Text>
              {warns.map((w) => (
                <View key={w.kind} style={{ maxWidth: '90%' }}><Banner>{w.text}</Banner></View>
              ))}
            </View>
          );
        })}
      </ScrollView>
      <View style={{ borderTopWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, paddingBottom: insets.bottom }}>
        <View style={{ width: '100%', maxWidth, alignSelf: 'center', padding: space.md, gap: space.sm }}>
          {draftWarnings.length ? <Banner>{draftWarnings[0].text}</Banner> : null}
          <ErrorText>{error}</ErrorText>
          <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'flex-end' }}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder={`Message ${name}`}
              placeholderTextColor={colors.muted}
              multiline
              maxLength={2000}
              accessibilityLabel="Message"
              style={{ flex: 1, minHeight: 44, maxHeight: 120, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, paddingHorizontal: space.md, paddingVertical: 10, fontSize: 16, color: colors.ink, backgroundColor: colors.bg }}
            />
            <Pressable onPress={send} disabled={sending || !draft.trim()} accessibilityRole="button" accessibilityLabel="Send"
              style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.teal, alignItems: 'center', justifyContent: 'center', opacity: sending || !draft.trim() ? 0.5 : 1 }}>
              <Send size={20} color={colors.white} />
            </Pressable>
          </View>
        </View>
      </View>

      <Sheet visible={menu} title={`Safety: ${name}`} onClose={() => { setMenu(false); setConfirmBlock(false); }}>
        {confirmBlock ? (
          <>
            <Text style={type.body}>{name} won't be able to message you or see your posts, and you won't see theirs. They aren't told.</Text>
            <Button title={`Block ${name}`} kind="danger" icon={<Ban size={16} color={colors.white} />} onPress={block} />
            <Button title="Cancel" kind="secondary" onPress={() => setConfirmBlock(false)} />
          </>
        ) : (
          <>
            <Text style={type.small}>To report a single message, long-press it.</Text>
            <Button title={`Report ${name}`} kind="secondary" icon={<Flag size={16} color={colors.ink} />} onPress={() => { setMenu(false); setReport({ target: 'profile', id: otherId }); }} />
            <Button title={`Block ${name}`} kind="secondary" icon={<Ban size={16} color={colors.ink} />} onPress={() => setConfirmBlock(true)} />
          </>
        )}
      </Sheet>
      <ReportSheet visible={!!report} target={report?.target ?? 'message'} targetId={report?.id ?? ''} onClose={() => setReport(null)} />
    </KeyboardAvoidingView>
  );
}
