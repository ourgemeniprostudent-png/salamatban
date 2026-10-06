import { getAuthenticatedUser } from '../app/chatgpt-auth';

export async function getClinicalReviewer() {
  const user = await getAuthenticatedUser();
  if (!user) return null;
  if (process.env.NODE_ENV !== 'production' || process.env.NEXT_PUBLIC_OPEN_TEST_MODE === 'true') return user;
  const allowed = new Set((process.env.CLINICAL_REVIEWER_IDS ?? '').split(',').map((value) => value.trim()).filter(Boolean));
  return allowed.has(user.userId) ? user : null;
}
