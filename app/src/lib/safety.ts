// Pure safety helpers: no network, no device APIs, fully unit-tested.

// Main public emergency number by country (ISO alpha-2). 112 works across the EU
// and on most mobile networks worldwide, so it is the fallback.
const EMERGENCY_NUMBERS: Record<string, string> = {
  IE: '112',
  GB: '999',
  IN: '112',
  US: '911',
  CA: '911',
  AU: '000',
  NZ: '111',
  DE: '112',
  FR: '112',
  NL: '112',
  ES: '112',
  IT: '112',
  BE: '112',
  SE: '112',
  PT: '112',
};

export function emergencyNumber(country: string | null | undefined): string {
  if (!country) return '112';
  return EMERGENCY_NUMBERS[country.toUpperCase()] ?? '112';
}

export type WarningKind = 'money' | 'otp' | 'off_app' | 'link';

export interface Warning {
  kind: WarningKind;
  text: string;
}

const WARNING_TEXT: Record<WarningKind, string> = {
  money: 'This message mentions sending money or bank details. Never pay someone you have not met, and never pay in advance for rooms or jobs.',
  otp: 'This message mentions a code. Never share one-time codes, PINs or passwords, even with someone who says they are from a bank or the app.',
  off_app: 'This message asks to move to another app or phone number. Scammers do this to avoid our safety checks.',
  link: 'This message contains a link. Only open links from people you trust, and never sign in through a link sent in chat.',
};

const PATTERNS: Record<WarningKind, RegExp[]> = {
  money: [
    /\b(send|transfer|wire|pay|deposit|advance|lend|loan)\b[^.!?\n]{0,40}\b(money|cash|euros?|pounds?|rupees?|rs\.?|inr|gbp|eur|usd|amount|fee|deposit)\b/i,
    /\b(upi|paytm|gpay|google pay|phonepe|western union|moneygram|gift ?cards?|crypto|bitcoin|usdt|iban|sort code|account number|bank details)\b/i,
    /[€£₹$]\s?\d/,
  ],
  otp: [/\b(otp|one[- ]time (pass)?code|verification code|security code|pin)\b/i],
  off_app: [
    /\b(whats ?app|telegram|signal|wechat|viber|imo)\b/i,
    /\b(call|text|message|ping|dm)\s+me\s+(on|at)\b/i,
    /(\+|00)\d[\d\s-]{7,}\d/,
  ],
  link: [/\bhttps?:\/\/\S+/i, /\bwww\.\S+\.\S+/i, /\b(bit\.ly|tinyurl\.com|t\.me)\/\S+/i],
};

// Returns each kind of warning at most once, in a fixed order.
export function scamWarnings(text: string): Warning[] {
  if (!text) return [];
  const found: Warning[] = [];
  (Object.keys(PATTERNS) as WarningKind[]).forEach((kind) => {
    if (PATTERNS[kind].some((re) => re.test(text))) found.push({ kind, text: WARNING_TEXT[kind] });
  });
  return found;
}

export interface Coords {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
}

export function mapsLink(c: Coords): string {
  const lat = c.latitude.toFixed(5);
  const lng = c.longitude.toFixed(5);
  return `https://maps.google.com/?q=${lat},${lng}`;
}

function clock(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function sosMessage(opts: { name: string; coords: Coords | null; at: Date; emergencyNo: string; calledEmergency: boolean }): string {
  const lines = [`SOS from ${opts.name}. I need help.`];
  if (opts.coords) {
    const acc = opts.coords.accuracy ? ` (accurate to about ${Math.round(opts.coords.accuracy)} m)` : '';
    lines.push(`My location at ${clock(opts.at)}: ${mapsLink(opts.coords)}${acc}`);
  } else {
    lines.push(`I couldn't share my location. Please call me.`);
  }
  lines.push(opts.calledEmergency ? `I have called ${opts.emergencyNo}.` : `If you can't reach me, call ${opts.emergencyNo} for me.`);
  return lines.join('\n');
}

export function imSafeMessage(opts: { name: string; at: Date; note?: string }): string {
  const base = `I'm safe. ${opts.name}, ${clock(opts.at)}.`;
  const note = opts.note?.trim();
  return note ? `${base} ${note}` : base;
}

// Keeps a leading + and digits only. Returns '' if fewer than 8 digits.
export function normalisePhone(raw: string): string {
  const trimmed = raw.trim();
  const plus = trimmed.startsWith('+') || trimmed.startsWith('00');
  const digits = trimmed.replace(/^00/, '').replace(/\D/g, '');
  if (digits.length < 8) return '';
  return plus ? `+${digits}` : digits;
}

export function whatsappLink(phone: string, text: string): string {
  const digits = normalisePhone(phone).replace('+', '');
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

// iOS uses `&body=`, Android and others use `?body=`.
export function smsLink(phones: string[], text: string, os: 'ios' | 'android' | 'web' | string): string {
  const to = phones.map(normalisePhone).filter(Boolean).join(',');
  const sep = os === 'ios' ? '&' : '?';
  return `sms:${to}${sep}body=${encodeURIComponent(text)}`;
}

export function telLink(number: string): string {
  return `tel:${number.replace(/[^\d+]/g, '')}`;
}
