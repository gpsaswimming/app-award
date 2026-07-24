const SITEVERIFY = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

// Verify a Cloudflare Turnstile token. Returns true only on a confirmed pass;
// any error is treated as failure (fail-closed for the bot gate).
export async function verifyTurnstile(secret, token, remoteip) {
  if (!token) return false;
  const body = new URLSearchParams({ secret, response: token });
  if (remoteip) body.set('remoteip', remoteip);
  try {
    const res = await fetch(SITEVERIFY, { method: 'POST', body });
    const data = await res.json();
    return data?.success === true;
  } catch {
    return false;
  }
}
