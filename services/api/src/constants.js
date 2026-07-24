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
      { key: 'addressLine1', label: 'Address', type: 'text', required: true },
      { key: 'addressLine2', label: 'Address (line 2)', type: 'text', required: false },
      { key: 'telephone', label: 'Telephone', type: 'tel', required: true },
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
    ],
  },
};

export const AWARD_IDS = Object.keys(AWARDS);
