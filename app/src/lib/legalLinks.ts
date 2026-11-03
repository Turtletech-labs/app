import { SITE_URL } from '../config';

export type LegalPage = 'privacy' | 'community-rules' | 'terms-of-use';

export const LEGAL_TITLES: Record<LegalPage, string> = {
  'community-rules': 'Community rules',
  'terms-of-use': 'Terms of use',
  privacy: 'Privacy policy',
};

export const legalUrl = (page: LegalPage): string => `${SITE_URL}/${page}.html`;
