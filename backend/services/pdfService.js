const PDFDocument = require('pdfkit');

const C = {
  name:    '#0d1117',
  dark:    '#1c2333',
  body:    '#24292f',
  mid:     '#444c56',
  light:   '#656d76',
  divider: '#d0d7de',
};

// Returns the new y — adds a page if content won't fit
function pageBreakIfNeeded(doc, y, needed) {
  const bottom = doc.page.height - doc.page.margins.bottom;
  if (y + needed > bottom) {
    doc.addPage();
    return doc.page.margins.top;
  }
  return y;
}

// Draws a section header and returns the new y
function sectionHeader(doc, title, L, y, W) {
  doc.font('Helvetica-Bold').fontSize(9.5).fillColor(C.dark)
     .text(title, L, y, { width: W, characterSpacing: 1 });
  const lineY = doc.y + 2;
  doc.moveTo(L, lineY).lineTo(L + W, lineY)
     .strokeColor(C.divider).lineWidth(0.5).stroke();
  return lineY + 8;
}

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

    doc.rect(0, 0, doc.page.width, 3).fill(C.dark);

    let y = doc.page.margins.top + 10;

    doc.font('Helvetica-Bold').fontSize(26).fillColor(C.name)
       .text(data.name || 'Candidate', L, y, { width: W });
    y = doc.y + 2;

    if (data.title) {
      doc.font('Helvetica').fontSize(11.5).fillColor(C.mid)
         .text(data.title, L, y, { width: W });
      y = doc.y + 2;
    }

    const contacts = [
      data.email, data.phone, data.location,
      data.website   ? cleanUrl(data.website)   : null,
      data.portfolio ? cleanUrl(data.portfolio) : null,
      data.linkedin  ? cleanUrl(data.linkedin)  : null,
      data.github    ? cleanUrl(data.github)    : null,
    ].filter(Boolean);

    if (contacts.length) {
      doc.font('Helvetica').fontSize(9.5).fillColor(C.light)
         .text(contacts.join('   ·   '), L, y + 4, { width: W, lineGap: 2 });
      y = doc.y + 4;
    }

    y += 6;
    doc.moveTo(L, y).lineTo(L + W, y).strokeColor(C.dark).lineWidth(1).stroke();
    y += 12;

    // ── SUMMARY ─────────────────────────────────────────────────────────────
    if (data.summary) {
      y = pageBreakIfNeeded(doc, y, 60);
      y = sectionHeader(doc, 'PROFESSIONAL SUMMARY', L, y, W);
      doc.font('Helvetica').fontSize(10.5).fillColor(C.body)
         .text(data.summary, L, y, { width: W, lineGap: 3, align: 'justify' });
      y = doc.y + 14;
    }

    // ── SKILLS ──────────────────────────────────────────────────────────────
    if (data.skills?.length) {
      y = pageBreakIfNeeded(doc, y, 45);
      y = sectionHeader(doc, 'SKILLS', L, y, W);
      doc.font('Helvetica').fontSize(10.5).fillColor(C.body)
         .text(data.skills.join('   ·   '), L, y, { width: W, lineGap: 3 });
      y = doc.y + 14;
    }

    // ── EXPERIENCE ───────────────────────────────────────────────────────────
    if (data.experience?.length) {
      y = pageBreakIfNeeded(doc, y, 80);
      y = sectionHeader(doc, 'EXPERIENCE', L, y, W);

      for (const exp of data.experience) {
        y = pageBreakIfNeeded(doc, y, 55);

        // Measure font heights so title and date are baseline-aligned
        doc.font('Helvetica-Bold').fontSize(11);
        const titleH = doc.currentLineHeight(true);
        doc.font('Helvetica').fontSize(9.5);
        const dateH = doc.currentLineHeight(true);
        const dateOffset = Math.round((titleH - dateH) / 2);

        // Title (left) — no line break so doc.y doesn't advance
        doc.font('Helvetica-Bold').fontSize(11).fillColor(C.dark)
           .text(exp.title || '', L, y, { width: W * 0.65, lineBreak: false });

        // Duration (right) — vertically centered against title
        if (exp.duration) {
          doc.font('Helvetica').fontSize(9.5).fillColor(C.light)
             .text(exp.duration, L, y + dateOffset, { width: W, align: 'right', lineBreak: false });
        }

        // Advance past the title row
        y += titleH + 4;

        // Company · Location
        const compLine = [exp.company, exp.location].filter(Boolean).join('   ·   ');
        if (compLine) {
          doc.font('Helvetica-Oblique').fontSize(10).fillColor(C.mid)
             .text(compLine, L, y, { width: W });
          y = doc.y;
        }

        // Bullets
        if (exp.bullets?.length) {
          y += 8;
          for (const bullet of exp.bullets) {
            y = pageBreakIfNeeded(doc, y, 22);
            doc.font('Helvetica').fontSize(10.5).fillColor(C.body)
               .text(`•   ${bullet}`, L + 14, y, { width: W - 14, lineGap: 2 });
            y = doc.y + 4;
          }
        }

        y += 10;
      }
    }

    // ── EDUCATION ────────────────────────────────────────────────────────────
    if (data.education?.length) {
      y = pageBreakIfNeeded(doc, y, 60);
      y = sectionHeader(doc, 'EDUCATION', L, y, W);

      for (const edu of data.education) {
        y = pageBreakIfNeeded(doc, y, 40);

        doc.font('Helvetica-Bold').fontSize(11);
        const degH = doc.currentLineHeight(true);
        doc.font('Helvetica').fontSize(9.5);
        const yearH = doc.currentLineHeight(true);
        const yearOffset = Math.round((degH - yearH) / 2);

        doc.font('Helvetica-Bold').fontSize(11).fillColor(C.dark)
           .text(edu.degree || '', L, y, { width: W * 0.72, lineBreak: false });

        if (edu.year) {
          doc.font('Helvetica').fontSize(9.5).fillColor(C.light)
             .text(edu.year, L, y + yearOffset, { width: W, align: 'right', lineBreak: false });
        }

        y += degH + 4;

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
      y = pageBreakIfNeeded(doc, y, 45);
      y = sectionHeader(doc, 'CERTIFICATIONS', L, y, W);

      for (const cert of data.certifications) {
        y = pageBreakIfNeeded(doc, y, 20);
        doc.font('Helvetica').fontSize(10.5).fillColor(C.body)
           .text(`•   ${cert}`, L + 14, y, { width: W - 14, lineGap: 2 });
        y = doc.y + 4;
      }
      y += 6;
    }

    // ── PROJECTS ─────────────────────────────────────────────────────────────
    if (data.projects?.length) {
      y = pageBreakIfNeeded(doc, y, 60);
      y = sectionHeader(doc, 'PROJECTS', L, y, W);

      for (const proj of data.projects) {
        y = pageBreakIfNeeded(doc, y, 40);

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
          y += 5;
          doc.font('Helvetica').fontSize(10.5).fillColor(C.body)
             .text(`•   ${proj.description}`, L + 14, y, { width: W - 14, lineGap: 2 });
          y = doc.y;
        }

        y += 10;
      }
    }

    doc.end();
  });
}

function cleanUrl(url) {
  return (url || '').replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
}

module.exports = { generateResumePDF };
