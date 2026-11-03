import { describe, expect, it } from 'vitest';
import { GUIDES, guideForCity, guidesFor } from '../../content/guides';
import { LAUNCH_CITIES } from '../../config';

describe('newcomer guides', () => {
  it('has a guide for every launch city', () => {
    for (const { city } of LAUNCH_CITIES) expect(guideForCity(city), city).toBeDefined();
  });

  it('shows the member\'s own guide first', () => {
    expect(guidesFor('London')[0].id).toBe('uk');
    expect(guidesFor('Dublin')[0].id).toBe('ireland');
    expect(guidesFor(undefined)).toHaveLength(GUIDES.length);
  });

  it('gives every topic an order, steps and an official link', () => {
    for (const g of GUIDES) {
      expect(g.emergency.length).toBeGreaterThan(10);
      expect(g.topics.length).toBeGreaterThanOrEqual(5);
      const ids = g.topics.map((t) => t.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const t of g.topics) {
        expect(t.intro.length, `${g.id}/${t.id} intro`).toBeGreaterThan(20);
        expect(t.steps.length, `${g.id}/${t.id} steps`).toBeGreaterThan(0);
        expect(t.links.length, `${g.id}/${t.id} links`).toBeGreaterThan(0);
        // At least one tip or contact detail so a tile is more than a link.
        expect((t.tips?.length ?? 0) + (t.contact?.length ?? 0) + (t.bring?.length ?? 0), `${g.id}/${t.id} practical detail`).toBeGreaterThan(0);
      }
    }
  });

  it('only links to https pages and email addresses', () => {
    for (const g of GUIDES) for (const t of g.topics) for (const l of t.links) {
      expect(l.url, `${g.id}/${t.id}`).toMatch(/^(https:\/\/[^\s]+|mailto:[^\s@]+@[^\s@]+\.[a-z]+)$/);
      expect(l.label.length).toBeGreaterThan(2);
    }
  });

  it('keeps the first steps in the order members asked for', () => {
    const ie = GUIDES.find((g) => g.id === 'ireland')!.topics.map((t) => t.id);
    expect(ie.slice(0, 4)).toEqual(['getting-around', 'immigration', 'pps-number', 'tax']);
    expect(ie.indexOf('gp-and-insurance')).toBeLessThan(ie.indexOf('out-of-hours'));
    expect(ie[ie.length - 1]).toBe('indian-consular-help');
    const uk = GUIDES.find((g) => g.id === 'uk')!.topics.map((t) => t.id);
    expect(uk[0]).toBe('getting-around');
    expect(uk[uk.length - 1]).toBe('indian-consular-help');
  });

  it('lists the embassy email addresses for Dublin', () => {
    const t = GUIDES.find((g) => g.id === 'ireland')!.topics.find((x) => x.id === 'indian-consular-help')!;
    const mails = t.links.filter((l) => l.url.startsWith('mailto:')).map((l) => l.url);
    expect(mails).toContain('mailto:passport.dublin@mea.gov.in');
    expect(mails).toContain('mailto:cons.dublin@mea.gov.in');
  });
});
