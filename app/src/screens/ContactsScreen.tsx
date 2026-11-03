import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { Trash2 } from 'lucide-react-native';
import { loadContacts, saveContacts, type TrustedContact } from '../lib/deviceStore';
import { normalisePhone } from '../lib/safety';
import { colors, space, type } from '../theme';
import { Button, Card, Chip, ErrorText, Field, Screen } from '../components/ui';

const RELATIONS = ['Parent', 'Partner', 'Sibling', 'Friend nearby', 'Colleague'];

export function ContactsScreen() {
  const [list, setList] = useState<TrustedContact[]>([]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [relation, setRelation] = useState('Parent');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { loadContacts().then(setList); }, []);

  const persist = async (next: TrustedContact[]) => {
    try {
      await saveContacts(next);
      setList(next);
    } catch {
      setError("Couldn't save on this device. Check that storage isn't full or blocked.");
    }
  };

  const add = async () => {
    setError(null);
    const p = normalisePhone(phone);
    if (!name.trim()) return setError('Add a name.');
    if (!p.startsWith('+')) return setError('Add the full number with country code, for example +91 98765 43210 or +353 87 123 4567.');
    if (list.length >= 5) return setError('You can save up to 5 trusted contacts.');
    await persist([...list, { id: `${Date.now()}`, name: name.trim(), phone: p, relation, isFamily: ['Parent', 'Partner', 'Sibling'].includes(relation) }]);
    setName('');
    setPhone('');
  };

  return (
    <Screen>
      <Text style={type.body}>These are the people your SOS and "I'm safe" messages go to. They're saved only on this phone and never uploaded.</Text>
      {list.map((c) => (
        <Card key={c.id}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.md }}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ fontWeight: '700', color: colors.ink }}>{c.name}</Text>
              <Text style={type.small}>{c.relation} · {c.phone}{c.isFamily ? ' · gets check-ins' : ''}</Text>
            </View>
            <Button title="Remove" kind="ghost" icon={<Trash2 size={18} color={colors.sos} />} onPress={() => persist(list.filter((x) => x.id !== c.id))} />
          </View>
        </Card>
      ))}
      {list.length < 5 ? (
        <Card>
          <Text style={type.h2}>Add someone</Text>
          <Field label="Name" value={name} onChangeText={setName} maxLength={60} placeholder="Amma" />
          <Field label="Phone with country code" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="+91 98765 43210" />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
            {RELATIONS.map((r) => <Chip key={r} label={r} selected={relation === r} onPress={() => setRelation(r)} />)}
          </View>
          <ErrorText>{error}</ErrorText>
          <Button title="Save contact" onPress={add} />
        </Card>
      ) : null}
      <Text style={type.small}>Tip: add one person in India and one friend in your city, so someone nearby can help in person.</Text>
    </Screen>
  );
}
