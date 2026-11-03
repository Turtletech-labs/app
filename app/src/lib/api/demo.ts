// Sample-data implementation of the Api, used for previews and tests.
// It enforces the same rules as the database (trust levels, blocking,
// request-to-chat) so the preview behaves like the real app.
import type { Api, Session } from './types';
import { ApiError } from './types';
import { TERMS_VERSION } from '../../config';
import {
  LEVEL_TO_MESSAGE, LEVEL_TO_REPLY, REQUIRED_LEVEL,
  type ChatRequest, type Circle, type Conversation, type Message, type NoticeDetails, type Post,
  type PostInput, type Profile, type ProfileInput, type ProfileSummary, type Reply, type ServiceRequest, type TrustLevel,
} from '../types';

const ME = 'u-me';
// Codes that work in the preview. Real codes live in the database (docs/invites.md).
const DEMO_INVITES: Record<string, TrustLevel> = { 'SANGAM-DEMO': 2, 'SANGAM-HOST': 3 };
const HOUR = 3600_000;
const DAY = 24 * HOUR;

type StoredPost = Omit<Post, 'author' | 'circleName' | 'replyCount' | 'rsvpCount' | 'myRsvp'> & { authorId: string };
type StoredReply = Omit<Reply, 'author'> & { authorId: string };
type StoredRequest = { id: string; fromId: string; toId: string; note: string; status: ChatRequest['status']; createdAt: string };

interface State {
  session: Session | null;
  profiles: Record<string, Profile>;
  circles: Circle[];
  memberships: Record<string, Set<string>>; // userId -> circle ids
  posts: StoredPost[];
  replies: StoredReply[];
  rsvps: Set<string>; // `${postId}:${userId}`
  requests: StoredRequest[];
  conversations: { id: string; members: [string, string] }[];
  messages: Message[];
  blocks: Set<string>; // `${blocker}:${blocked}`
  reports: { target: string; targetId: string; reason: string }[];
  serviceRequests: ServiceRequest[];
}

function person(id: string, displayName: string, city: string, country: string, profession: string, trustLevel: TrustLevel, isExpert = false, extra: Partial<Profile> = {}): Profile {
  return {
    id, displayName, city, country, profession, trustLevel, isExpert,
    almaMater: '', homeState: '', bio: '', createdAt: new Date(Date.now() - 90 * DAY).toISOString(), termsVersion: TERMS_VERSION, ...extra,
  };
}

