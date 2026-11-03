import React, { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { Ban, Flag, MessageCircle } from 'lucide-react-native';
import { api, ApiError } from '../lib/api';
import { LEVEL_TO_MESSAGE, type Profile } from '../lib/types';
import { useApp } from '../state/AppState';
import { colors, space, type } from '../theme';
import { Avatar, Banner, Button, Card, Empty, ErrorText, Field, Loading, Screen, Sheet, TrustBadge } from '../components/ui';
import { ReportSheet } from '../components/ReportSheet';
import type { ScreenProps } from '../navigation';

export function MemberScreen({ route, navigation }: ScreenProps<'Member'>) {
  const { id } = route.params;
  const { profile: me } = useApp();
  const [member, setMember] = useState<Profile | null | undefined>(undefined);
  const [compose, setCompose] = useState(false);
  const [note, setNote] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState(false);
  const [confirmBlock, setConfirmBlock] = useState(false);

  useEffect(() => { api.getProfile(id).then(setMember).catch(() => setMember(null)); }, [id]);

  if (member === undefined) return <Loading />;
  if (!member) return <Screen><Empty title="This profile isn't available" /></Screen>;

  const canMessage = (me?.trustLevel ?? 1) >= LEVEL_TO_MESSAGE;
  const first = member.displayName.split(' ')[0];

  const sendRequest = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.sendChatRequest(member.id, note);
      setSent(true);
      setCompose(false);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not send the request.');
    } finally {
      setBusy(false);
    }
  };

  const block = async () => {
    await api.blockUser(member.id);
    navigation.goBack();
  };

  const details = [member.profession, member.almaMater, member.homeState && `From ${member.homeState}`].filter(Boolean) as string[];

  return (
    <Screen>
      <Card style={{ alignItems: 'center', gap: space.sm }}>
        <Avatar name={member.displayName} size={72} />
        <Text style={type.title}>{member.displayName}</Text>
        <Text style={type.small}>{member.city}</Text>
        <TrustBadge level={member.trustLevel} expert={member.isExpert} />
      </Card>
      {details.length ? <Text style={type.body}>{details.join(' · ')}</Text> : null}
      {member.bio ? <Text style={type.body}>{member.bio}</Text> : null}

      {sent ? <Banner tone="info" title="Request sent">{`${first} will see your note and can accept or decline. You'll find the chat in Messages once they accept.`}</Banner> : null}
      {canMessage ? (
        <Button title={`Send ${first} a chat request`} icon={<MessageCircle size={18} color={colors.white} />} disabled={sent} onPress={() => setCompose(true)} />
      ) : (
        <Banner tone="info" title="Messaging needs a work or university email">You can still reply to posts once your account reaches level 2.</Banner>
      )}
      <ErrorText>{error}</ErrorText>
      <Button title="Report" kind="ghost" icon={<Flag size={16} color={colors.teal} />} onPress={() => setReport(true)} />
      {confirmBlock ? (
        <Card>
          <Text style={type.body}>{`${first} won't be able to message you or see your posts, and you won't see theirs. They aren't told.`}</Text>
          <Button title={`Block ${first}`} kind="danger" onPress={block} />
          <Button title="Cancel" kind="secondary" onPress={() => setConfirmBlock(false)} />
        </Card>
      ) : (
        <Button title="Block" kind="ghost" icon={<Ban size={16} color={colors.teal} />} onPress={() => setConfirmBlock(true)} />
      )}

      <Sheet visible={compose} title={`Message ${first}`} onClose={() => setCompose(false)}>
        <Text style={type.small}>Say who you are and why you're getting in touch. {first} sees this before deciding.</Text>
        <Field label="Your note" value={note} onChangeText={setNote} multiline maxLength={280} placeholder="Hi! I saw your post about…" hint={`${note.trim().length}/280 · at least 10 characters`} />
        <ErrorText>{error}</ErrorText>
        <Button title="Send request" loading={busy} disabled={note.trim().length < 10} onPress={sendRequest} />
      </Sheet>
      <ReportSheet visible={report} target="profile" targetId={member.id} onClose={() => setReport(false)} />
    </Screen>
  );
}
