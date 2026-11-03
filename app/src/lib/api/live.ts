// Supabase implementation of the Api. Access rules live in the database
// (supabase/migrations); this file only maps rows to app types.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { Platform } from 'react-native';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '../../config';
import type { Api, Session } from './types';
import { ApiError } from './types';
import type {
  ChatRequest, Circle, Conversation, Message, Post, PostDetails, Profile, ProfileSummary, Reply, ServiceRequest,
} from '../types';

const AUTHOR = 'id, display_name, city, trust_level, is_expert';

type Row = Record<string, any>;

const toSummary = (r: Row | null | undefined): ProfileSummary =>
  r
    ? { id: r.id, displayName: r.display_name, city: r.city, trustLevel: r.trust_level, isExpert: r.is_expert }
    : { id: '', displayName: 'Deleted member', city: '', trustLevel: 1, isExpert: false };

const toProfile = (r: Row): Profile => ({
  ...toSummary(r),
  country: r.country, profession: r.profession, almaMater: r.alma_mater, homeState: r.home_state, bio: r.bio, createdAt: r.created_at,
});

const toServiceRequest = (r: Row): ServiceRequest => ({
  id: r.id, serviceId: r.service_id, tier: r.tier, forWhom: r.for_whom, location: r.location, timing: r.timing,
  details: r.details, contactMethod: r.contact_method, phone: r.phone, status: r.status, createdAt: r.created_at,
});

const toCircle = (r: Row): Circle => ({ id: r.id, name: r.name, kind: r.kind, city: r.city, memberCount: r.member_count });

const toPost = (r: Row, myRsvps: Set<string>): Post => ({
  id: r.id, circleId: r.circle_id, circleName: r.circle?.name ?? '', type: r.type, title: r.title, body: r.body,
  details: r.details as PostDetails, author: toSummary(r.author), createdAt: r.created_at, expiresAt: r.expires_at,
  replyCount: r.reply_count, rsvpCount: r.rsvp_count, myRsvp: myRsvps.has(r.id),
});

function fail(error: { message: string; code?: string } | null): void {
  if (!error) return;
  const msg = error.message || 'Something went wrong.';
  if (/row-level security|permission denied/i.test(msg)) throw new ApiError("You can't do that yet. Check your trust level, or whether you've joined this circle.", 'not_allowed');
  if (/too quickly|most chat requests|posted a lot/i.test(msg)) throw new ApiError(msg, 'rate_limited');
  if (/fetch|network/i.test(msg)) throw new ApiError("Can't reach the server. Check your connection.", 'network');
  throw new ApiError(msg, error.code === 'P0001' ? 'invalid' : 'unknown');
}