export function seedState(now = Date.now()): State {
  const at = (offset: number) => new Date(now + offset).toISOString();
  const dayAt = (days: number, h: number, m = 0) => { const d = new Date(now + days * DAY); d.setHours(h, m, 0, 0); return d.toISOString(); };
  const profiles: Record<string, Profile> = {};
  [
    person('u-priya', 'Priya Nair', 'London', 'GB', 'NHS nurse', 3, true, { bio: 'Nurse in north London. Happy to explain how the NHS works.', homeState: 'Kerala' }),
    person('u-arjun', 'Arjun Mehta', 'Dublin', 'IE', 'Software engineer', 3, false, { almaMater: 'IIT Bombay' }),
    person('u-kavya', 'Kavya Iyer', 'Dublin', 'IE', 'PhD student, Trinity College', 2),
    person('u-rohan', 'Rohan Gupta', 'London', 'GB', 'Chartered accountant', 3, true, { bio: 'UK tax and self-assessment questions welcome.' }),
    person('u-sneha', 'Sneha Reddy', 'Dublin', 'IE', 'Pharmacist', 2),
    person('u-vikram', 'Vikram Singh', 'London', 'GB', 'Tech recruiter', 3),
    person('u-ananya', 'Ananya Das', 'Dublin', 'IE', 'Data analyst', 2, false, { bio: 'Moved to Dublin last week.' }),
    person('u-neha', 'Neha S', 'Dublin', 'IE', '', 2),
  ].forEach((p) => { profiles[p.id] = p; });

  const circles: Circle[] = [
    { id: 'c-dublin', name: 'Dublin', kind: 'city', city: 'Dublin', memberCount: 412 },
    { id: 'c-london', name: 'London', kind: 'city', city: 'London', memberCount: 1288 },
    { id: 'c-tech', name: 'Tech professionals', kind: 'profession', city: null, memberCount: 530 },
    { id: 'c-health', name: 'Doctors, nurses and pharmacists', kind: 'profession', city: null, memberCount: 214 },
    { id: 'c-finance', name: 'Finance and accounting', kind: 'profession', city: null, memberCount: 176 },
    { id: 'c-iit', name: 'IIT alumni', kind: 'alma_mater', city: null, memberCount: 143 },
    { id: 'c-students', name: 'Students', kind: 'life_stage', city: null, memberCount: 389 },
    { id: 'c-parents', name: 'Parents', kind: 'life_stage', city: null, memberCount: 201 },
    { id: 'c-kerala', name: 'From Kerala', kind: 'home_state', city: null, memberCount: 97 },
  ];

  const memberships: Record<string, Set<string>> = {
    [ME]: new Set(),
    'u-priya': new Set(['c-london', 'c-health', 'c-kerala']),
    'u-arjun': new Set(['c-dublin', 'c-tech', 'c-iit']),
    'u-kavya': new Set(['c-dublin', 'c-students']),
    'u-rohan': new Set(['c-london', 'c-finance']),
    'u-sneha': new Set(['c-dublin', 'c-health']),
    'u-vikram': new Set(['c-london', 'c-tech']),
    'u-ananya': new Set(['c-dublin', 'c-tech']),
    'u-neha': new Set(['c-dublin']),
  };

  const posts: StoredPost[] = [
    { id: 'p-blood', circleId: 'c-dublin', authorId: 'u-sneha', type: 'notice', title: 'O-negative blood donors needed this week',
      body: "A friend's father is having surgery at a Dublin hospital on Friday. If you're O-negative and eligible, please book a donation with the blood service and mention his name at the clinic. Message me for details.",
      details: { category: 'blood' }, createdAt: at(-3 * HOUR), expiresAt: at(4 * DAY) },
    { id: 'p-q-gp', circleId: 'c-london', authorId: 'u-ananya', type: 'question', title: 'Can I register with a GP before I have proof of address?',
      body: "I'm staying with a friend for my first month and don't have a bill in my name yet. Will a GP practice still register me?",
      details: { topic: 'health' }, createdAt: at(-20 * HOUR), expiresAt: null },
    { id: 'p-event-newcomers', circleId: 'c-london', authorId: 'u-vikram', type: 'event', title: "Newcomers' meetup: your first 90 days in London",
      body: 'Informal evening for anyone who moved in the last year. Bank accounts, GP registration, commuting, finding flatmates. Bring questions; we bring chai.',
      details: { startsAt: dayAt(9, 18, 30), venue: "Café near King's Cross station (exact place sent to RSVPs)", capacity: 30 }, createdAt: at(-1 * DAY), expiresAt: dayAt(10, 6) },
    { id: 'p-event-diwali', circleId: 'c-dublin', authorId: 'u-arjun', type: 'event', title: 'Diwali potluck and rangoli',
      body: 'Family-friendly potluck at a community hall. Bring a dish and a friend. Kids welcome; rangoli colours provided.',
      details: { startsAt: dayAt(5, 13), venue: 'Community hall, Dublin 8', capacity: 80 }, createdAt: at(-2 * DAY), expiresAt: dayAt(6, 1) },
    { id: 'p-job-referral', circleId: 'c-tech', authorId: 'u-vikram', type: 'job', title: 'Referral: senior data analyst, fintech in Canary Wharf',
      body: "I can refer two people. SQL and Python needed, 4+ years' experience. Hybrid, three days in the office. Send me a chat request with a short note about your background.",
      details: { kind: 'referral', company: 'Fintech (name shared on request)', location: 'London, hybrid', link: '' }, createdAt: at(-5 * HOUR), expiresAt: at(21 * DAY) },
    { id: 'p-job-java', circleId: 'c-dublin', authorId: 'u-arjun', type: 'job', title: "We're hiring a junior Java developer",
      body: 'Product company in Dublin 2, hybrid. Graduate or up to 2 years of experience. Visa sponsorship possible for the right person. Apply through the careers page; I can answer questions about the team.',
      details: { kind: 'opening', company: 'Product company, Dublin 2', location: 'Dublin, hybrid', link: '' }, createdAt: at(-2 * DAY), expiresAt: at(28 * DAY) },
    { id: 'p-ride', circleId: 'c-dublin', authorId: 'u-kavya', type: 'notice', title: 'Ride to Galway on Saturday morning, 2 seats',
      body: 'Leaving Dublin around 8:00, back Sunday evening. Happy to share fuel costs at the end; no money upfront.',
      details: { category: 'ride' }, createdAt: at(-26 * HOUR), expiresAt: at(3 * DAY) },
    { id: 'p-q-myaccount', circleId: 'c-dublin', authorId: 'u-kavya', type: 'question', title: 'Starting my first job in Ireland: what do I set up for tax?',
      body: 'I have my PPS number now. My start date is in two weeks. What do I need to do so I am not on emergency tax?',
      details: { topic: 'tax' }, createdAt: at(-3 * DAY), expiresAt: null },
    { id: 'p-lost', circleId: 'c-london', authorId: 'u-priya', type: 'notice', title: 'Found: brown leather wallet near Wembley Park station',
      body: "Found on Sunday evening. No cash, but there's an Indian driving licence inside. Describe it to me and it's yours.",
      details: { category: 'lost_found' }, createdAt: at(-30 * HOUR), expiresAt: at(10 * DAY) },
    { id: 'p-q-kids', circleId: 'c-parents', authorId: 'u-sneha', type: 'question', title: 'Weekend Hindi or Tamil classes for kids in south Dublin?',
      body: 'Our daughter is 6. Looking for something on Saturday mornings, ideally near Dundrum.',
      details: { topic: 'parenting' }, createdAt: at(-4 * DAY), expiresAt: null },
  ];

  const replies: StoredReply[] = [
    { id: 'r-1', postId: 'p-q-gp', authorId: 'u-priya', createdAt: at(-18 * HOUR),
      body: "Yes. In England you don't need proof of address, ID or an immigration status to register with a GP. Ask the practice for its registration form or use the NHS website to register online. If a practice turns you down, it should tell you why in writing." },
    { id: 'r-2', postId: 'p-q-myaccount', authorId: 'u-arjun', createdAt: at(-2 * DAY),
      body: 'Register for Revenue myAccount with your PPS number, then add your new job under "Jobs and pensions" once your employer has registered you. That gets your tax credits onto your payslip instead of emergency tax.' },
    { id: 'r-3', postId: 'p-blood', authorId: 'u-kavya', createdAt: at(-2 * HOUR), body: 'Shared with the Trinity Indian society group.' },
  ];

  const requests: StoredRequest[] = [
    { id: 'rq-1', fromId: 'u-ananya', toId: ME, status: 'pending', createdAt: at(-90 * 60_000),
      note: "Hi! I moved to Dublin last week and saw you're in the Dublin circle. Could I ask a couple of questions about finding a GP?" },
  ];

  const conversations: State['conversations'] = [
    { id: 'cv-arjun', members: [ME, 'u-arjun'] },
    { id: 'cv-neha', members: [ME, 'u-neha'] },
  ];

  const messages: Message[] = [
    { id: 'm-1', conversationId: 'cv-arjun', senderId: 'u-arjun', createdAt: at(-26 * HOUR), body: 'Welcome to Dublin! Are you coming to the Diwali potluck?' },
    { id: 'm-2', conversationId: 'cv-arjun', senderId: ME, createdAt: at(-25 * HOUR), body: "Yes, I'll bring something. Thanks for organising." },
    { id: 'm-3', conversationId: 'cv-neha', senderId: 'u-neha', createdAt: at(-40 * 60_000),
      body: 'Hi, I saw you are looking for a room. I can hold it for you if you send a €500 deposit today by bank transfer. WhatsApp me on +353 87 000 0000.' },
  ];

  return {
    session: null, profiles, circles, memberships, posts, replies, rsvps: new Set(['p-event-diwali:u-arjun', 'p-event-diwali:u-kavya']),
    requests, conversations, messages, blocks: new Set(), reports: [], serviceRequests: [],
  };
}

