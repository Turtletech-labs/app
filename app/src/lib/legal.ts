import { Linking } from 'react-native';
import { legalUrl, type LegalPage } from './legalLinks';

export { LEGAL_TITLES, legalUrl, type LegalPage } from './legalLinks';

export const openLegal = (page: LegalPage): Promise<void> => Linking.openURL(legalUrl(page));
