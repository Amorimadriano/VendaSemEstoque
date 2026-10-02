import assert from 'node:assert/strict';
import test from 'node:test';
import { isInstagramProfileStatus, normalizeInstagramProfile } from '../lib/instagramProfileCandidate';

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