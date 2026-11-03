// The four membership tiers and the services members can request.
// During the pilot every service is requested through the app and fulfilled
// by hand by a relationship manager with licensed partners. No prices are
// shown until they are approved; members are told the cost before anything is
// booked.

export type TierId = 'free' | 'basic' | 'essential' | 'emergency';

export interface Tier {
  id: TierId;
  name: string;
  tagline: string;
  forWhom: string;
  highlights: string[];
  status: string; // what's available now
}

export const TIERS: Tier[] = [
  {
    id: 'free',
    name: 'Free',
    tagline: 'Verified membership',
    forWhom: 'Anyone of Indian origin abroad',
    highlights: [
      'Circles by city, profession, college and home state',
      'Notice board, expert answers, jobs and events',
      'SOS, emergency card and "I\'m safe" check-ins',
      'Newcomer guides',
    ],
    status: 'Your plan',
  },
  {
    id: 'basic',
    name: 'Basic',
    tagline: 'Landing and social life',
    forWhom: 'Newcomers in their first year, and anyone looking for community',
    highlights: [
      'Help with bank account, SIM, doctor registration and local ID',
      'A verified buddy for a first meet-up in a public place',
      'Licensed airport transfers and verified rooms',
      'Healthcare navigator for your first doctor visit',
      'Priority places at welcome events and member perks',
    ],
    status: 'Free to request during the pilot',
  },
  {
    id: 'essential',
    name: 'Essential',
    tagline: 'Family office',
    forWhom: 'Established families abroad and their parents in India',
    highlights: [
      'A dedicated relationship manager on WhatsApp',
      'Care-manager visits, health checks and accompanied doctor visits for parents',
      'Property in India: inspections, tenants, rent and paperwork',
      'Two-country tax, wills and power of attorney through regulated partners',
      'India trips, weddings and admissions counselling planned end to end',
    ],
    status: 'Founding-circle pilot',
  },
  {
    id: 'emergency',
    name: 'Emergency',
    tagline: 'Always-on cover',
    forWhom: 'Members and their families, abroad and in India',
    highlights: [
      'Rush home when a parent falls ill: flights, visa or OCI help, someone at the hospital before you land',
      'Hospital admission and a bedside attendant in India',
      'Emergency passport or OCI help and legal support',
      'Bereavement support and repatriation',
    ],
    status: 'Founding-circle pilot',
  },
];

export type ServiceGroupId = 'settling' | 'parents' | 'property' | 'money' | 'occasions' | 'urgent';

export interface Service {
  id: string;
  group: ServiceGroupId;
  tier: Exclude<TierId, 'free'>;
  title: string;
  summary: string;
  forWhomDefault: 'me' | 'parent' | 'family';
  urgent?: boolean;
  partnerNote?: string;
}

export const SERVICE_GROUPS: { id: ServiceGroupId; title: string; body: string }[] = [
  { id: 'urgent', title: 'Urgent help', body: 'When something goes wrong at either end of the family.' },
  { id: 'settling', title: 'Settling in', body: 'Your first months in a new city.' },
  { id: 'parents', title: 'Parents in India', body: 'Care and company for parents back home.' },
  { id: 'property', title: 'Property and paperwork in India', body: 'Someone accountable on the ground.' },
  { id: 'money', title: 'Money, tax and legal', body: 'Through regulated partners only.' },
  { id: 'occasions', title: 'Family and occasions', body: 'Planned end to end.' },
];

