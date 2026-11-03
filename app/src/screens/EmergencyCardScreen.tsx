import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { emptyCard, loadCard, saveCard, type EmergencyCard } from '../lib/deviceStore';
import { useApp } from '../state/AppState';
import { colors, space, type } from '../theme';
import { Button, Card, Field, Screen } from '../components/ui';

const FIELDS: { key: keyof EmergencyCard; label: string; placeholder: string }[] = [
  { key: 'bloodGroup', label: 'Blood group', placeholder: 'B+' },
  { key: 'allergies', label: 'Allergies', placeholder: 'Penicillin, peanuts' },
  { key: 'medications', label: 'Regular medicines', placeholder: 'Metformin 500 mg twice a day' },
  { key: 'conditions', label: 'Conditions', placeholder: 'Asthma' },
  { key: 'insurance', label: 'Health insurance', placeholder: 'Provider and policy number' },
  { key: 'notes', label: 'Other notes', placeholder: 'Languages I speak: English, Hindi, Tamil' },
];

export function EmergencyCardScreen() {
  const { profile } = useApp();
  const [card, setCard] = useState<EmergencyCard>(emptyCard);
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => { loadCard().then((c) => { setCard(c); setEditing(!Object.values(c).some(Boolean)); }); }, []);

  const save = async () => {
    try {
      await saveCard(card);
      setEditing(false);
      setSaved(true);
    } catch {
      setSaved(false);
    }
  };

  if (!editing) {
    return (
      <Screen>
        <Card style={{ borderColor: colors.sos, borderWidth: 2 }}>
          <Text style={[type.label, { color: colors.sos }]}>EMERGENCY INFORMATION</Text>
          <Text style={{ fontSize: 26, fontWeight: '800', color: colors.ink }}>{profile?.displayName}</Text>
          {FIELDS.filter((f) => card[f.key]).map((f) => (
            <View key={f.key} style={{ gap: 2, marginTop: space.sm }}>
              <Text style={type.label}>{f.label.toUpperCase()}</Text>
              <Text style={{ fontSize: 20, color: colors.ink, fontWeight: f.key === 'bloodGroup' ? '800' : '500' }}>{card[f.key]}</Text>
            </View>
          ))}
        </Card>
        {saved ? <Text style={type.small}>Saved on this phone.</Text> : null}
        <Text style={type.small}>Show this screen to paramedics or hospital staff. It's stored only on this phone and never uploaded.</Text>
        <Button title="Edit" kind="secondary" onPress={() => setEditing(true)} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Text style={type.body}>Fill in what a doctor would need if you couldn't speak. Everything stays on this phone.</Text>
      {FIELDS.map((f) => (
        <Field key={f.key} label={f.label} value={card[f.key]} placeholder={f.placeholder} maxLength={200}
          multiline={f.key === 'notes'} onChangeText={(v) => setCard((c) => ({ ...c, [f.key]: v }))} />
      ))}
      <Button title="Save card" onPress={save} />
    </Screen>
  );
}
