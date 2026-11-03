import React, { useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { Lock } from 'lucide-react-native';
import { api, ApiError } from '../lib/api';
import {
  REQUIRED_LEVEL, type Circle, type EventDetails, type JobDetails, type NoticeDetails, type PostDetails, type PostType,
  type QuestionDetails,
} from '../lib/types';
import { scamWarnings } from '../lib/safety';
import { useApp } from '../state/AppState';
import { colors, space, type } from '../theme';
import { Banner, Button, Chip, ErrorText, Field, Screen } from '../components/ui';
import { NOTICE_LABEL, TOPIC_LABEL, TYPE_META } from '../components/PostCard';
import type { ScreenProps } from '../navigation';

const EXPIRY = [{ label: '3 days', days: 3 }, { label: '1 week', days: 7 }, { label: '2 weeks', days: 14 }, { label: '1 month', days: 30 }];

export function ComposeScreen({ route, navigation }: ScreenProps<'Compose'>) {
  const { profile } = useApp();
  const level = profile?.trustLevel ?? 1;
  const [postType, setPostType] = useState<PostType>(route.params?.type ?? 'notice');
  const [circles, setCircles] = useState<Circle[]>([]);
  const [circleId, setCircleId] = useState<string>('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState<NoticeDetails['category']>('general');
  const [expiryDays, setExpiryDays] = useState(7);
  const [topic, setTopic] = useState<QuestionDetails['topic']>('other');
  const [jobKind, setJobKind] = useState<JobDetails['kind']>('opening');
  const [company, setCompany] = useState('');
  const [location, setLocation] = useState(profile?.city ?? '');
  const [link, setLink] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('18:30');
  const [venue, setVenue] = useState('');
  const [capacity, setCapacity] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.listMyCircles().then((c) => {
      setCircles(c);
      setCircleId((cur) => cur || c.find((x) => x.kind === 'city')?.id || c[0]?.id || '');
    });
  }, []);

  const needed = postType === 'notice' && category === 'housing' ? 3 : REQUIRED_LEVEL[postType];
  const locked = level < needed;
  const warnings = useMemo(() => scamWarnings(`${title}\n${body}`), [title, body]);

  const buildDetails = (): PostDetails => {
    switch (postType) {
      case 'notice': return { category };
      case 'question': return { topic };
      case 'job': return { kind: jobKind, company: company.trim(), location: location.trim(), link: link.trim() };
      case 'event': {
        const startsAt = new Date(`${date}T${time}:00`);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time) || isNaN(startsAt.getTime())) {
          throw new ApiError('Enter the date as YYYY-MM-DD and the time as HH:MM.', 'invalid');
        }
        if (startsAt.getTime() < Date.now()) throw new ApiError('Pick a date in the future.', 'invalid');
        if (venue.trim().length < 3) throw new ApiError('Add a public venue, such as a café, hall or park.', 'invalid');
        const cap = capacity.trim() ? parseInt(capacity, 10) : null;
        if (cap !== null && (!Number.isFinite(cap) || cap < 2 || cap > 1000)) throw new ApiError('Capacity must be between 2 and 1,000.', 'invalid');
        const d: EventDetails = { startsAt: startsAt.toISOString(), venue: venue.trim(), capacity: cap };
        return d;
      }
    }
  };

  const expiresAt = (): string | null => {
    if (postType === 'notice') return new Date(Date.now() + expiryDays * 86400_000).toISOString();
    if (postType === 'job') return new Date(Date.now() + 30 * 86400_000).toISOString();
    if (postType === 'event') {
      const d = new Date(`${date}T${time}:00`);
      return isNaN(d.getTime()) ? null : new Date(d.getTime() + 12 * 3600_000).toISOString();
    }
    return null;
  };

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      if (postType === 'job' && (!company.trim() || !location.trim())) throw new ApiError('Add the company (or "shared on request") and the location.', 'invalid');
      if (link.trim() && !/^https:\/\//.test(link.trim())) throw new ApiError('Links must start with https://', 'invalid');
      const post = await api.createPost({ circleId, type: postType, title, body, details: buildDetails(), expiresAt: expiresAt() });
      navigation.replace('Post', { id: post.id });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not publish. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <View style={{ gap: space.xs }}>
        <Text style={type.label}>WHAT ARE YOU POSTING?</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          {(Object.keys(TYPE_META) as PostType[]).map((t) => (
            <Chip key={t} label={`${TYPE_META[t].label}${level < REQUIRED_LEVEL[t] ? ' 🔒' : ''}`} selected={postType === t} onPress={() => setPostType(t)} />
          ))}
        </View>
      </View>

      {locked ? (
        <Banner tone="info" title={needed === 3 ? 'This needs an ID-verified account' : 'This needs a work or university email'}>
          {needed === 3
            ? 'Jobs, events and housing posts come from members who have passed an ID check, so newcomers can trust them. ID checks open soon.'
            : 'Sign in with a work or university email, or ask two ID-verified members to vouch for you.'}
        </Banner>
      ) : null}

      <View style={{ gap: space.xs }}>
        <Text style={type.label}>CIRCLE</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          {circles.map((c) => <Chip key={c.id} label={c.name} selected={circleId === c.id} onPress={() => setCircleId(c.id)} />)}
        </View>
      </View>

      {postType === 'notice' ? (
        <>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
            {(Object.keys(NOTICE_LABEL) as NoticeDetails['category'][]).map((c) => (
              <Chip key={c} label={NOTICE_LABEL[c]} selected={category === c} onPress={() => setCategory(c)} />
            ))}
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, alignItems: 'center' }}>
            <Text style={type.small}>Take it down after</Text>
            {EXPIRY.map((e) => <Chip key={e.days} label={e.label} selected={expiryDays === e.days} onPress={() => setExpiryDays(e.days)} />)}
          </View>
        </>
      ) : null}

      {postType === 'question' ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.sm }}>
          {(Object.keys(TOPIC_LABEL) as QuestionDetails['topic'][]).map((t) => (
            <Chip key={t} label={TOPIC_LABEL[t]} selected={topic === t} onPress={() => setTopic(t)} />
          ))}
        </View>
      ) : null}

      <Field label="Title" value={title} onChangeText={setTitle} maxLength={120}
        placeholder={{ notice: 'Found: blue backpack on the 46A bus', question: 'How do I register with a GP?', job: 'Hiring: junior Java developer', event: 'Sunday cricket in the park' }[postType]} />
      <Field label="Details" value={body} onChangeText={setBody} multiline maxLength={4000} />

      {postType === 'job' ? (
        <>
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            <Chip label="Job opening" selected={jobKind === 'opening'} onPress={() => setJobKind('opening')} />
            <Chip label="I can refer" selected={jobKind === 'referral'} onPress={() => setJobKind('referral')} />
          </View>
          <Field label="Company" value={company} onChangeText={setCompany} maxLength={80} placeholder='Name, or "shared on request"' />
          <Field label="Location" value={location} onChangeText={setLocation} maxLength={80} placeholder="Dublin, hybrid" />
          <Field label="Link to the listing (optional)" value={link} onChangeText={setLink} autoCapitalize="none" keyboardType="url" placeholder="https://" />
        </>
      ) : null}

      {postType === 'event' ? (
        <>
          <View style={{ flexDirection: 'row', gap: space.sm }}>
            <View style={{ flex: 3 }}><Field label="Date" value={date} onChangeText={setDate} placeholder="2026-11-28" maxLength={10} /></View>
            <View style={{ flex: 2 }}><Field label="Time" value={time} onChangeText={setTime} placeholder="18:30" maxLength={5} /></View>
          </View>
          <Field label="Public venue" value={venue} onChangeText={setVenue} maxLength={120} placeholder="Café, community hall or park" hint="Events must be in public places. Never host at a private home." />
          <Field label="Places (optional)" value={capacity} onChangeText={setCapacity} keyboardType="number-pad" maxLength={4} />
        </>
      ) : null}

      {warnings.length ? <Banner title="Before you post">{`${warnings[0].text} Posts that ask for money upfront are removed.`}</Banner> : null}
      <ErrorText>{error}</ErrorText>
      <Button title="Publish" icon={locked ? <Lock size={16} color={colors.white} /> : undefined} disabled={locked || !circleId || title.trim().length < 3 || !body.trim()} loading={busy} onPress={submit} />
    </Screen>
  );
}
