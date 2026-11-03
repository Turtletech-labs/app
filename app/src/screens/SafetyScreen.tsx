import React, { useCallback, useState } from 'react';
import { Linking, Platform, Pressable, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Location from 'expo-location';
import { ChevronRight, HeartPulse, MapPin, Phone, ShieldCheck, Users } from 'lucide-react-native';
import { api } from '../lib/api';
import { emergencyNumber, imSafeMessage, smsLink, sosMessage, telLink, whatsappLink, type Coords } from '../lib/safety';
import { loadContacts, type TrustedContact } from '../lib/deviceStore';
import { useApp } from '../state/AppState';
import { colors, radius, space, type } from '../theme';
import { Banner, Button, Card, Field, Screen, Sheet } from '../components/ui';
import type { RootStackParamList } from '../navigation';

type Outgoing = { title: string; text: string; contacts: TrustedContact[] };

async function currentPosition(): Promise<Coords | null> {
  try {
    const perm = await Location.requestForegroundPermissionsAsync();
    if (perm.status !== 'granted') return null;
    const pos = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
      new Promise<null>((r) => setTimeout(() => r(null), 8000)),
    ]);
    return pos ? { latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy } : null;
  } catch {
    return null;
  }
}

export function SafetyScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { profile } = useApp();
  const number = emergencyNumber(profile?.country);
  const [contacts, setContacts] = useState<TrustedContact[]>([]);
  const [outgoing, setOutgoing] = useState<Outgoing | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [calledEmergency, setCalledEmergency] = useState(false);
  const [safeNote, setSafeNote] = useState('');
  const [safeOpen, setSafeOpen] = useState(false);

  useFocusEffect(useCallback(() => { loadContacts().then(setContacts); }, []));

  // On a real phone this opens the dialler, WhatsApp or SMS. In the web preview
  // it shows what would be sent instead.
  const open = async (url: string) => {
    if (Platform.OS === 'web' && api.mode === 'demo') {
      setPreview(url);
      return;
    }
    try {
      await Linking.openURL(url);
    } catch {
      setPreview(url);
    }
  };

  const callEmergency = () => {
    setCalledEmergency(true);
    open(telLink(number));
  };

  const alertContacts = async () => {
    setLocating(true);
    const coords = await currentPosition();
    setLocating(false);
    const text = sosMessage({ name: profile?.displayName ?? 'A member', coords, at: new Date(), emergencyNo: number, calledEmergency });
    setOutgoing({ title: 'Alert your trusted contacts', text, contacts });
  };

  const family = contacts.filter((c) => c.isFamily);
  const sendSafe = () => {
    setSafeOpen(false);
    setOutgoing({ title: "Tell family you're safe", text: imSafeMessage({ name: profile?.displayName ?? '', at: new Date(), note: safeNote }), contacts: family.length ? family : contacts });
    setSafeNote('');
  };

  return (
    <Screen>
      <Card style={{ borderColor: colors.sos, gap: space.md }}>
        <Text style={[type.label, { color: colors.sos }]}>IN AN EMERGENCY</Text>
        <Pressable
          onLongPress={callEmergency}
          delayLongPress={700}
          accessibilityRole="button"
          accessibilityLabel={`Call ${number}. Press and hold.`}
          style={({ pressed }) => ({
            backgroundColor: colors.sos, borderRadius: radius.lg, paddingVertical: space.xl, alignItems: 'center', gap: space.xs,
            transform: [{ scale: pressed ? 0.98 : 1 }],
          })}
        >
          <Phone size={30} color={colors.white} />
          <Text style={{ color: colors.white, fontSize: 24, fontWeight: '800' }}>Call {number}</Text>
          <Text style={{ color: colors.white, opacity: 0.9 }}>Press and hold</Text>
        </Pressable>
        <Button title={locating ? 'Finding your location…' : 'Alert my trusted contacts'} kind="secondary" loading={locating}
          icon={<MapPin size={18} color={colors.ink} />} onPress={alertContacts} />
        <Text style={type.small}>
          Your location is read once, only when you press this, and sent from your own phone. We don't track you, and this app is not an emergency service.
        </Text>
      </Card>

      <Card style={{ gap: space.md }}>
        <View style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center' }}>
          <ShieldCheck size={22} color={colors.good} />
          <Text style={type.h2}>"I'm safe" check-in</Text>
        </View>
        <Text style={type.small}>One tap tells family back home you're fine, on WhatsApp or SMS. Useful after news of an incident in your city.</Text>
        <Button title="Send an I'm safe message" onPress={() => setSafeOpen(true)} disabled={!contacts.length} />
        {!contacts.length ? <Text style={type.small}>Add a family member as a trusted contact first.</Text> : null}
      </Card>

      <LinkRow icon={<Users size={20} color={colors.teal} />} title="Trusted contacts" sub={contacts.length ? `${contacts.length} saved on this phone` : 'Add up to 5 people'} onPress={() => nav.navigate('Contacts')} />
      <LinkRow icon={<HeartPulse size={20} color={colors.sos} />} title="Emergency card" sub="Blood group, allergies and medicines for first responders. Stays on this phone." onPress={() => nav.navigate('EmergencyCard')} />

      <Sheet visible={safeOpen} title="I'm safe" onClose={() => setSafeOpen(false)}>
        <Field label="Add a note (optional)" value={safeNote} onChangeText={setSafeNote} maxLength={140} placeholder="At home, will call tonight." />
        <Button title="Choose who to tell" onPress={sendSafe} />
      </Sheet>

      <Sheet visible={!!outgoing} title={outgoing?.title ?? ''} onClose={() => setOutgoing(null)}>
        <Card style={{ backgroundColor: colors.bg }}>
          <Text style={type.body}>{outgoing?.text}</Text>
        </Card>
        {outgoing && !outgoing.contacts.length ? (
          <>
            <Banner>You haven't added trusted contacts yet. Add them now so this is one tap next time.</Banner>
            <Button title="Add trusted contacts" onPress={() => { setOutgoing(null); nav.navigate('Contacts'); }} />
          </>
        ) : null}
        {outgoing?.contacts.map((c) => (
          <View key={c.id} style={{ flexDirection: 'row', gap: space.sm, alignItems: 'center' }}>
            <Text style={{ flex: 1, fontWeight: '600', color: colors.ink }} numberOfLines={1}>{c.name}</Text>
            <Button title="WhatsApp" style={{ paddingHorizontal: space.md }} onPress={() => open(whatsappLink(c.phone, outgoing.text))} />
            <Button title="SMS" kind="secondary" style={{ paddingHorizontal: space.md }} onPress={() => open(smsLink([c.phone], outgoing.text, Platform.OS))} />
          </View>
        ))}
        {outgoing && outgoing.contacts.length > 1 ? (
          <Button title={`SMS all ${outgoing.contacts.length}`} kind="secondary" onPress={() => open(smsLink(outgoing.contacts.map((c) => c.phone), outgoing.text, Platform.OS))} />
        ) : null}
      </Sheet>

      <Sheet visible={!!preview} title="Preview" onClose={() => setPreview(null)}>
        <Text style={type.body}>On a phone, this opens:</Text>
        <Card style={{ backgroundColor: colors.bg }}><Text style={[type.small, { color: colors.ink }]} selectable>{preview ? decodeURIComponent(preview) : ''}</Text></Card>
        <Text style={type.small}>The web preview doesn't place calls or send messages.</Text>
        <Button title="OK" onPress={() => setPreview(null)} />
      </Sheet>
    </Screen>
  );
}

function LinkRow({ icon, title, sub, onPress }: { icon: React.ReactNode; title: string; sub: string; onPress: () => void }) {
  return (
    <Card onPress={onPress} accessibilityLabel={title}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
        {icon}
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ fontWeight: '700', color: colors.ink }}>{title}</Text>
          <Text style={type.small}>{sub}</Text>
        </View>
        <ChevronRight size={20} color={colors.muted} />
      </View>
    </Card>
  );
}
