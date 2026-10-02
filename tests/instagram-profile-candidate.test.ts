import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isInstagramProfileStatus,
  mapInstagramHashtagMedia,
  normalizeInstagramHashtag,
  normalizeInstagramProfile,
} from '../lib/instagramProfileCandidate';

test('normalizes Instagram handles and profile URLs', () => {
  assert.deepEqual(normalizeInstagramProfile(' @Minha.Pagina_1 '), {
    username: 'minha.pagina_1',
    profileUrl: 'https://www.instagram.com/minha.pagina_1/',
  });
  assert.deepEqual(normalizeInstagramProfile('https://instagram.com/Minha.Pagina_1/?igsh=tracking'), {
    username: 'minha.pagina_1',
    profileUrl: 'https://www.instagram.com/minha.pagina_1/',
  });
});

test('rejects non-profile and non-Instagram URLs', () => {
  assert.equal(normalizeInstagramProfile('https://example.com/person'), null);
  assert.equal(normalizeInstagramProfile('https://instagram.com/explore/'), null);
  assert.equal(normalizeInstagramProfile('two words'), null);
  assert.equal(normalizeInstagramProfile('@invalid-handle'), null);
});

test('accepts only supported review statuses', () => {
  assert.equal(isInstagramProfileStatus('PENDING_REVIEW'), true);
  assert.equal(isInstagramProfileStatus('FOLLOWED_MANUALLY'), true);
  assert.equal(isInstagramProfileStatus('FOLLOWED_AUTOMATICALLY'), false);
});

test('normalizes hashtag input and rejects invalid hashtag syntax', () => {
  assert.equal(normalizeInstagramHashtag(' #Moda_Feminina '), 'moda_feminina');
  assert.equal(normalizeInstagramHashtag('ação2026'), 'ação2026');
  assert.equal(normalizeInstagramHashtag('hashtag com espaço'), null);
  assert.equal(normalizeInstagramHashtag('a'.repeat(31)), null);
});

test('maps unique profile authors from official hashtag media and validates source links', () => {
  const profiles = mapInstagramHashtagMedia([
    { username: 'Creator.One', permalink: 'https://www.instagram.com/p/ABC123/', timestamp: '2026-10-01T12:00:00+0000' },
    { username: 'creator.one', permalink: 'https://www.instagram.com/reel/DEF456/' },
    { username: 'other_creator', permalink: 'https://example.com/fake' },
    { username: 'explore', permalink: 'https://www.instagram.com/p/XYZ789/' },
    { permalink: 'https://www.instagram.com/p/NONAME/' },
  ]);

  assert.deepEqual(profiles, [
    {
      username: 'creator.one',
      profileUrl: 'https://www.instagram.com/creator.one/',
      sourceUrl: 'https://www.instagram.com/p/ABC123/',
      timestamp: '2026-10-01T12:00:00+0000',
    },
    {
      username: 'other_creator',
      profileUrl: 'https://www.instagram.com/other_creator/',
      sourceUrl: undefined,
      timestamp: undefined,
    },
  ]);
});