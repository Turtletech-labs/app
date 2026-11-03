import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { api, ApiError } from '../lib/api';
import { emergencyNumber } from '../lib/safety';
import type { ServiceRequest } from '../lib/types';
import { FOR_WHOM_LABEL, SERVICES, TIMING_OPTIONS } from '../content/services';
import { useApp } from '../state/AppState';
import { colors, space, type } from '../theme';
import { Banner, Button, Card, Chip, Empty, ErrorText, Field, Screen } from '../components/ui';
import { TierPill } from './ServicesScreen';
import type { ScreenProps } from '../navigation';

export function ServiceRequestScreen({ route, navigation }: ScreenProps<'ServiceRequest'>) {
  const { profile } = useApp();
  const service = SERVICES.find((s) => s.id === route.params.serviceId);
  const [forWhom, setForWhom] = useState<ServiceRequest['forWhom']>(service?.forWhomDefault ?? 'me');
  const [location, setLocation] = useState(service?.forWhomDefault === 'me' ? profile?.city ?? '' : '');
  const [timing, setTiming] = useState<string>(service?.urgent ? TIMING_OPTIONS[0] : TIMING_OPTIONS[2]);
  const [details, setDetails] = useState('');
  const [contact, setContact] = useState<ServiceRequest['contactMethod']>(service?.urgent ? 'phone' : 'chat');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  if (!service) return <Screen><Empty title="Service not found" /></Screen>;

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.createServiceRequest({
        serviceId: service.id, tier: service.tier, forWhom, location, timing, details, contactMethod: contact, phone,
      });
      setSent(true);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not send the request. Try again.');
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <Screen>
        <Card style={{ gap: space.md }}>
          <Text style={type.title}>Request received</Text>
          <Text style={type.body}>
            A relationship manager will {contact === 'phone' ? 'call you' : 'reply in the app'} {service.urgent ? 'as soon as possible' : 'within one working day'}. Nothing is booked, and nothing is charged, until you agree.
          </Text>
          <Text style={type.small}>You can follow it under "Your requests" on the Services tab.</Text>
          <Button title="Back to services" onPress={() => navigation.goBack()} />
        </Card>
      </Screen>
    );
  }

  const inIndia = forWhom !== 'me' || service.group === 'property' || service.group === 'parents';

  return (
    <Screen>
      <TierPill tier={service.tier} />
      <Text style={type.title}>{service.title}</Text>
      <Text style={type.body}>{service.summary}</Text>
      {service.partnerNote ? <Text style={type.small}>{service.partnerNote}</Text> : null}

      {service.urgent ? (
        <Banner tone="danger" title="If someone's life is in danger">
          {`Call ${emergencyNumber(profile?.country)} where you are, or 112 in India, first. This request is not an emergency service; it gets a person working on the logistics.`}
        </Banner>
      ) : null}

      <View style={{ gap: space.xs }}>
        <Text style={type.label}>WHO IS IT FOR?</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          {(Object.keys(FOR_WHOM_LABEL) as ServiceRequest['forWhom'][]).map((k) => (
            <Chip key={k} label={FOR_WHOM_LABEL[k]} selected={forWhom === k} onPress={() => setForWhom(k)} />
          ))}
        </View>
      </View>

      <Field label={inIndia ? 'City or town in India' : 'Your city'} value={location} onChangeText={setLocation} maxLength={120}
        placeholder={inIndia ? 'Pune, Kochi, Jaipur…' : 'Dublin'} />

      <View style={{ gap: space.xs }}>
        <Text style={type.label}>WHEN?</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          {TIMING_OPTIONS.map((t) => <Chip key={t} label={t} selected={timing === t} onPress={() => setTiming(t)} />)}
        </View>
      </View>

      <Field label="What do you need?" value={details} onChangeText={setDetails} multiline maxLength={2000}
        placeholder={service.urgent ? 'What happened, where, and who is with them now.' : 'A few lines on the situation and what a good outcome looks like.'}
        hint="Don't include passport, bank or card numbers. We'll ask for what we need, securely." />

      <View style={{ gap: space.xs }}>
        <Text style={type.label}>HOW SHOULD WE REPLY?</Text>
        <View style={{ flexDirection: 'row', gap: space.sm }}>
          <Chip label="In the app" selected={contact === 'chat'} onPress={() => setContact('chat')} />
          <Chip label="Call me" selected={contact === 'phone'} onPress={() => setContact('phone')} />
        </View>
      </View>
      {contact === 'phone' ? (
        <Field label="Phone with country code" value={phone} onChangeText={setPhone} keyboardType="phone-pad" maxLength={30} placeholder="+353 87 123 4567"
          hint="Used only to call you about this request." />
      ) : null}

      <ErrorText>{error}</ErrorText>
      <Button title="Send request" kind={service.urgent ? 'danger' : 'primary'} loading={busy} disabled={details.trim().length < 10} onPress={submit} />
      <Text style={[type.small, { color: colors.muted }]}>
        This is a request, not a booking. We confirm what's possible and any cost before anything is arranged.
      </Text>
    </Screen>
  );
}
