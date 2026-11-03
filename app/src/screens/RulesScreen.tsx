import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { ExternalLink } from 'lucide-react-native';
import { api, ApiError } from '../lib/api';
import { TERMS_VERSION } from '../config';
import { LEGAL_TITLES, openLegal, type LegalPage } from '../lib/legal';
import { useApp } from '../state/AppState';
import { colors, space, type } from '../theme';
import { Banner, Button, Card, Checkbox, ErrorText, Screen, SectionTitle } from '../components/ui';
import type { ScreenProps } from '../navigation';

const PAGES: LegalPage[] = ['community-rules', 'privacy', 'terms-of-use'];

const SHORT_RULES = [
  'Be real and be kind.',
  'No scams, fraud or phishing. Never ask anyone for money, codes or private details.',
  'Nothing obscene, sexual, violent or hateful.',
  "Don't share other people's private information.",
  'Jobs, referrals and housing never charge fees or take deposits upfront.',
  'If something feels wrong, press Report.',
];

export function RulesScreen({ navigation }: ScreenProps<'Rules'>) {
  const { profile, refreshProfile } = useApp();
  const accepted = profile?.termsVersion === TERMS_VERSION;
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const accept = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.acceptTerms(TERMS_VERSION);
      await refreshProfile();
      if (navigation.canGoBack()) navigation.goBack();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not save that. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      {!accepted ? (
        <Banner tone="info" title="Please read and accept">
          We have written down how Sangam works, what is not allowed, and how we handle your data.
        </Banner>
      ) : null}

      <Card>
        <Text style={type.h2}>The short version</Text>
        {SHORT_RULES.map((r) => (
          <View key={r} style={{ flexDirection: 'row', gap: space.sm }}>
            <Text style={type.body}>•</Text>
            <Text style={[type.body, { flex: 1 }]}>{r}</Text>
          </View>
        ))}
        <Text style={type.small}>Break the rules and we may remove your posts or your account. Sangam is not an emergency service: in an emergency, call your local emergency number.</Text>
      </Card>

      <SectionTitle>Read the full documents</SectionTitle>
      {PAGES.map((p) => (
        <Button key={p} title={LEGAL_TITLES[p]} kind="secondary" icon={<ExternalLink size={16} color={colors.ink} />} onPress={() => openLegal(p)} />
      ))}

      {accepted ? (
        <Text style={type.small}>You accepted version {profile?.termsVersion}.</Text>
      ) : (
        <>
          <Checkbox checked={agree} onChange={setAgree}>
            <Text style={type.body}>I am 18 or over, and I agree to the community rules, terms and privacy policy.</Text>
          </Checkbox>
          <ErrorText>{error}</ErrorText>
          <Button title="I agree" disabled={!agree} loading={busy} onPress={accept} />
        </>
      )}
    </Screen>
  );
}
