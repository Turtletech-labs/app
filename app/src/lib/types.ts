// Trust levels: 1 = email, 2 = work or university email (or two vouches),
// 3 = government ID check. See docs/trust-levels.md.
export type TrustLevel = 1 | 2 | 3;

export type PostType = 'notice' | 'question' | 'job' | 'event';

export interface ProfileSummary {
  id: string;
  displayName: string;
  city: string;
  trustLevel: TrustLevel;
  isExpert: boolean;
}

export interface Profile extends ProfileSummary {
  country: string; // ISO 3166-1 alpha-2, e.g. IE, GB
  profession: string;
  almaMater: string;
  homeState: string;
  bio: string;
  createdAt: string;
}

export type ProfileInput = Pick<Profile, 'displayName' | 'city' | 'country' | 'profession' | 'almaMater' | 'homeState' | 'bio'>;

export type CircleKind = 'city' | 'profession' | 'alma_mater' | 'home_state' | 'language' | 'life_stage';

export interface Circle {
  id: string;
  name: string;
  kind: CircleKind;
  city: string | null;
  memberCount: number;
}

export interface NoticeDetails { category: 'lost_found' | 'blood' | 'ride' | 'alert' | 'housing' | 'general' }
export interface QuestionDetails { topic: 'visa' | 'tax' | 'health' | 'parenting' | 'work' | 'other' }
export interface JobDetails { kind: 'opening' | 'referral'; company: string; location: string; link: string }
export interface EventDetails { startsAt: string; venue: string; capacity: number | null }

export type PostDetails = NoticeDetails | QuestionDetails | JobDetails | EventDetails;

export interface Post {
  id: string;
  circleId: string;
  circleName: string;
  type: PostType;
  title: string;
  body: string;
  details: PostDetails;
  author: ProfileSummary;
  createdAt: string;
  expiresAt: string | null;
  replyCount: number;
  rsvpCount: number;
  myRsvp: boolean;
}

export interface PostInput {
  circleId: string;
  type: PostType;
  title: string;
  body: string;
  details: PostDetails;
  expiresAt: string | null;
}

export interface Reply {
  id: string;
  postId: string;
  author: ProfileSummary;
  body: string;
  createdAt: string;
}

export interface ChatRequest {
  id: string;
  from: ProfileSummary;
  to: ProfileSummary;
  note: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt: string;
}

export interface Conversation {
  id: string;
  other: ProfileSummary;
  lastMessage: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: string;
}

export type ReportTarget = 'post' | 'reply' | 'message' | 'profile';

export interface ServiceRequest {
  id: string;
  serviceId: string;
  tier: 'basic' | 'essential' | 'emergency';
  forWhom: 'me' | 'parent' | 'family';
  location: string;
  timing: string;
  details: string;
  contactMethod: 'chat' | 'phone';
  phone: string;
  status: 'received' | 'in_progress' | 'done' | 'declined';
  createdAt: string;
}

export type ServiceRequestInput = Omit<ServiceRequest, 'id' | 'status' | 'createdAt'>;

// What each trust level unlocks. The database enforces the same rules.
export const REQUIRED_LEVEL: Record<PostType, TrustLevel> = {
  notice: 2,
  question: 2,
  job: 3,
  event: 3,
};
export const LEVEL_TO_MESSAGE: TrustLevel = 2;
export const LEVEL_TO_REPLY: TrustLevel = 2;