const tick = () => new Promise<void>((r) => setTimeout(r, 120));
let seq = 0;
const newId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${(seq++).toString(36)}`;

export function createDemoApi(initial: State = seedState()): Api & { _state: State } {
  const s = initial;
  const listeners = new Set<(x: Session | null) => void>();
  const msgListeners = new Map<string, Set<(m: Message) => void>>();

  const me = (): Profile => {
    const p = s.profiles[ME];
    if (!s.session || !p) throw new ApiError('Please sign in first.', 'not_allowed');
    return p;
  };
  const summary = (id: string): ProfileSummary => {
    const p = s.profiles[id];
    return p
      ? { id: p.id, displayName: p.displayName, city: p.city, trustLevel: p.trustLevel, isExpert: p.isExpert }
      : { id, displayName: 'Deleted member', city: '', trustLevel: 1, isExpert: false };
  };
  const blockedEitherWay = (a: string, b: string) => s.blocks.has(`${a}:${b}`) || s.blocks.has(`${b}:${a}`);
  const hydrate = (p: StoredPost): Post => ({
    ...p,
    author: summary(p.authorId),
    circleName: s.circles.find((c) => c.id === p.circleId)?.name ?? '',
    replyCount: s.replies.filter((r) => r.postId === p.id).length,
    rsvpCount: [...s.rsvps].filter((k) => k.startsWith(`${p.id}:`)).length,
    myRsvp: s.rsvps.has(`${p.id}:${ME}`),
  });
  const visible = (p: StoredPost) =>
    (!p.expiresAt || new Date(p.expiresAt).getTime() > Date.now()) && !blockedEitherWay(ME, p.authorId);
  const requiredLevel = (input: Pick<PostInput, 'type' | 'details'>): TrustLevel =>
    input.type === 'notice' && (input.details as NoticeDetails).category === 'housing' ? 3 : REQUIRED_LEVEL[input.type];
  const emit = (x: Session | null) => listeners.forEach((l) => l(x));

  const api: Api & { _state: State } = {
    mode: 'demo',
    _state: s,

    async getSession() { return s.session; },
    onAuthChange(cb) { listeners.add(cb); return () => listeners.delete(cb); },
    async sendEmailCode(email) {
      await tick();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ApiError('Enter a valid email address.', 'invalid');
    },
    async verifyEmailCode(email, code) {
      await tick();
      if (!/^\d{6}$/.test(code)) throw new ApiError('Enter the 6-digit code from the email. In the demo, any 6 digits work.', 'invalid');
      s.session = { userId: ME, email };
      emit(s.session);
    },
    async signInWithGoogle() {
      await tick();
      s.session = { userId: ME, email: 'demo@example.com' };
      emit(s.session);
    },
    async signOut() { s.session = null; emit(null); },
    async deleteMyAccount() {
      me();
      delete s.profiles[ME];
      s.memberships[ME] = new Set();
      s.posts = s.posts.filter((p) => p.authorId !== ME);
      s.replies = s.replies.filter((r) => r.authorId !== ME);
      s.requests = s.requests.filter((r) => r.fromId !== ME && r.toId !== ME);
      s.messages = s.messages.filter((m) => m.senderId !== ME);
      s.session = null;
      emit(null);
    },

    async getMyProfile() { await tick(); return s.session ? s.profiles[ME] ?? null : null; },
    async saveMyProfile(input: ProfileInput) {
      await tick();
      if (!s.session) throw new ApiError('Please sign in first.', 'not_allowed');
      const name = input.displayName.trim();
      if (name.length < 2 || name.length > 60) throw new ApiError('Use a name between 2 and 60 characters.', 'invalid');
      const existing = s.profiles[ME];
      const p: Profile = {
        ...(existing ?? person(ME, name, input.city, input.country, input.profession, 2)),
        ...input,
        displayName: name,
        createdAt: existing?.createdAt ?? new Date().toISOString(),
        termsVersion: existing ? existing.termsVersion : null,
      };
      s.profiles[ME] = p;
      const cityCircle = s.circles.find((c) => c.kind === 'city' && c.city === p.city);
      if (cityCircle) s.memberships[ME].add(cityCircle.id);
      return p;
    },
    async acceptTerms(version) {
      const p = me();
      if (!/^\d{4}-\d{2}-\d{2}$/.test(version)) throw new ApiError('Unknown version of the rules.', 'invalid');
      s.profiles[ME] = { ...p, termsVersion: version };
      return s.profiles[ME];
    },
    async getProfile(id) { await tick(); return blockedEitherWay(ME, id) && id !== ME ? null : s.profiles[id] ?? null; },

    async redeemInvite(code) {
      const p = me();
      await tick();
      const level = DEMO_INVITES[code.trim().toUpperCase()];
      if (!level) throw new ApiError("That code isn't valid, has expired or has been used up. Check it and try again.", 'invalid');
      const next = Math.max(p.trustLevel, level) as TrustLevel;
      s.profiles[ME] = { ...p, trustLevel: next };
      return next;
    },

    async listMyCircles() { await tick(); return s.circles.filter((c) => s.memberships[ME]?.has(c.id)); },
    async listOtherCircles() { await tick(); return s.circles.filter((c) => !s.memberships[ME]?.has(c.id)); },
    async joinCircle(id) { me(); s.memberships[ME].add(id); },
    async leaveCircle(id) {
      const p = me();
      const c = s.circles.find((x) => x.id === id);
      if (c?.kind === 'city' && c.city === p.city) throw new ApiError('You stay in your own city circle. Change your city in your profile instead.', 'not_allowed');
      s.memberships[ME].delete(id);
    },

    async listPosts({ circleIds, type }) {
      await tick();
      me();
      const ids = circleIds ?? [...(s.memberships[ME] ?? [])];
      return s.posts
        .filter((p) => ids.includes(p.circleId) && (!type || p.type === type) && visible(p))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map(hydrate);
    },
    async getPost(id) {
      await tick();
      const p = s.posts.find((x) => x.id === id);
      return p && visible(p) ? hydrate(p) : null;
    },
    async createPost(input) {
      await tick();
      const p = me();
      const need = requiredLevel(input);
      if (p.trustLevel < need) throw new ApiError(`This kind of post needs trust level ${need}.`, 'not_allowed');
      if (!s.memberships[ME].has(input.circleId)) throw new ApiError('Join this circle before posting in it.', 'not_allowed');
      const title = input.title.trim();
      if (title.length < 3 || title.length > 120) throw new ApiError('Use a title between 3 and 120 characters.', 'invalid');
      if (input.body.trim().length < 1 || input.body.length > 4000) throw new ApiError('Write up to 4,000 characters.', 'invalid');
      const stored: StoredPost = { ...input, title, body: input.body.trim(), id: newId('p'), authorId: ME, createdAt: new Date().toISOString() };
      s.posts.unshift(stored);
      return hydrate(stored);
    },
    async listReplies(postId) {
      await tick();
      return s.replies
        .filter((r) => r.postId === postId && !blockedEitherWay(ME, r.authorId))
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
        .map((r) => ({ ...r, author: summary(r.authorId) }));
    },
    async addReply(postId, body) {
      await tick();
      const p = me();
      if (p.trustLevel < LEVEL_TO_REPLY) throw new ApiError(`Replying needs trust level ${LEVEL_TO_REPLY}.`, 'not_allowed');
      const text = body.trim();
      if (!text || text.length > 2000) throw new ApiError('Write a reply of up to 2,000 characters.', 'invalid');
      const r: StoredReply = { id: newId('r'), postId, authorId: ME, body: text, createdAt: new Date().toISOString() };
      s.replies.push(r);
      return { ...r, author: summary(ME) };
    },
    async setRsvp(postId, going) {
      me();
      const post = s.posts.find((x) => x.id === postId);
      if (!post || post.type !== 'event') throw new ApiError('Only events take RSVPs.', 'invalid');
      const key = `${postId}:${ME}`;
      if (going) {
        const cap = (post.details as { capacity: number | null }).capacity;
        const count = [...s.rsvps].filter((k) => k.startsWith(`${postId}:`)).length;
        if (cap && count >= cap && !s.rsvps.has(key)) throw new ApiError('This event is full.', 'not_allowed');
        s.rsvps.add(key);
      } else s.rsvps.delete(key);
    },

    async listChatRequests() {
      await tick();
      me();
      const map = (r: StoredRequest): ChatRequest => ({ id: r.id, from: summary(r.fromId), to: summary(r.toId), note: r.note, status: r.status, createdAt: r.createdAt });
      return {
        incoming: s.requests.filter((r) => r.toId === ME && r.status === 'pending' && !blockedEitherWay(ME, r.fromId)).map(map),
        outgoing: s.requests.filter((r) => r.fromId === ME && r.status === 'pending').map(map),
      };
    },
    async sendChatRequest(toUserId, note) {
      await tick();
      const p = me();
      if (p.trustLevel < LEVEL_TO_MESSAGE) throw new ApiError(`Messaging needs trust level ${LEVEL_TO_MESSAGE}.`, 'not_allowed');
      if (toUserId === ME) throw new ApiError("You can't message yourself.", 'invalid');
      if (blockedEitherWay(ME, toUserId)) throw new ApiError("You can't message this member.", 'blocked');
      const text = note.trim();
      if (text.length < 10 || text.length > 280) throw new ApiError('Write a short note (10 to 280 characters) so they know why you are getting in touch.', 'invalid');
      if (s.conversations.some((c) => c.members.includes(ME) && c.members.includes(toUserId))) throw new ApiError('You already have a chat with this member.', 'invalid');
      if (s.requests.some((r) => r.fromId === ME && r.toId === toUserId && r.status === 'pending')) throw new ApiError('Your request is still waiting for an answer.', 'invalid');
      s.requests.push({ id: newId('rq'), fromId: ME, toId: toUserId, note: text, status: 'pending', createdAt: new Date().toISOString() });
    },
    async respondChatRequest(id, accept) {
      await tick();
      me();
      const r = s.requests.find((x) => x.id === id && x.toId === ME && x.status === 'pending');
      if (!r) throw new ApiError('This request is no longer open.', 'invalid');
      r.status = accept ? 'accepted' : 'declined';
      if (!accept) return null;
      const conv = { id: newId('cv'), members: [r.fromId, r.toId] as [string, string] };
      s.conversations.push(conv);
      s.messages.push({ id: newId('m'), conversationId: conv.id, senderId: r.fromId, body: r.note, createdAt: r.createdAt });
      return conv.id;
    },
    async listConversations() {
      await tick();
      me();
      return s.conversations
        .filter((c) => c.members.includes(ME))
        .map((c): Conversation => {
          const other = c.members.find((m) => m !== ME)!;
          const msgs = s.messages.filter((m) => m.conversationId === c.id);
          const last = msgs[msgs.length - 1];
          return { id: c.id, other: summary(other), lastMessage: last?.body ?? '', updatedAt: last?.createdAt ?? new Date(0).toISOString() };
        })
        .filter((c) => !blockedEitherWay(ME, c.other.id))
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    },
    async listMessages(conversationId) {
      await tick();
      const c = s.conversations.find((x) => x.id === conversationId && x.members.includes(ME));
      if (!c) throw new ApiError('Chat not found.', 'not_allowed');
      return s.messages.filter((m) => m.conversationId === conversationId);
    },
    async sendMessage(conversationId, body) {
      await tick();
      me();
      const c = s.conversations.find((x) => x.id === conversationId && x.members.includes(ME));
      if (!c) throw new ApiError('Chat not found.', 'not_allowed');
      const other = c.members.find((m) => m !== ME)!;
      if (blockedEitherWay(ME, other)) throw new ApiError("You can't message this member.", 'blocked');
      const text = body.trim();
      if (!text || text.length > 2000) throw new ApiError('Write a message of up to 2,000 characters.', 'invalid');
      const m: Message = { id: newId('m'), conversationId, senderId: ME, body: text, createdAt: new Date().toISOString() };
      s.messages.push(m);
      msgListeners.get(conversationId)?.forEach((l) => l(m));
      return m;
    },
    subscribeMessages(conversationId, cb) {
      const set = msgListeners.get(conversationId) ?? new Set();
      set.add(cb);
      msgListeners.set(conversationId, set);
      return () => set.delete(cb);
    },

    async blockUser(userId) { me(); if (userId !== ME) s.blocks.add(`${ME}:${userId}`); },
    async listBlocked() {
      return [...s.blocks].filter((k) => k.startsWith(`${ME}:`)).map((k) => summary(k.split(':')[1]));
    },
    async unblockUser(userId) { s.blocks.delete(`${ME}:${userId}`); },
    async report(target, targetId, reason) {
      me();
      if (reason.trim().length < 3) throw new ApiError('Tell us briefly what is wrong.', 'invalid');
      s.reports.push({ target, targetId, reason: reason.trim() });
    },

    async listServiceRequests() {
      await tick();
      me();
      return [...s.serviceRequests].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },
    async createServiceRequest(input) {
      await tick();
      me();
      if (input.details.trim().length < 10) throw new ApiError('Tell us a little more (at least 10 characters) so we can help.', 'invalid');
      if (input.contactMethod === 'phone' && input.phone.replace(/\D/g, '').length < 8) throw new ApiError('Add a phone number with country code, or choose a reply in the app.', 'invalid');
      const today = s.serviceRequests.filter((r) => Date.now() - new Date(r.createdAt).getTime() < DAY).length;
      if (today >= 10) throw new ApiError('You have made a lot of requests today. A relationship manager will be in touch.', 'rate_limited');
      const r: ServiceRequest = { ...input, details: input.details.trim(), id: newId('sr'), status: 'received', createdAt: new Date().toISOString() };
      s.serviceRequests.push(r);
      return r;
    },
    async withdrawServiceRequest(id) {
      me();
      const r = s.serviceRequests.find((x) => x.id === id);
      if (!r || r.status !== 'received') throw new ApiError('This request is already being handled. Message your relationship manager instead.', 'not_allowed');
      s.serviceRequests = s.serviceRequests.filter((x) => x.id !== id);
    },

    async setDemoTrustLevel(level) {
      const p = me();
      s.profiles[ME] = { ...p, trustLevel: level };
    },
  };
  return api;
}