export function createLiveApi(): Api {
  const sb: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      storage: Platform.OS === 'web' ? undefined : AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: Platform.OS === 'web',
      flowType: 'pkce',
    },
  });

  const uid = async (): Promise<string> => {
    const { data } = await sb.auth.getSession();
    const id = data.session?.user.id;
    if (!id) throw new ApiError('Please sign in first.', 'not_allowed');
    return id;
  };
  const toSession = (s: { user: { id: string; email?: string } } | null): Session | null =>
    s ? { userId: s.user.id, email: s.user.email ?? '' } : null;

  const myRsvpSet = async (postIds: string[]) => {
    if (!postIds.length) return new Set<string>();
    const { data, error } = await sb.from('event_rsvps').select('post_id').in('post_id', postIds);
    fail(error);
    return new Set((data ?? []).map((r) => r.post_id as string));
  };

  return {
    mode: 'live',

    async getSession() {
      const { data } = await sb.auth.getSession();
      return toSession(data.session);
    },
    onAuthChange(cb) {
      const { data } = sb.auth.onAuthStateChange((_e, s) => cb(toSession(s)));
      return () => data.subscription.unsubscribe();
    },
    async sendEmailCode(email) {
      const { error } = await sb.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: true } });
      fail(error);
    },
    async verifyEmailCode(email, code) {
      const { error } = await sb.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: 'email' });
      fail(error);
    },
    async signInWithGoogle() {
      const redirectTo = Linking.createURL('/auth-callback');
      const { data, error } = await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo, skipBrowserRedirect: Platform.OS !== 'web' } });
      fail(error);
      if (Platform.OS !== 'web' && data?.url) {
        const res = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
        if (res.type === 'success') {
          const code = new URL(res.url).searchParams.get('code');
          if (code) fail((await sb.auth.exchangeCodeForSession(code)).error);
        }
      }
    },
    async signOut() { await sb.auth.signOut(); },
    async deleteMyAccount() {
      const { error } = await sb.rpc('delete_my_account');
      fail(error);
      await sb.auth.signOut();
    },

    async getMyProfile() {
      const id = await uid();
      const { data, error } = await sb.from('profiles').select('*').eq('id', id).maybeSingle();
      fail(error);
      return data ? toProfile(data) : null;
    },
    async saveMyProfile(input) {
      const id = await uid();
      const row = {
        display_name: input.displayName.trim(), city: input.city, country: input.country, profession: input.profession,
        alma_mater: input.almaMater, home_state: input.homeState, bio: input.bio,
      };
      const { data: existing } = await sb.from('profiles').select('id').eq('id', id).maybeSingle();
      const q = existing ? sb.from('profiles').update(row).eq('id', id) : sb.from('profiles').insert({ id, ...row });
      const { error } = await q;
      fail(error);
      const { data, error: e2 } = await sb.from('profiles').select('*').eq('id', id).single();
      fail(e2);
      return toProfile(data!);
    },
    async getProfile(id) {
      const { data, error } = await sb.from('profiles').select('*').eq('id', id).maybeSingle();
      fail(error);
      return data ? toProfile(data) : null;
    },

    async listMyCircles() {
      const { data, error } = await sb.from('circle_members').select('circle:circles(*)');
      fail(error);
      return (data ?? []).map((r: Row) => toCircle(r.circle));
    },
    async listOtherCircles() {
      const mine = new Set((await this.listMyCircles()).map((c) => c.id));
      const { data, error } = await sb.from('circles').select('*').order('member_count', { ascending: false });
      fail(error);
      return (data ?? []).map(toCircle).filter((c) => !mine.has(c.id));
    },
    async joinCircle(id) { fail((await sb.from('circle_members').insert({ circle_id: id })).error); },
    async leaveCircle(id) {
      const me = await uid();
      fail((await sb.from('circle_members').delete().eq('circle_id', id).eq('user_id', me)).error);
    },

    async listPosts({ circleIds, type }) {
      const ids = circleIds ?? (await this.listMyCircles()).map((c) => c.id);
      if (!ids.length) return [];
      let q = sb.from('posts').select(`*, author:profiles!posts_author_id_fkey(${AUTHOR}), circle:circles(name)`)
        .in('circle_id', ids).order('created_at', { ascending: false }).limit(100);
      if (type) q = q.eq('type', type);
      const { data, error } = await q;
      fail(error);
      const rows = data ?? [];
      const rsvps = await myRsvpSet(rows.filter((r) => r.type === 'event').map((r) => r.id));
      return rows.map((r) => toPost(r, rsvps));
    },
    async getPost(id) {
      const { data, error } = await sb.from('posts').select(`*, author:profiles!posts_author_id_fkey(${AUTHOR}), circle:circles(name)`).eq('id', id).maybeSingle();
      fail(error);
      if (!data) return null;
      return toPost(data, await myRsvpSet([data.id]));
    },
    async createPost(input) {
      const { data, error } = await sb.from('posts').insert({
        circle_id: input.circleId, type: input.type, title: input.title.trim(), body: input.body.trim(),
        details: input.details, expires_at: input.expiresAt,
      }).select('id').single();
      fail(error);
      return (await this.getPost(data!.id))!;
    },
    async listReplies(postId) {
      const { data, error } = await sb.from('replies').select(`*, author:profiles!replies_author_id_fkey(${AUTHOR})`)
        .eq('post_id', postId).order('created_at');
      fail(error);
      return (data ?? []).map((r): Reply => ({ id: r.id, postId: r.post_id, author: toSummary(r.author), body: r.body, createdAt: r.created_at }));
    },
    async addReply(postId, body) {
      const { data, error } = await sb.from('replies').insert({ post_id: postId, body: body.trim() })
        .select(`*, author:profiles!replies_author_id_fkey(${AUTHOR})`).single();
      fail(error);
      return { id: data!.id, postId, author: toSummary(data!.author), body: data!.body, createdAt: data!.created_at };
    },
    async setRsvp(postId, going) {
      if (going) fail((await sb.from('event_rsvps').insert({ post_id: postId })).error);
      else {
        const me = await uid();
        fail((await sb.from('event_rsvps').delete().eq('post_id', postId).eq('user_id', me)).error);
      }
    },

    async listChatRequests() {
      const me = await uid();
      const { data, error } = await sb.from('chat_requests')
        .select(`*, from:profiles!chat_requests_from_id_fkey(${AUTHOR}), to:profiles!chat_requests_to_id_fkey(${AUTHOR})`)
        .eq('status', 'pending').order('created_at', { ascending: false });
      fail(error);
      const all = (data ?? []).map((r): ChatRequest => ({
        id: r.id, from: toSummary(r.from), to: toSummary(r.to), note: r.note, status: r.status, createdAt: r.created_at,
      }));
      return { incoming: all.filter((r) => r.to.id === me), outgoing: all.filter((r) => r.from.id === me) };
    },
    async sendChatRequest(toUserId, note) {
      fail((await sb.from('chat_requests').insert({ to_id: toUserId, note: note.trim() })).error);
    },
    async respondChatRequest(id, accept) {
      const { data, error } = await sb.rpc('respond_chat_request', { request_id: id, accept });
      fail(error);
      return (data as string | null) ?? null;
    },
    async listConversations() {
      const me = await uid();
      const { data, error } = await sb.from('conversations')
        .select(`id, last_message, last_message_at, members:conversation_members(user_id, profile:profiles(${AUTHOR}))`)
        .order('last_message_at', { ascending: false });
      fail(error);
      return (data ?? []).map((c: Row): Conversation => {
        const other = (c.members as Row[]).find((m) => m.user_id !== me);
        return { id: c.id, other: toSummary(other?.profile), lastMessage: c.last_message, updatedAt: c.last_message_at };
      });
    },
    async listMessages(conversationId) {
      const { data, error } = await sb.from('messages').select('*').eq('conversation_id', conversationId).order('created_at').limit(500);
      fail(error);
      return (data ?? []).map((m): Message => ({ id: m.id, conversationId: m.conversation_id, senderId: m.sender_id, body: m.body, createdAt: m.created_at }));
    },
    async sendMessage(conversationId, body) {
      const { data, error } = await sb.from('messages').insert({ conversation_id: conversationId, body: body.trim() }).select('*').single();
      fail(error);
      return { id: data!.id, conversationId, senderId: data!.sender_id, body: data!.body, createdAt: data!.created_at };
    },
    subscribeMessages(conversationId, cb) {
      const ch = sb.channel(`messages:${conversationId}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
          (p) => {
            const m = p.new as Row;
            cb({ id: m.id, conversationId: m.conversation_id, senderId: m.sender_id, body: m.body, createdAt: m.created_at });
          })
        .subscribe();
      return () => { sb.removeChannel(ch); };
    },

    async blockUser(userId) { fail((await sb.from('blocks').insert({ blocked_id: userId })).error); },
    async listBlocked() {
      const { data, error } = await sb.from('blocks').select(`blocked:profiles!blocks_blocked_id_fkey(${AUTHOR})`);
      fail(error);
      return (data ?? []).map((r: Row) => toSummary(r.blocked));
    },
    async unblockUser(userId) {
      const me = await uid();
      fail((await sb.from('blocks').delete().eq('blocker_id', me).eq('blocked_id', userId)).error);
    },
    async report(target, targetId, reason) {
      fail((await sb.from('reports').insert({ target, target_id: targetId, reason: reason.trim() })).error);
    },

    async listServiceRequests() {
      const { data, error } = await sb.from('service_requests').select('*').order('created_at', { ascending: false });
      fail(error);
      return (data ?? []).map(toServiceRequest);
    },
    async createServiceRequest(input) {
      const { data, error } = await sb.from('service_requests').insert({
        service_id: input.serviceId, tier: input.tier, for_whom: input.forWhom, location: input.location.trim(),
        timing: input.timing, details: input.details.trim(), contact_method: input.contactMethod,
        phone: input.contactMethod === 'phone' ? input.phone.trim() : '',
      }).select('*').single();
      fail(error);
      return toServiceRequest(data!);
    },
    async withdrawServiceRequest(id) {
      const { data, error } = await sb.from('service_requests').delete().eq('id', id).select('id');
      fail(error);
      if (!data?.length) throw new ApiError('This request is already being handled. Message your relationship manager instead.', 'not_allowed');
    },
  };
}
