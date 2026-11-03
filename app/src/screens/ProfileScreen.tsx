import React, { useCallback, useState } from 'react';
import { Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LogOut, Trash2 } from 'lucide-react-native';
import { api, ApiError } from '../lib/api';
import { clearDeviceData } from '../lib/deviceStore';
import type { ProfileSummary, TrustLevel } from '../lib/types';
import { useApp } from '../state/AppState';
import { colors, space, type } from '../theme';
import { Avatar, Banner, Button, Card, Chip, ErrorText, Field, Screen, SectionTitle, TrustBadge } from '../components/ui';
import type { RootStackParamList } from '../navigation';

const LEVELS: { level: TrustLevel; title: string; body: string }[] = [
  { level: 1, title: 'Level 1 · Email', body: 'Browse every circle, read answers and guides, RSVP to events, use SOS. Everyone starts here.' },
  { level: 2, title: 'Level 2 · Work or university email', body: 'Post notices, questions and events, reply, and send chat requests. Get here with a work or university email or an invite code.' },
  { level: 3, title: 'Level 3 · ID verified', body: 'Post jobs, referrals and housing, and answer as an expert. Needs a passport or driving licence check with a selfie.' },
];

export function ProfileScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { profile, refreshProfile } = useApp();
  const [blocked, setBlocked] = useState<ProfileSummary[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [codeBusy, setCodeBusy] = useState(false);
  const [codeMsg, setCodeMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useFocusEffect(useCallback(() => { api.listBlocked().then(setBlocked).catch(() => {}); }, []));
  if (!profile) return null;

  const deleteAccount = async () => {
    try {
      await clearDeviceData();
      await api.deleteMyAccount();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not delete your account. Try again or contact support.');
    }
  };

  const redeem = async () => {
    setCodeBusy(true);
    setCodeMsg(null);
    try {
      const level = await api.redeemInvite(code);
      await refreshProfile();
      setCode('');
      setCodeMsg({ ok: true, text: `Done. You are now at level ${level}.` });
    } catch (e) {
      setCodeMsg({ ok: false, text: e instanceof ApiError ? e.message : 'Could not check that code. Try again.' });
    } finally {
      setCodeBusy(false);
    }
  };

  return (
    <Screen>
      <Card>
        <View style={{ flexDirection: 'row', gap: space.md, alignItems: 'center' }}>
          <Avatar name={profile.displayName} size={56} />
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={type.h2}>{profile.displayName}</Text>
            <Text style={type.small}>{[profile.city, profile.profession].filter(Boolean).join(' · ')}</Text>
            <TrustBadge level={profile.trustLevel} expert={profile.isExpert} />
          </View>
        </View>
        <Button title="Edit profile" kind="secondary" onPress={() => nav.navigate('EditProfile')} />
      </Card>

      <SectionTitle>Trust levels</SectionTitle>
      {LEVELS.map((l) => (
        <Card key={l.level} style={l.level === profile.trustLevel ? { borderColor: colors.teal, borderWidth: 2 } : undefined}>
          <Text style={{ fontWeight: '700', color: colors.ink }}>{l.title}{l.level === profile.trustLevel ? ' · you are here' : ''}</Text>
          <Text style={type.small}>{l.body}</Text>
        </Card>
      ))}
      {profile.trustLevel < 2 ? (
        <Card>
          <Text style={{ fontWeight: '700', color: colors.ink }}>Have an invite code?</Text>
          <Field label="Invite code" value={code} onChangeText={setCode} placeholder="e.g. DUBLIN-WELCOME" maxLength={32} autoCapitalize="characters" autoComplete="off" />
          {codeMsg ? <Text style={[type.small, { color: codeMsg.ok ? colors.teal : colors.sos }]}>{codeMsg.text}</Text> : null}
          <Button title="Use code" loading={codeBusy} disabled={code.trim().length < 6} onPress={redeem} />
        </Card>
      ) : null}
      {profile.trustLevel < 3 ? <Text style={type.small}>ID checks open soon. Images are checked by our verification partner and not kept by us; we store only the result.</Text> : null}

      {api.mode === 'demo' && api.setDemoTrustLevel ? (
        <Banner tone="info" title="Preview: try another trust level">
          <View style={{ flexDirection: 'row', gap: space.sm, marginTop: space.xs }}>
            {([1, 2, 3] as TrustLevel[]).map((l) => (
              <Chip key={l} label={`Level ${l}`} selected={profile.trustLevel === l} onPress={async () => { await api.setDemoTrustLevel!(l); await refreshProfile(); }} />
            ))}
          </View>
        </Banner>
      ) : null}

      <SectionTitle>Circles</SectionTitle>
      <Button title="Manage your circles" kind="secondary" onPress={() => nav.navigate('Circles')} />

      {blocked.length ? <SectionTitle>Blocked</SectionTitle> : null}
      {blocked.map((b) => (
        <Card key={b.id}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ color: colors.ink, fontWeight: '600' }}>{b.displayName}</Text>
            <Button title="Unblock" kind="ghost" onPress={async () => { await api.unblockUser(b.id); setBlocked((x) => x.filter((y) => y.id !== b.id)); }} />
          </View>
        </Card>
      ))}

      <SectionTitle>Account</SectionTitle>
      <Button title="Rules and privacy" kind="secondary" onPress={() => nav.navigate('Rules')} />
      <Button title="Sign out" kind="secondary" icon={<LogOut size={18} color={colors.ink} />} onPress={() => api.signOut()} />
      {confirmDelete ? (
        <Card style={{ borderColor: colors.sos }}>
          <Text style={type.body}>This permanently deletes your profile, posts, replies, chats and requests. Trusted contacts and your emergency card are wiped from this phone too. It can't be undone.</Text>
          <ErrorText>{error}</ErrorText>
          <Button title="Delete my account" kind="danger" onPress={deleteAccount} />
          <Button title="Keep my account" kind="secondary" onPress={() => setConfirmDelete(false)} />
        </Card>
      ) : (
        <Button title="Delete account" kind="ghost" icon={<Trash2 size={18} color={colors.teal} />} onPress={() => setConfirmDelete(true)} />
      )}
      <Text style={[type.small, { textAlign: 'center', marginTop: space.lg }]}>No ads. We never sell your data.</Text>
    </Screen>
  );
}
