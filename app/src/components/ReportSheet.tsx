import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { api, ApiError } from '../lib/api';
import type { ReportTarget } from '../lib/types';
import { space, type } from '../theme';
import { Button, Chip, ErrorText, Field, Sheet } from './ui';

const REASONS = [
  'Scam, fraud or phishing', 'Obscene or sexual content', 'Harassment, hate or threats', 'Fake profile or impersonation',
  'Unsafe event or meeting', 'Illegal goods or services', 'Shares private information', 'Spam', 'Something else',
];

export function ReportSheet({ visible, target, targetId, onClose, onDone }: {
  visible: boolean; target: ReportTarget; targetId: string; onClose: () => void; onDone?: () => void;
}) {
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const close = () => {
    setReason(''); setDetails(''); setError(null); setSent(false);
    onClose();
  };

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await api.report(target, targetId, details.trim() ? `${reason}: ${details.trim()}` : reason);
      setSent(true);
      onDone?.();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not send the report. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet visible={visible} title={sent ? 'Report sent' : 'Report'} onClose={close}>
      {sent ? (
        <>
          <Text style={type.body}>Thanks. We read every report and deal with the most serious ones first. The person you reported isn't told who reported them. If someone is in danger, call your local emergency number.</Text>
          <Button title="Done" onPress={close} />
        </>
      ) : (
        <>
          <Text style={type.small}>What's wrong? Reports are private.</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
            {REASONS.map((r) => <Chip key={r} label={r} selected={reason === r} onPress={() => setReason(r)} />)}
          </View>
          <Field label="Anything else? (optional)" value={details} onChangeText={setDetails} multiline maxLength={800} />
          <ErrorText>{error}</ErrorText>
          <Button title="Send report" kind="danger" disabled={!reason} loading={busy} onPress={submit} />
        </>
      )}
    </Sheet>
  );
}
