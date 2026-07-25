// Award definitions — the single source of truth for form fields, essay word
// bands, default prompts, and (critically) the blinding rule per award.
// See docs/DESIGN.md §3 (schemas) and §4 (blinding matrix).

// Canonical GPSA teams for the "Pool represented" select (2026 divisions, 18
// teams). Deploy-time configurable — see docs/DESIGN.md §10.
export const TEAMS = [
  'Beaconsdale', 'Colony', 'Coventry', 'Elizabeth Lake', 'Glendale',
  'Hidenwood', 'James River', 'Kiln Creek', 'Marlbank', 'Poquoson',
  'Riverdale', 'Running Man', 'Village Green', 'Warwick Yacht', 'Wendwood',
  'Willow Oaks', 'Windy Point', 'Wythe',
];

// US state / territory codes for the applicant address `state` select. Values
// are the 2-letter codes stored in the submission; the form shows full names.
export const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'DC', 'FL', 'GA', 'HI', 'ID',
  'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO',
  'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA',
  'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
];

export const AWARDS = {
  hurdle: {
    id: 'hurdle',
    label: 'J. Kyle Hurdle Scholarship',
    kind: 'scholarship',
    essay: { min: 300, max: 700 },
    defaultPrompt:
      'What positive impact has summer swimming had on your life? How do you intend to pay this forward?',
    // Blinding: the forwarded PDF contains the ESSAY ONLY — identity fields
    // never enter the PDF code path.
    pdfIncludesFields: false,
    fields: [
      { key: 'applicantName', label: 'Name of applicant', type: 'text', required: true },
      { key: 'streetAddress', label: 'Street address', type: 'text', required: true },
      { key: 'addressLine2', label: 'Apt / suite / unit', type: 'text', required: false },
      { key: 'city', label: 'City', type: 'text', required: true },
      { key: 'state', label: 'State', type: 'select', required: true, options: US_STATES },
      { key: 'zip', label: 'ZIP code', type: 'text', required: true, pattern: '^\\d{5}(-\\d{4})?$' },
      { key: 'telephone', label: 'Telephone', type: 'tel', required: true },
      { key: 'email', label: 'Email', type: 'email', required: true },
      { key: 'dateOfBirth', label: 'Date of birth', type: 'date', required: true },
      { key: 'pool', label: 'Pool represented', type: 'select', required: true, options: TEAMS },
      { key: 'yearsInGPSA', label: 'Years in GPSA', type: 'number', required: true },
      { key: 'favoriteStroke', label: 'Favorite stroke', type: 'text', required: false },
      { key: 'schoolToAttend', label: 'University / college / school to attend', type: 'text', required: true },
      { key: 'alreadyAccepted', label: 'Already accepted?', type: 'radio', required: true, options: ['Yes', 'No'] },
      { key: 'intendedMajor', label: 'Intended major', type: 'text', required: false },
    ],
  },
  lamberson: {
    id: 'lamberson',
    label: 'Kei Lamberson Outstanding Coach Award',
    kind: 'coach-award',
    essay: { min: 250, max: 750 },
    defaultPrompt:
      'How has your coach demonstrated joy, compassion and companionship in connecting with all swimmers on your team this summer?',
    // No blinding: the forwarded PDF contains the full submission.
    pdfIncludesFields: true,
    fields: [
      { key: 'coachName', label: 'Name of nominated coach', type: 'text', required: true },
      { key: 'pool', label: 'Pool represented', type: 'select', required: true, options: TEAMS },
      { key: 'essayWriterName', label: 'Name of essay writer', type: 'text', required: true },
      { key: 'relationshipToCoach', label: 'Relationship to coach', type: 'text', required: true },
      { key: 'telephone', label: 'Telephone (of essay writer)', type: 'tel', required: true },
      { key: 'email', label: 'Email (of essay writer)', type: 'email', required: true },
    ],
  },
};

export const AWARD_IDS = Object.keys(AWARDS);
