// This gate checks review records. It does not certify legal or store compliance.
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const requiredReviews = [
  'publisherIdentityConfirmed',
  'privacyPolicyPubliclyHostedAndReviewed',
  'finalBinaryDataPracticesReviewed',
  'releaseAssetLicensesCleared',
  'releaseSigningOwnershipConfirmed',
  'googlePlayTestingRequirementSatisfiedOrNotApplicable',
  'storeListingsAndScreenshotsApproved',
  'finalUploadAuthorized',
];

export function collectPublicationBlockers(settings) {
  const blockers = [];
  if (typeof settings.publisherName !== 'string' || !settings.publisherName.trim()) blockers.push('Publisher name has not been confirmed.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(settings.supportEmail || '')) blockers.push('A public support email is required.');
  try {
    const policy = new URL(settings.privacyPolicyUrl);
    if (policy.protocol !== 'https:' || policy.username || policy.password || ['localhost', '127.0.0.1', '[::1]'].includes(policy.hostname)) throw new Error();
  } catch { blockers.push('A reviewed, public HTTPS privacy-policy URL is required.'); }
  if (!/^[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*){2,}$/.test(settings.applicationId || '') || settings.applicationIdConfirmed !== true) blockers.push('The permanent Android applicationId has not been confirmed.');
  if (!['personal', 'organization'].includes(settings.googlePlayAccountType)) blockers.push('The Google Play account type has not been recorded.');
  if (settings.googlePlayAccountType === 'personal' && typeof settings.googlePlayPersonalAccountCreatedAfter2023_11_13 !== 'boolean') blockers.push('The personal account creation-date category must be recorded to determine testing requirements.');
  if (settings.googlePlayAccountReady !== true) blockers.push('The Google Play developer account is not confirmed ready.');
  if (settings.bazaarAccountReady !== true) blockers.push('The Cafe Bazaar developer account is not confirmed ready.');
  for (const key of requiredReviews) {
    if (settings.readiness?.[key] !== true) blockers.push(`Pending review: ${key}`);
  }
  return blockers;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const settings = JSON.parse(await readFile(new URL('./publisher.json', import.meta.url), 'utf8'));
  const blockers = collectPublicationBlockers(settings);
  if (blockers.length) {
    console.error('PUBLICATION BLOCKED\n' + blockers.map((message) => `- ${message}`).join('\n'));
    process.exitCode = 1;
  } else {
    console.log('Recorded publication prerequisites are complete. Recheck the final binary and live store forms before submitting.');
  }
}
