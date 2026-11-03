import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { BadgeCheck, MessageCircle, Siren } from 'lucide-react-native';
import { api, ApiError } from '../lib/api';
import { APP_NAME } from '../config';
import { colors, space, type } from '../theme';
import { Banner, Button, Card, ErrorText, Field, Screen } from '../components/ui';

const POINTS = [
  { Icon: BadgeCheck, title: 'Verified members', body: 'Everyone signs in with a real email. Hosts, experts and landlords pass an ID check.' },
  { Icon: Siren, title: 'Safety first', body: 'SOS calls the local emergency number and alerts the people you trust.' },
  { Icon: MessageCircle, title: 'Quiet by design', body: 'No ads, no forwards, and nobody can message you until you accept.' },
];

export function WelcomeScreen() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <View style={{ gap: space.sm, paddingTop: space.xl }}>
        <Text style={[type.label, { color: colors.saffron }]}>FOR INDIANS ABROAD AND FAMILY BACK HOME</Text>
        <Text style={{ fontSize: 34, fontWeight: '800', color: colors.ink }}>{APP_NAME}</Text>
        <Text style={[type.body, { color: colors.muted }]}>
          A verified community for jobs, answers, events and help when it matters, in Dublin, London and beyond.
        </Text>
      </View>

      <View style={{ gap: space.md, marginTop: space.md }}>
        {POINTS.map(({ Icon, title, body }) => (
          <View key={title} style={{ flexDirection: 'row', gap: space.md, alignItems: 'flex-start' }}>
            <Icon size={22} color={colors.teal} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '700', color: colors.ink }}>{title}</Text>
              <Text style={type.small}>{body}</Text>
            </View>
          </View>
        ))}
      </View>

      <Card style={{ marginTop: space.lg }}>
        {step === 'email' ? (
          <>
            <Field label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address"
              autoCapitalize="none" autoComplete="email" hint="Use your work or university email to unlock posting and messages straight away." />
            <Button title="Send me a sign-in code" loading={busy} onPress={() => run(async () => { await api.sendEmailCode(email); setStep('code'); })} />
          </>
        ) : (
          <>
            <Text style={type.body}>We sent a 6-digit code to {email}.</Text>
            <Field label="Code" value={code} onChangeText={setCode} placeholder="123456" keyboardType="number-pad" maxLength={6} autoComplete="one-time-code" />
            <Button title="Sign in" loading={busy} onPress={() => run(() => api.verifyEmailCode(email, code))} />
            <Button title="Use a different email" kind="ghost" onPress={() => { setStep('email'); setCode(''); }} />
          </>
        )}
        <ErrorText>{error}</ErrorText>
        <Text style={[type.small, { textAlign: 'center' }]}>or</Text>
        <Button title="Continue with Google" kind="secondary" onPress={() => run(() => api.signInWithGoogle())} />
      </Card>

      {api.mode === 'demo' ? (
        <Banner tone="info" title="Preview with sample data">
          Nothing you type here is saved. Any 6-digit code signs you in, or use Google to jump straight in.
        </Banner>
      ) : null}

      <Text style={[type.small, { textAlign: 'center', marginTop: space.md }]}>
        This app is not an emergency service. In an emergency, call your local emergency number.
      </Text>
    </Screen>
  );
}
