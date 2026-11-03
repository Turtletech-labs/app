import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { api, ApiError } from '../lib/api';
import { LAUNCH_CITIES, TERMS_VERSION } from '../config';
import { openLegal } from '../lib/legal';
import { useApp } from '../state/AppState';
import { colors, space, type } from '../theme';
import { Button, Checkbox, Chip, ErrorText, Field, Screen } from '../components/ui';
import type { ScreenProps } from '../navigation';

export function ProfileFormScreen({ navigation }: ScreenProps<'EditProfile'> | ScreenProps<'Onboarding'>) {
  const { profile, setProfile } = useApp();
  const editing = !!profile;
  const launch = LAUNCH_CITIES.find((c) => c.city === profile?.city);
  const [name, setName] = useState(profile?.displayName ?? '');
  const [city, setCity] = useState(profile?.city ?? 'Dublin');
  const [other, setOther] = useState(!!profile && !launch);
  const [country, setCountry] = useState(profile?.country ?? 'IE');
  const [profession, setProfession] = useState(profile?.profession ?? '');
  const [almaMater, setAlmaMater] = useState(profile?.almaMater ?? '');
  const [homeState, setHomeState] = useState(profile?.homeState ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [invite, setInvite] = useState('');
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const p = await api.saveMyProfile({
        displayName: name, city: city.trim(), country: country.trim().toUpperCase(), profession: profession.trim(),
        almaMater: almaMater.trim(), homeState: homeState.trim(), bio: bio.trim(),
      });
      let saved = p;
      if (!editing) saved = await api.acceptTerms(TERMS_VERSION);
      if (!editing && invite.trim()) {
        try {
          await api.redeemInvite(invite);
          saved = (await api.getMyProfile()) ?? saved;
        } catch (e) {
          // Profile is saved; let them fix the code or clear it and carry on.
          setError(e instanceof ApiError ? `${e.message} Or leave the code empty and add it later from your Profile.` : 'Could not check that code. Try again.');
          return;
        }
      }
      setProfile(saved);
      if (editing && navigation.canGoBack()) navigation.goBack();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not save. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      {!editing ? (
        <Text style={type.body}>Tell members a little about you. Only your name, city and the details you add here are shown; your email never is.</Text>
      ) : null}
      <Field label="Name shown to members" value={name} onChangeText={setName} placeholder="First name and last initial is fine" maxLength={60} autoComplete="name" />
      <View style={{ gap: space.xs }}>
        <Text style={type.label}>CITY</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          {LAUNCH_CITIES.map((c) => (
            <Chip key={c.city} label={c.city} selected={!other && city === c.city} onPress={() => { setOther(false); setCity(c.city); setCountry(c.country); }} />
          ))}
          <Chip label="Somewhere else" selected={other} onPress={() => { setOther(true); setCity(''); setCountry(''); }} />
        </View>
      </View>
      {other ? (
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          <View style={{ flex: 2 }}><Field label="City" value={city} onChangeText={setCity} placeholder="Toronto" maxLength={60} /></View>
          <View style={{ flex: 1 }}><Field label="Country code" value={country} onChangeText={setCountry} placeholder="CA" maxLength={2} autoCapitalize="characters" /></View>
        </View>
      ) : null}
      <Field label="Work or study (optional)" value={profession} onChangeText={setProfession} placeholder="Nurse, software engineer, MSc student…" maxLength={80} />
      <Field label="College or university (optional)" value={almaMater} onChangeText={setAlmaMater} placeholder="IIT Delhi" maxLength={80} />
      <Field label="Home state (optional)" value={homeState} onChangeText={setHomeState} placeholder="Kerala" maxLength={60} />
      <Field label="About you (optional)" value={bio} onChangeText={setBio} multiline maxLength={500} placeholder="What you can help with, or what you're looking for." />
      {!editing ? (
        <Field label="Invite code (optional)" value={invite} onChangeText={setInvite} placeholder="e.g. DUBLIN-WELCOME" maxLength={32}
          autoCapitalize="characters" autoComplete="off" hint="Got a code from the Sangam team or a member? It unlocks posting and messages straight away." />
      ) : null}
      {!editing ? (
        <Checkbox checked={agree} onChange={setAgree}>
          <Text style={type.body}>
            I am 18 or over, and I agree to the{' '}
            <Text style={{ color: colors.teal, textDecorationLine: 'underline' }} onPress={() => openLegal('community-rules')}>community rules</Text>,{' '}
            <Text style={{ color: colors.teal, textDecorationLine: 'underline' }} onPress={() => openLegal('terms-of-use')}>terms</Text> and{' '}
            <Text style={{ color: colors.teal, textDecorationLine: 'underline' }} onPress={() => openLegal('privacy')}>privacy policy</Text>.
          </Text>
        </Checkbox>
      ) : null}
      <ErrorText>{error}</ErrorText>
      <Button title={editing ? 'Save' : 'Join the community'} loading={busy} disabled={name.trim().length < 2 || !city.trim() || (!editing && !agree)} onPress={save} />
    </Screen>
  );
}
