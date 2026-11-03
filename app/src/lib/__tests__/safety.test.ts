import { describe, expect, it } from 'vitest';
import { emergencyNumber, imSafeMessage, normalisePhone, scamWarnings, smsLink, sosMessage, telLink, whatsappLink } from '../safety';

describe('emergencyNumber', () => {
  it('uses the local number for launch countries', () => {
    expect(emergencyNumber('IE')).toBe('112');
    expect(emergencyNumber('GB')).toBe('999');
    expect(emergencyNumber('gb')).toBe('999');
  });
  it('falls back to 112', () => {
    expect(emergencyNumber('')).toBe('112');
    expect(emergencyNumber(null)).toBe('112');
    expect(emergencyNumber('ZZ')).toBe('112');
  });
});

describe('scamWarnings', () => {
  const kinds = (t: string) => scamWarnings(t).map((w) => w.kind);

  it('flags advance-payment requests', () => {
    expect(kinds('Please send the deposit money today')).toContain('money');
    expect(kinds('Pay €500 to hold the room')).toContain('money');
    expect(kinds('My UPI id is abc@okaxis')).toContain('money');
    expect(kinds('Can you buy gift cards for me?')).toContain('money');
  });
  it('flags code requests', () => {
    expect(kinds('Tell me the OTP you just got')).toContain('otp');
    expect(kinds('Share your verification code')).toContain('otp');
  });
  it('flags moves off the app', () => {
    expect(kinds('WhatsApp me instead')).toContain('off_app');
    expect(kinds('call me on +353 87 123 4567')).toContain('off_app');
  });
  it('flags links', () => {
    expect(kinds('see https://example.com/form')).toContain('link');
    expect(kinds('bit.ly/abc123')).toContain('link');
  });
  it('stays quiet on ordinary messages', () => {
    expect(scamWarnings('See you at the potluck on Saturday!')).toEqual([]);
    expect(scamWarnings('Which GP do you use in Rathmines?')).toEqual([]);
    expect(scamWarnings('')).toEqual([]);
  });
  it('reports each kind once', () => {
    expect(kinds('send money, transfer money, upi')).toEqual(['money']);
  });
});

describe('messages', () => {
  const at = new Date(2026, 10, 3, 21, 5);
  it('builds an SOS with location', () => {
    const m = sosMessage({ name: 'Asha', coords: { latitude: 53.3498053, longitude: -6.2603097, accuracy: 12.4 }, at, emergencyNo: '112', calledEmergency: true });
    expect(m).toContain('SOS from Asha');
    expect(m).toContain('https://maps.google.com/?q=53.34981,-6.26031');
    expect(m).toContain('about 12 m');
    expect(m).toContain('21:05');
    expect(m).toContain('I have called 112.');
  });
  it('builds an SOS without location', () => {
    const m = sosMessage({ name: 'Asha', coords: null, at, emergencyNo: '999', calledEmergency: false });
    expect(m).toContain("couldn't share my location");
    expect(m).toContain('call 999 for me');
  });
  it('builds an I am safe message', () => {
    expect(imSafeMessage({ name: 'Asha', at })).toBe("I'm safe. Asha, 21:05.");
    expect(imSafeMessage({ name: 'Asha', at, note: ' Home now ' })).toBe("I'm safe. Asha, 21:05. Home now");
  });
});

describe('phone links', () => {
  it('normalises numbers', () => {
    expect(normalisePhone('+91 98765 43210')).toBe('+919876543210');
    expect(normalisePhone('0091-98765-43210')).toBe('+919876543210');
    expect(normalisePhone('12345')).toBe('');
  });
  it('builds WhatsApp, SMS and tel links', () => {
    expect(whatsappLink('+353 87 123 4567', 'hi there')).toBe('https://wa.me/353871234567?text=hi%20there');
    expect(smsLink(['+44 7700 900123'], 'hi', 'ios')).toBe('sms:+447700900123&body=hi');
    expect(smsLink(['+44 7700 900123', '+91 98765 43210'], 'hi', 'android')).toBe('sms:+447700900123,+919876543210?body=hi');
    expect(telLink('999')).toBe('tel:999');
  });
});
