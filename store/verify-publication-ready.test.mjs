import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { collectPublicationBlockers } from './verify-publication-ready.mjs';

const current = JSON.parse(await readFile(new URL('./publisher.json', import.meta.url), 'utf8'));
const reviewedFixture = () => ({
  ...structuredClone(current),
  publisherName: 'Test publisher',
  supportEmail: 'support@example.org',
  privacyPolicyUrl: 'https://example.org/privacy',
  applicationIdConfirmed: true,
  googlePlayAccountType: 'organization',
  googlePlayAccountReady: true,
  bazaarAccountReady: true,
  readiness: Object.fromEntries(Object.keys(current.readiness).map((key) => [key, true])),
});

test('an unconfigured publication record remains blocked', () => {
  const settings = { ...reviewedFixture(), publisherName: null, supportEmail: null, privacyPolicyUrl: null, readiness: {} };
  assert.ok(collectPublicationBlockers(settings).length > 0);
});

test('complete review records can pass without changing real publisher settings', () => {
  assert.deepEqual(collectPublicationBlockers(reviewedFixture()), []);
});

test('deleting a required review cannot silently bypass it', () => {
  const settings = reviewedFixture();
  delete settings.readiness.releaseAssetLicensesCleared;
  assert.ok(collectPublicationBlockers(settings).some((message) => message.includes('releaseAssetLicensesCleared')));
  delete settings.readiness;
  assert.equal(collectPublicationBlockers(settings).filter((message) => message.startsWith('Pending review:')).length, 8);
});

test('private or credential-bearing policy links and ambiguous personal-account dates stay blocked', () => {
  const settings = reviewedFixture();
  for (const url of ['http://example.org/privacy', 'https://localhost/privacy', 'https://user:pass@example.org/privacy']) {
    settings.privacyPolicyUrl = url;
    assert.ok(collectPublicationBlockers(settings).some((message) => message.includes('privacy-policy URL')));
  }
  settings.privacyPolicyUrl = 'https://example.org/privacy';
  settings.googlePlayAccountType = 'personal';
  assert.ok(collectPublicationBlockers(settings).some((message) => message.includes('creation-date')));
  settings.googlePlayPersonalAccountCreatedAfter2023_11_13 = false;
  assert.deepEqual(collectPublicationBlockers(settings), []);
});
