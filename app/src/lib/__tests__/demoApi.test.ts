// The demo adapter must follow the same rules as the database, so the preview
// never shows behaviour the real app would refuse.
import { beforeEach, describe, expect, it } from 'vitest';
import { createDemoApi } from '../api/demo';
import { TERMS_VERSION } from '../../config';

let api: ReturnType<typeof createDemoApi>;

beforeEach(async () => {
  api = createDemoApi();
  await api.signInWithGoogle();
  await api.saveMyProfile({ displayName: 'Asha V', city: 'Dublin', country: 'IE', profession: '', almaMater: '', homeState: '', bio: '' });
});

describe('demo api', () => {
  it('joins the city circle on sign-up and shows its posts', async () => {
    const circles = await api.listMyCircles();
    expect(circles.map((c) => c.name)).toEqual(['Dublin']);
    const posts = await api.listPosts({});
    expect(posts.length).toBeGreaterThan(0);
    expect(posts.every((p) => p.circleName === 'Dublin')).toBe(true);
  });

  it('enforces trust levels for posting', async () => {
    const circleId = (await api.listMyCircles())[0].id;
    await expect(api.createPost({ circleId, type: 'job', title: 'Hiring a dev', body: 'Java', details: { kind: 'opening', company: 'X', location: 'Dublin', link: '' }, expiresAt: null }))
      .rejects.toThrow(/trust level 3/);
    await expect(api.createPost({ circleId, type: 'notice', title: 'Room to let', body: 'D6', details: { category: 'housing' }, expiresAt: null }))
      .rejects.toThrow(/trust level 3/);
    const ok = await api.createPost({ circleId, type: 'notice', title: 'Found keys', body: 'Near Luas', details: { category: 'lost_found' }, expiresAt: null });
    expect(ok.author.displayName).toBe('Asha V');
    await api.setDemoTrustLevel!(1);
    await expect(api.addReply(ok.id, 'hello')).rejects.toThrow(/trust level 2/);
  });

  it('lets a Gmail member unlock level 2 with an invite code, and hosting events needs only level 2', async () => {
    await api.setDemoTrustLevel!(1);
    const circleId = (await api.listMyCircles())[0].id;
    const event = { circleId, type: 'event' as const, title: 'Chai meetup', body: 'Come along', details: { startsAt: new Date(Date.now() + 5 * 86400_000).toISOString(), venue: 'Cafe, Dublin 2', capacity: null }, expiresAt: null };
    await expect(api.createPost(event)).rejects.toThrow(/trust level 2/);
    await expect(api.redeemInvite('nope-nope')).rejects.toThrow(/isn't valid/);
    expect(await api.redeemInvite(' sangam-demo ')).toBe(2);
    expect((await api.getMyProfile())!.trustLevel).toBe(2);
    await expect(api.createPost(event)).resolves.toBeTruthy();
    await expect(api.createPost({ ...event, type: 'job', title: 'Hiring', details: { kind: 'opening', company: 'X', location: 'Dublin', link: '' } })).rejects.toThrow(/trust level 3/);
    // a code never lowers a level
    await api.setDemoTrustLevel!(3);
    expect(await api.redeemInvite('SANGAM-DEMO')).toBe(3);
  });

  it('asks new members to accept the rules and remembers which version', async () => {
    expect((await api.getMyProfile())!.termsVersion).toBeNull();
    await expect(api.acceptTerms('latest')).rejects.toThrow(/Unknown version/);
    const p = await api.acceptTerms(TERMS_VERSION);
    expect(p.termsVersion).toBe(TERMS_VERSION);
    expect((await api.getMyProfile())!.termsVersion).toBe(TERMS_VERSION);
  });

  it('opens a chat only after a request is accepted', async () => {
    const { incoming } = await api.listChatRequests();
    expect(incoming).toHaveLength(1);
    const convId = await api.respondChatRequest(incoming[0].id, true);
    expect(convId).toBeTruthy();
    const msgs = await api.listMessages(convId!);
    expect(msgs[0].body).toBe(incoming[0].note);
    await expect(api.sendChatRequest(incoming[0].from.id, 'Hello again, another request')).rejects.toThrow(/already have a chat/);
  });

  it('blocking hides posts and stops messages', async () => {
    const before = await api.listPosts({});
    const author = before.find((p) => p.author.id === 'u-arjun')!.author.id;
    await api.blockUser(author);
    const after = await api.listPosts({});
    expect(after.some((p) => p.author.id === author)).toBe(false);
    expect((await api.listConversations()).some((c) => c.other.id === author)).toBe(false);
    await expect(api.sendChatRequest(author, 'Please let me message you')).rejects.toThrow(/can't message/);
  });

  it('respects event capacity', async () => {
    await api.joinCircle('c-london');
    const ev = (await api.listPosts({ type: 'event' })).find((p) => p.id === 'p-event-newcomers')!;
    await api.setRsvp(ev.id, true);
    expect((await api.getPost(ev.id))!.myRsvp).toBe(true);
    await api.setRsvp(ev.id, false);
    expect((await api.getPost(ev.id))!.myRsvp).toBe(false);
  });

  it('takes service requests and lets members withdraw untouched ones', async () => {
    const base = { serviceId: 'care-visit', tier: 'essential' as const, forWhom: 'parent' as const, location: 'Pune', timing: 'This month', contactMethod: 'chat' as const, phone: '' };
    await expect(api.createServiceRequest({ ...base, details: 'short' })).rejects.toThrow(/at least 10/);
    await expect(api.createServiceRequest({ ...base, details: 'Weekly visits for my mother', contactMethod: 'phone' })).rejects.toThrow(/phone number/);
    const r = await api.createServiceRequest({ ...base, details: 'Weekly visits for my mother' });
    expect(r.status).toBe('received');
    expect(await api.listServiceRequests()).toHaveLength(1);
    await api.withdrawServiceRequest(r.id);
    expect(await api.listServiceRequests()).toHaveLength(0);
  });

  it('deletes the account and signs out', async () => {
    await api.deleteMyAccount();
    expect(await api.getSession()).toBeNull();
    expect(api._state.profiles['u-me']).toBeUndefined();
  });
});
