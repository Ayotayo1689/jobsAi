const PDFDocument = require('pdfkit');

// Clean, neutral palette — no purple/indigo
const C = {
  name:    '#0d1117',   // very dark for candidate name
  dark:    '#1c2333',   // job titles, section headers
  body:    '#24292f',   // bullet text, summary, body
  mid:     '#444c56',   // company name, institution
  light:   '#656d76',   // dates, secondary info
  divider: '#d0d7de',   // thin rule under section headers
};

function generateResumePDF(data) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 52, bottom: 52, left: 58, right: 58 },
      autoFirstPage: true,
      info: {
        Title:   `${data.name || 'Resume'} – Resume`,
        Author:  data.name || 'Candidate',
        Subject: data.title || 'Professional Resume'
      }
    });

    const bufs = [];
    doc.on('data',  b   => bufs.push(b));
    doc.on('end',   ()  => resolve(Buffer.concat(bufs)));
    doc.on('error', err => reject(err));

    const W = doc.page.width  - doc.page.margins.left - doc.page.margins.right;
    const L = doc.page.margins.left;

    // ── HEADER ──────────────────────────────────────────────────────────────

    // Thin dark top rule (not coloured)
    doc.rect(0, 0, doc.page.width, 3).fill(C.dark);

    let y = doc.page.margins.top + 10;

    // Name
    doc.font('Helvetica-Bold').fontSize(26).fillColor(C.name)
       .text(data.name || 'Candidate', L, y, { width: W });
    y = doc.y + 2;

    // Professional title
    if (data.title) {
      doc.font('Helvetica').fontSize(11.5).fillColor(C.mid)
         .text(data.title, L, y, { width: W });
      y = doc.y + 2;
    }

    // Contact info — include portfolio/website
    const contacts = [
      data.email,
      data.phone,
      data.location,
      data.website  ? cleanUrl(data.website)  : null,
      data.portfolio? cleanUrl(data.portfolio) : null,
      data.linkedin ? cleanUrl(data.linkedin)  : null,
      data.github   ? cleanUrl(data.github)    : null
    ].filter(Boolean);

    if (contacts.length) {
      doc.font('Helvetica').fontSize(9.5).fillColor(C.light)
         .text(contacts.join('   ·   '), L, y + 4, { width: W, lineGap: 2 });
      y = doc.y + 4;
    }

    // Section divider line
    y += 6;
    doc.moveTo(L, y).lineTo(L + W, y)
       .strokeColor(C.dark).lineWidth(1).stroke();
    y += 12;

    // ── SUMMARY ─────────────────────────────────────────────────────────────
    if (data.summary) {
      y = sectionHeader(doc, 'PROFESSIONAL SUMMARY', L, y, W);
      doc.font('Helvetica').fontSize(10.5).fillColor(C.body)
         .text(data.summary, L, y, { width: W, lineGap: 3, align: 'justify' });
      y = doc.y + 14;
    }

    // ── SKILLS ──────────────────────────────────────────────────────────────
    if (data.skills?.length) {
      y = sectionHeader(doc, 'SKILLS', L, y, W);
      doc.font('Helvetica').fontSize(10.5).fillColor(C.body)
         .text(data.skills.join('   ·   '), L, y, { width: W, lineGap: 3 });
      y = doc.y + 14;
    }

    // ── EXPERIENCE ───────────────────────────────────────────────────────────
    if (data.experience?.length) {
      y = sectionHeader(doc, 'EXPERIENCE', L, y, W);

      for (const exp of data.experience) {
        // Title row: role on left, dates on right — same baseline
        const titleY = y;
        doc.font('Helvetica-Bold').fontSize(11).fillColor(C.dark)
           .text(exp.title || '', L, titleY, { width: W * 0.66, lineBreak: false });
        doc.font('Helvetica').fontSize(9.5).fillColor(C.light)
           .text(exp.duration || '', L, titleY, { width: W, align: 'right', lineBreak: false });
        y = titleY + doc.currentLineHeight(true) + 2;

        // Company + location — small margin top before it
        y += 4;
        const compLine = [exp.company, exp.location].filter(Boolean).join('   ·   ');
        doc.font('Helvetica-Oblique').fontSize(10).fillColor(C.mid)
           .text(compLine, L, y, { width: W });
        y = doc.y;

        // Bullets — gap before first bullet
        if (exp.bullets?.length) {
          y += 10;
          for (const bullet of exp.bullets) {
            doc.font('Helvetica').fontSize(10.5).fillColor(C.body)
               .text(`•   ${bullet}`, L + 14, y, { width: W - 14, lineGap: 3 });
            y = doc.y + 6;   // spacing between bullets
          }
        }

        y += 10;  // gap between job entries
      }
    }

    // ── EDUCATION ────────────────────────────────────────────────────────────
    if (data.education?.length) {
      y = sectionHeader(doc, 'EDUCATION', L, y, W);

      for (const edu of data.education) {
        const degY = y;
        doc.font('Helvetica-Bold').fontSize(11).fillColor(C.dark)
           .text(edu.degree || '', L, degY, { width: W * 0.72, lineBreak: false });
        doc.font('Helvetica').fontSize(9.5).fillColor(C.light)
           .text(edu.year || '', L, degY, { width: W, align: 'right', lineBreak: false });
        y = degY + doc.currentLineHeight(true) + 4;

        doc.font('Helvetica').fontSize(10).fillColor(C.mid)
           .text(edu.institution || '', L, y, { width: W });
        y = doc.y;

        if (edu.gpa) {
          y += 2;
          doc.font('Helvetica').fontSize(9.5).fillColor(C.light)
             .text(`GPA: ${edu.gpa}`, L, y, { width: W });
          y = doc.y;
        }
        y += 10;
      }
    }

    // ── CERTIFICATIONS ───────────────────────────────────────────────────────
    if (data.certifications?.length) {
      y = sectionHeader(doc, 'CERTIFICATIONS', L, y, W);

      for (const cert of data.certifications) {
        doc.font('Helvetica').fontSize(10.5).fillColor(C.body)
           .text(`•   ${cert}`, L + 14, y, { width: W - 14, lineGap: 3 });
        y = doc.y + 6;
      }
      y += 6;
    }

    // ── PROJECTS ─────────────────────────────────────────────────────────────
    if (data.projects?.length) {
      y = sectionHeader(doc, 'PROJECTS', L, y, W);

      for (const proj of data.projects) {
        doc.font('Helvetica-Bold').fontSize(11).fillColor(C.dark)
           .text(proj.name || '', L, y, { width: W });
        y = doc.y;

        if (proj.tech?.length) {
          y += 2;
          doc.font('Helvetica-Oblique').fontSize(9.5).fillColor(C.mid)
             .text(proj.tech.join(' · '), L, y, { width: W });
          y = doc.y;
        }

        if (proj.description) {
          y += 6;
          doc.font('Helvetica').fontSize(10.5).fillColor(C.body)
             .text(`•   ${proj.description}`, L + 14, y, { width: W - 14, lineGap: 3 });
          y = doc.y;
        }
        y += 10;
      }
    }

    doc.end();
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function sectionHeader(doc, title, L, y, W) {
  doc.font('Helvetica-Bold').fontSize(9.5).fillColor(C.dark)
     .text(title, L, y, { width: W, characterSpacing: 1 });
  const lineY = doc.y + 2;
  doc.moveTo(L, lineY).lineTo(L + W, lineY)
     .strokeColor(C.divider).lineWidth(0.5).stroke();
  return lineY + 8;
}

function cleanUrl(url) {
  return (url || '').replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
}

module.exports = { generateResumePDF };