export const SERVICES: Service[] = [
  { id: 'rush-home', group: 'urgent', tier: 'emergency', urgent: true, forWhomDefault: 'parent', title: 'Rush home: a parent is unwell',
    summary: 'Same-day flights, visa or OCI help, and someone at the hospital before you land.' },
  { id: 'hospital-india', group: 'urgent', tier: 'emergency', urgent: true, forWhomDefault: 'parent', title: 'Hospital admission in India',
    summary: 'Admission help, a deposit arrangement with partner hospitals and a bedside attendant.' },
  { id: 'lost-passport', group: 'urgent', tier: 'emergency', urgent: true, forWhomDefault: 'me', title: 'Lost passport or OCI card',
    summary: 'Step-by-step help with the police report, the High Commission or Embassy and travel plans.' },
  { id: 'bereavement', group: 'urgent', tier: 'emergency', urgent: true, forWhomDefault: 'family', title: 'Bereavement support',
    summary: 'Paperwork, repatriation and arrangements, handled with care.' },

  { id: 'first-steps', group: 'settling', tier: 'basic', forWhomDefault: 'me', title: 'First-week setup',
    summary: 'Bank account, SIM, doctor registration and local ID, in the right order.' },
  { id: 'buddy', group: 'settling', tier: 'basic', forWhomDefault: 'me', title: 'Meet a verified buddy',
    summary: 'An ID-verified member from your city for a first coffee in a public place.' },
  { id: 'airport', group: 'settling', tier: 'basic', forWhomDefault: 'me', title: 'Airport transfer',
    summary: 'A licensed transfer booked for your arrival, with the driver details shared in advance.' },
  { id: 'room', group: 'settling', tier: 'basic', forWhomDefault: 'me', title: 'Find a room or flatmate',
    summary: 'Shortlist from verified members and checked landlords. Never pay a deposit before a viewing.' },
  { id: 'gp-navigator', group: 'settling', tier: 'basic', forWhomDefault: 'me', title: 'Healthcare navigator',
    summary: 'Someone to explain the local system and help with your first doctor visit.' },

  { id: 'care-visit', group: 'parents', tier: 'essential', forWhomDefault: 'parent', title: 'Care-manager visit',
    summary: 'A trained care manager visits, checks in and reports back to you.' },
  { id: 'doctor-visit', group: 'parents', tier: 'essential', forWhomDefault: 'parent', title: 'Accompanied doctor visit',
    summary: 'Transport, a companion at the appointment and a written summary for you.' },
  { id: 'health-check', group: 'parents', tier: 'essential', forWhomDefault: 'parent', title: 'Executive health check',
    summary: 'Booked at a partner hospital, with results explained.' },
  { id: 'home-safety', group: 'parents', tier: 'essential', forWhomDefault: 'parent', title: 'Home safety check',
    summary: 'Falls, fire and security checked, with a list of fixes.' },

  { id: 'property-inspection', group: 'property', tier: 'essential', forWhomDefault: 'family', title: 'Property inspection',
    summary: 'Photos, condition report and a list of repairs.' },
  { id: 'tenant', group: 'property', tier: 'essential', forWhomDefault: 'family', title: 'Tenants and rent',
    summary: 'Finding tenants, agreements, rent collection and maintenance.' },
  { id: 'paperwork', group: 'property', tier: 'essential', forWhomDefault: 'family', title: 'Paperwork in India',
    summary: 'Property tax, mutation, utility transfers and similar errands, done and documented.' },

  { id: 'tax', group: 'money', tier: 'essential', forWhomDefault: 'me', title: 'Two-country tax',
    summary: 'An introduction to a chartered accountant who handles both countries.', partnerNote: 'Advice comes from the regulated partner, not from us.' },
  { id: 'will', group: 'money', tier: 'essential', forWhomDefault: 'family', title: 'Wills, succession and power of attorney',
    summary: 'Introductions to lawyers who work across India and your country.', partnerNote: 'Advice comes from the regulated partner, not from us.' },

  { id: 'admissions', group: 'occasions', tier: 'essential', forWhomDefault: 'family', title: 'School and university admissions',
    summary: 'Counselling for children, in India or abroad.' },
  { id: 'wedding', group: 'occasions', tier: 'essential', forWhomDefault: 'family', title: 'Wedding or India trip',
    summary: 'Venues, travel, guests and family logistics planned end to end.' },
];

export const FOR_WHOM_LABEL = { me: 'Me', parent: 'My parent in India', family: 'My family' } as const;
export const TIMING_OPTIONS = ['As soon as possible', 'This week', 'This month', 'Just exploring'] as const;
