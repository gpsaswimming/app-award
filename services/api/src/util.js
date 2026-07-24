export function escapeHtml(s) {
  return String(s ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function countWords(text) {
  const t = String(text ?? '').trim();
  return t ? t.split(/\s+/).length : 0;
}

// Timestamp submission ID, e.g. "hurdle-20260727-1432", in league-local time.
// Stateless — no counter, so no shared state is required.
export function makeSubmissionId(awardId, date = new Date(), timeZone = 'America/New_York') {
  const p = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(date).reduce((acc, part) => ((acc[part.type] = part.value), acc), {});
  // en-CA renders midnight as "24"; normalise to "00".
  const hour = p.hour === '24' ? '00' : p.hour;
  return `${awardId}-${p.year}${p.month}${p.day}-${hour}${p.minute}`;
}
