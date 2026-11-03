import React, { useCallback, useEffect, useState } from 'react';
import { Linking, Text, View } from 'react-native';
import { Flag, MapPin } from 'lucide-react-native';
import { api, ApiError } from '../lib/api';
import { eventWhen, timeAgo } from '../lib/format';
import { LEVEL_TO_REPLY, type EventDetails, type JobDetails, type Post, type Reply } from '../lib/types';
import { scamWarnings } from '../lib/safety';
import { useApp } from '../state/AppState';
import { colors, space, type } from '../theme';
import { Banner, Button, Card, Empty, ErrorText, Field, Loading, PersonLine, Screen } from '../components/ui';
import { postKicker, TYPE_META } from '../components/PostCard';
import { ReportSheet } from '../components/ReportSheet';
import type { ScreenProps } from '../navigation';

export function PostScreen({ route, navigation }: ScreenProps<'Post'>) {
  const { id } = route.params;
  const { profile } = useApp();
  const [post, setPost] = useState<Post | null | undefined>(undefined);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<{ target: 'post' | 'reply'; id: string } | null>(null);

  const load = useCallback(async () => {
    const [p, r] = await Promise.all([api.getPost(id), api.listReplies(id)]);
    setPost(p);
    setReplies(r);
  }, [id]);

  useEffect(() => { load().catch(() => setPost(null)); }, [load]);

  if (post === undefined) return <Loading />;
  if (post === null) return <Screen><Empty title="This post isn't available" body="It may have expired, been removed, or come from someone you've blocked." /></Screen>;

  const meta = TYPE_META[post.type];
  const isMine = post.author.id === profile?.id;
  const canReply = (profile?.trustLevel ?? 1) >= LEVEL_TO_REPLY;
  const warnings = scamWarnings(post.body);

  const rsvp = async (going: boolean) => {
    setBusy(true);
    setError(null);
    try {
      await api.setRsvp(post.id, going);
      await load();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not update your RSVP.');
    } finally {
      setBusy(false);
    }
  };

  const sendReply = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await api.addReply(post.id, draft);
      setReplies((x) => [...x, r]);
      setDraft('');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not post your reply.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <Text style={[type.label, { color: meta.color }]}>{postKicker(post).toUpperCase()} · {post.circleName.toUpperCase()}</Text>
      <Text style={type.title}>{post.title}</Text>
      <Card onPress={isMine ? undefined : () => navigation.navigate('Member', { id: post.author.id })}>
        <PersonLine person={post.author} sub={`Posted ${timeAgo(post.createdAt)}${isMine ? ' · you' : ''}`} />
      </Card>

      {warnings.length ? <Banner title="Take care">{warnings[0].text}</Banner> : null}
      <Text style={type.body}>{post.body}</Text>

      {post.type === 'event' ? <EventBlock post={post} busy={busy} onRsvp={rsvp} /> : null}
      {post.type === 'job' ? <JobBlock details={post.details as JobDetails} /> : null}
      {post.expiresAt && post.type === 'notice' ? <Text style={type.small}>Comes down on {eventWhen(post.expiresAt)}</Text> : null}
      <ErrorText>{error}</ErrorText>

      <Text style={[type.h2, { marginTop: space.lg }]}>{post.type === 'question' ? 'Answers' : 'Replies'}</Text>
      {replies.length === 0 ? <Text style={type.small}>{post.type === 'question' ? 'No answers yet.' : 'No replies yet.'}</Text> : null}
      {replies.map((r) => (
        <Card key={r.id} style={r.author.isExpert && post.type === 'question' ? { borderColor: colors.saffron } : undefined}>
          <PersonLine person={r.author} sub={timeAgo(r.createdAt)} />
          <Text style={type.body}>{r.body}</Text>
          {r.author.id !== profile?.id ? (
            <Text style={[type.small, { color: colors.muted }]} onPress={() => setReport({ target: 'reply', id: r.id })} accessibilityRole="button">Report</Text>
          ) : null}
        </Card>
      ))}

      {canReply ? (
        <View style={{ gap: space.sm }}>
          <Field label={post.type === 'question' ? 'Your answer' : 'Your reply'} value={draft} onChangeText={setDraft} multiline maxLength={2000}
            hint="Replies are public to members. To talk privately, send a chat request from their profile." />
          <Button title="Post" loading={busy} disabled={!draft.trim()} onPress={sendReply} />
        </View>
      ) : (
        <Banner tone="info" title="Replying needs a work or university email">Sign in with one, or ask two ID-verified members to vouch for you. You can still read everything.</Banner>
      )}

      {!isMine ? (
        <Button title="Report this post" kind="ghost" icon={<Flag size={16} color={colors.teal} />} onPress={() => setReport({ target: 'post', id: post.id })} />
      ) : null}
      <ReportSheet visible={!!report} target={report?.target ?? 'post'} targetId={report?.id ?? ''} onClose={() => setReport(null)} />
    </Screen>
  );
}

function EventBlock({ post, busy, onRsvp }: { post: Post; busy: boolean; onRsvp: (going: boolean) => void }) {
  const d = post.details as EventDetails;
  const full = d.capacity != null && post.rsvpCount >= d.capacity && !post.myRsvp;
  return (
    <Card>
      <Text style={{ fontWeight: '700', color: colors.ink }}>{eventWhen(d.startsAt)}</Text>
      <View style={{ flexDirection: 'row', gap: space.xs, alignItems: 'center' }}>
        <MapPin size={15} color={colors.muted} />
        <Text style={[type.small, { flex: 1 }]}>{d.venue}</Text>
      </View>
      <Text style={type.small}>{post.rsvpCount} going{d.capacity ? ` of ${d.capacity} places` : ''}</Text>
      {post.myRsvp ? (
        <Button title="You're going · cancel RSVP" kind="secondary" loading={busy} onPress={() => onRsvp(false)} />
      ) : (
        <Button title={full ? 'Event is full' : "I'm going"} disabled={full} loading={busy} onPress={() => onRsvp(true)} />
      )}
      <Text style={type.small}>Events are hosted by ID-verified members in public places. Tell someone where you're going.</Text>
    </Card>
  );
}

function JobBlock({ details }: { details: JobDetails }) {
  return (
    <Card>
      <Text style={{ fontWeight: '700', color: colors.ink }}>{details.company}</Text>
      <Text style={type.small}>{details.location}</Text>
      {details.link ? <Button title="Open the job listing" kind="secondary" onPress={() => Linking.openURL(details.link)} /> : null}
      <Text style={type.small}>Real employers never ask you to pay for a job, training or a visa. Report anyone who does.</Text>
    </Card>
  );
}
