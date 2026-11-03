// Data that never leaves the phone: trusted contacts and the emergency card.
// It is not sent to our servers, so a breach of the database can't expose it.
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface TrustedContact {
  id: string;
  name: string;
  phone: string; // with country code, e.g. +91 98xxxxxxx
  relation: string;
  isFamily: boolean; // gets "I'm safe" check-ins
}

export interface EmergencyCard {
  bloodGroup: string;
  allergies: string;
  medications: string;
  conditions: string;
  insurance: string;
  notes: string;
}

const KEYS = { contacts: 'device.trustedContacts.v1', card: 'device.emergencyCard.v1' };

export const emptyCard: EmergencyCard = { bloodGroup: '', allergies: '', medications: '', conditions: '', insurance: '', notes: '' };

async function read<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}

export async function loadContacts(): Promise<TrustedContact[]> {
  try {
    const raw = await AsyncStorage.getItem(KEYS.contacts);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export async function saveContacts(list: TrustedContact[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.contacts, JSON.stringify(list.slice(0, 5)));
}

export const loadCard = () => read<EmergencyCard>(KEYS.card, emptyCard);
export const saveCard = (card: EmergencyCard) => AsyncStorage.setItem(KEYS.card, JSON.stringify(card));

export async function clearDeviceData(): Promise<void> {
  await AsyncStorage.multiRemove([KEYS.contacts, KEYS.card]);
}
