import PDFDocument from 'pdfkit';
import { AWARDS } from './constants.js';

const NAVY = '#002366';
const MUTED = '#555555';

// The identity fields that go into the PDF. Blinding is enforced here by
// construction: a blinded award (Hurdle, `pdfIncludesFields === false`) returns
// an empty list, so the applicant's identity can never reach the page — only
// the essay does. See docs/DESIGN.md §4. Pure + exported so it can be tested
// directly without scanning rendered PDF bytes.
export function pdfBodyFields(awardId, data = {}) {
  const award = AWARDS[awardId];
  if (!award || !award.pdfIncludesFields) return [];
  return award.fields
    .filter((f) => data[f.key])
    .map((f) => ({ label: f.label, value: data[f.key] }));
}

// Render the forward-ready PDF for a submission.
export function renderPdf({ awardId, submissionId, data, words, season, compress = true }) {
  const award = AWARDS[awardId];
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'LETTER', margin: 72, compress });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fillColor(NAVY).fontSize(18).font('Helvetica-Bold')
      .text(award.label, { align: 'center' });
    doc.moveDown(0.3);
    doc.fillColor(MUTED).fontSize(10).font('Helvetica')
      .text(`${season} · Submission ${submissionId}`, { align: 'center' });
    doc.moveDown(1.2);
    doc.fillColor('#000000');

    const bodyFields = pdfBodyFields(awardId, data);
    if (bodyFields.length) {
      doc.fontSize(11);
      for (const { label, value } of bodyFields) {
        doc.font('Helvetica-Bold').text(`${label}: `, { continued: true })
          .font('Helvetica').text(value);
      }
      doc.moveDown(1);
    }

    doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(12).text('Essay');
    doc.fillColor('#000000').font('Helvetica').fontSize(11);
    doc.moveDown(0.5);
    doc.text(data.essay, { align: 'left', lineGap: 2 });
    doc.moveDown(1);
    doc.fillColor(MUTED).fontSize(9).text(`Word count: ${words}`);

    doc.end();
  });
}
