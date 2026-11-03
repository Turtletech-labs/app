import type {
  ChatRequest, Circle, Conversation, Message, Post, PostInput, PostType, Profile, ProfileInput,
  ProfileSummary, Reply, ReportTarget, ServiceRequest, ServiceRequestInput,
} from '../types';

export interface Session { userId: string; email: string }

// One interface, two implementations: `live` (Supabase) and `demo` (sample data).
// Screens only ever talk to this interface.
export interface Api {
  mode: 'live' | 'demo';

  getSession(): Promise<Session | null>;
  onAuthChange(cb: (s: Session | null) => void): () => void;
  sendEmailCode(email: string): Promise<void>;
  verifyEmailCode(email: string, code: string): Promise<void>;
  signInWithGoogle(): Promise<void>;
  signOut(): Promise<void>;
  deleteMyAccount(): Promise<void>;

  getMyProfile(): Promise<Profile | null>;
  saveMyProfile(input: ProfileInput): Promise<Profile>;
  getProfile(id: string): Promise<Profile | null>;

  listMyCircles(): Promise<Circle[]>;
  listOtherCircles(): Promise<Circle[]>;
  joinCircle(id: string): Promise<void>;
  leaveCircle(id: string): Promise<void>;

  listPosts(filter: { circleIds?: string[]; type?: PostType }): Promise<Post[]>;
  getPost(id: string): Promise<Post | null>;
  createPost(input: PostInput): Promise<Post>;
  listReplies(postId: string): Promise<Reply[]>;
  addReply(postId: string, body: string): Promise<Reply>;
  setRsvp(postId: string, going: boolean): Promise<void>;

  listChatRequests(): Promise<{ incoming: ChatRequest[]; outgoing: ChatRequest[] }>;
  sendChatRequest(toUserId: string, note: string): Promise<void>;
  respondChatRequest(id: string, accept: boolean): Promise<string | null>; // conversation id when accepted
  listConversations(): Promise<Conversation[]>;
  listMessages(conversationId: string): Promise<Message[]>;
  sendMessage(conversationId: string, body: string): Promise<Message>;
  subscribeMessages(conversationId: string, cb: (m: Message) => void): () => void;

  blockUser(userId: string): Promise<void>;
  listBlocked(): Promise<ProfileSummary[]>;
  unblockUser(userId: string): Promise<void>;
  report(target: ReportTarget, targetId: string, reason: string): Promise<void>;

  listServiceRequests(): Promise<ServiceRequest[]>;
  createServiceRequest(input: ServiceRequestInput): Promise<ServiceRequest>;
  withdrawServiceRequest(id: string): Promise<void>;

  // Demo only: preview what a verified (Level 3) member can do.
  setDemoTrustLevel?(level: 1 | 2 | 3): Promise<void>;
}

export class ApiError extends Error {
  constructor(message: string, public code: 'not_allowed' | 'blocked' | 'invalid' | 'network' | 'rate_limited' | 'unknown' = 'unknown') {
    super(message);
  }
}
