// The public legal pages are built from docs/legal. These tests stop the pages,
// the sources and the app's version number drifting apart.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { TERMS_VERSION } from '../../config';
import { legalUrl } from '../legalLinks';

const appDir = join(__dirname, '..', '..', '..');
const docs = ['privacy', 'community-rules', 'terms-of-use'] as const;

describe('legal documents', () => {
  it('built pages match their markdown sources', () => {
    expect(() => execFileSync('node', ['scripts/legal.mjs', '--check'], { cwd: appDir, stdio: 'pipe' })).not.toThrow();
  });

  it.each(docs)('%s carries the version the app asks members to accept', (name) => {
    const md = readFileSync(join(appDir, '..', 'docs', 'legal', `${name}.md`), 'utf8');
    expect(md).toContain(`Version ${TERMS_VERSION}`);
  });

  it('covers the things the rules promise', () => {
    const rules = readFileSync(join(appDir, '..', 'docs', 'legal', 'community-rules.md'), 'utf8').toLowerCase();
    for (const word of ['scams, fraud and phishing', 'obscene', 'harassment', 'report', 'not an emergency service']) expect(rules).toContain(word);
    const privacy = readFileSync(join(appDir, '..', 'docs', 'legal', 'privacy.md'), 'utf8').toLowerCase();
    for (const word of ['never sell', 'trusted contacts', 'delete', 'data protection commission', 'information commissioner']) expect(privacy).toContain(word);
  });

  it('links to pages that exist', () => {
    expect(legalUrl('privacy')).toMatch(/\/privacy\.html$/);
    for (const name of docs) expect(readFileSync(join(appDir, 'public', `${name}.html`), 'utf8')).toContain('<title>');
  });
});
