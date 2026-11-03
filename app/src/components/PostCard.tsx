import React from 'react';
import { Text, View } from 'react-native';
import { Briefcase, CalendarDays, CircleHelp, Megaphone } from 'lucide-react-native';
import { colors, space, type } from '../theme';
import { eventWhen, timeAgo } from '../lib/format';
import type { EventDetails, JobDetails, NoticeDetails, Post, PostType, QuestionDetails } from '../lib/types';
import { Card } from './ui';

export const TYPE_META: Record<PostType, { label: string; plural: string; Icon: typeof Megaphone; color: string }> = {
  notice: { label: 'Notice', plural: 'Notices', Icon: Megaphone, color: colors.saffron },
  question: { label: 'Question', plural: 'Questions', Icon: CircleHelp, color: colors.teal },
  job: { label: 'Job', plural: 'Jobs', Icon: Briefcase, color: colors.ink },
  event: { label: 'Event', plural: 'Events', Icon: CalendarDays, color: colors.good },
};

export const NOTICE_LABEL: Record<NoticeDetails['category'], string> = {
  lost_found: 'Lost and found', blood: 'Blood needed', ride: 'Ride share', alert: 'Safety alert', housing: 'Housing', general: 'General',
};
export const TOPIC_LABEL: Record<QuestionDetails['topic'], string> = {
  visa: 'Visa', tax: 'Tax', health: 'Health system', parenting: 'Parenting', work: 'Work', other: 'Other',
};

export function postKicker(p: Post): string {
  switch (p.type) {
    case 'notice': return NOTICE_LABEL[(p.details as NoticeDetails).category] ?? 'Notice';
    case 'question': return `Question · ${TOPIC_LABEL[(p.details as QuestionDetails).topic] ?? 'Other'}`;
    case 'job': return (p.details as JobDetails).kind === 'referral' ? 'Referral offer' : 'Job opening';
    case 'event': return `Event · ${eventWhen((p.details as EventDetails).startsAt)}`;
  }
}

export function PostCard({ post, onPress }: { post: Post; onPress: () => void }) {
  const meta = TYPE_META[post.type];
  const footer = post.type === 'event'
    ? `${post.rsvpCount} going${post.myRsvp ? ' · you' : ''}`
    : post.type === 'question' ? `${post.replyCount} ${post.replyCount === 1 ? 'answer' : 'answers'}` : `${post.replyCount} ${post.replyCount === 1 ? 'reply' : 'replies'}`;
  return (
    <Card onPress={onPress} accessibilityLabel={`${meta.label}: ${post.title}`}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}>
        <meta.Icon size={15} color={meta.color} />
        <Text style={[type.label, { color: meta.color }]} numberOfLines={1}>{postKicker(post).toUpperCase()}</Text>
      </View>
      <Text style={{ fontSize: 17, fontWeight: '700', color: colors.ink, lineHeight: 23 }}>{post.title}</Text>
      <Text style={[type.body, { color: colors.muted }]} numberOfLines={2}>{post.body}</Text>
      <Text style={type.small}>
        {post.author.displayName} · {post.circleName} · {timeAgo(post.createdAt)} · {footer}
      </Text>
    </Card>
  );
}
