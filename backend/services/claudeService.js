const Anthropic = require('@anthropic-ai/sdk');
const { getConfig } = require('../config');

function getClient() {
  const apiKey = getConfig().claudeApiKey;
  if (!apiKey) throw new Error('Claude API key not configured. Add CLAUDE_API_KEY to .env or enter it in Settings.');
  return new Anthropic({ apiKey });
}

async function chat(messages, systemPrompt, maxTokens = 4096) {
  const client = getClient();
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: maxTokens,
    system: systemPrompt,
    messages
  });
  return response.content[0].text;
}

function extractJSON(text) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

async function analyzeResume(resumeText) {
  const systemPrompt = `You are an expert resume analyst and ATS specialist. Always return valid JSON only, no markdown code blocks.`;

  const prompt = `Analyze this resume and return ONLY this JSON structure (no markdown, no explanation):

{
  "name": "Full Name",
  "email": "email or null",
  "phone": "phone or null",
  "location": "city, country or null",
  "primaryRole": "e.g. Frontend Developer",
  "experienceLevel": "Junior|Mid|Senior|Lead|Executive",
  "yearsOfExperience": 3,
  "summary": "2-3 sentence professional summary",
  "skills": ["skill1", "skill2"],
  "technicalSkills": ["React", "Node.js"],
  "softSkills": ["Communication", "Leadership"],
  "workExperience": [
    {
      "title": "Job Title",
      "company": "Company Name",
      "duration": "Jan 2020 - Dec 2022",
      "highlights": ["achievement 1", "achievement 2"]
    }
  ],
  "education": [
    {
      "degree": "Bachelor of Science in Computer Science",
      "institution": "University Name",
      "year": "2020"
    }
  ],
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "improvements": ["area to improve 1", "area to improve 2"],
  "atsScore": 72,
  "qualityScore": 78
}

Resume:
${resumeText}`;

  const text = await chat([{ role: 'user', content: prompt }], systemPrompt, 2048);
  const result = extractJSON(text);
  if (!result) throw new Error('Failed to parse resume analysis response');
  return result;
}

async function matchJob(resumeText, job) {
  const systemPrompt = `You are an expert ATS and career advisor. Return valid JSON only, no markdown.`;

  const prompt = `Calculate the match score between this resume and job. Return ONLY this JSON:

{
  "score": 85,
  "matchedSkills": ["skill1", "skill2"],
  "missingSkills": ["missing1", "missing2"],
  "experienceMatch": "Good|Partial|Poor",
  "recommendation": "2-3 sentence recommendation",
  "keyStrengths": ["strength for this role 1", "strength 2"]
}

Resume:
${resumeText.substring(0, 3000)}

Job Title: ${job.title}
Company: ${job.company}
Description:
${(job.description || '').substring(0, 2000)}`;

  const text = await chat([{ role: 'user', content: prompt }], systemPrompt, 1024);
  const result = extractJSON(text);
  if (!result) return { score: 50, matchedSkills: [], missingSkills: [], recommendation: 'Unable to calculate match', keyStrengths: [] };
  return result;
}

async function tailorResume(resumeText, job, missingSkills = []) {
  const systemPrompt = `You are an expert ATS resume writer. Tailor resumes to job descriptions while maintaining factual accuracy. Never fabricate experience.`;

  const missingNote = missingSkills.length > 0
    ? `\nThe following skills appear in the job description but are not clearly showcased in the resume: ${missingSkills.join(', ')}. Where the candidate's real experience genuinely relates to these areas, reframe and highlight those connections. Do NOT invent experience that does not exist.`
    : '';

  const prompt = `Tailor this resume for the job below. Keep every fact truthful — never fabricate experience.${missingNote}

WRITING RULES — apply all of these without exception:
- Each bullet must open with a DIFFERENT strong action verb. Scan all bullets before writing; if a verb appears more than once across the entire resume, replace the duplicate.
- Forbidden weak or vague words/phrases: "responsible for", "worked on", "helped with", "assisted in", "various", "multiple", "leveraged", "utilized", "synergy", "results-driven", "detail-oriented", "team player", "passionate about", "dynamic", "innovative solutions". Replace every instance.
- No two bullets in the same job should describe the same type of task. If two bullets feel similar, merge them into one stronger bullet or cut the weaker one.
- Remove any phrase that is repeated across different bullets or sections — identical or near-identical wording must not appear more than once in the entire document.
- Preserve all URLs exactly as they appear in the original resume. Do not reformat, shorten, expand, or remove any URL. Output them verbatim.
- Keyword match: weave in exact keywords and phrases from the job description naturally into bullets and the summary. Prioritise terms that appear multiple times in the job description or are in the requirements section.
- Prefer concrete, specific language: name the tool, the metric, the outcome, the scale. "Reduced query time by 40%" beats "improved performance".
- Quantify wherever the original resume gives any hint of scope (team size, users, revenue, time saved, error rate). If no number exists, describe the impact qualitatively but specifically.
- Action verbs to draw from (don't repeat any): Architected, Automated, Accelerated, Delivered, Drove, Eliminated, Engineered, Established, Generated, Implemented, Launched, Led, Migrated, Optimized, Overhauled, Pioneered, Reduced, Refactored, Scaled, Shipped, Spearheaded, Streamlined, Transformed, Unified.

Job: ${job.title} at ${job.company}
Description:
${(job.description || '').substring(0, 2000)}

Resume:
${resumeText}

Return the complete tailored resume as clean plain text ready to copy.`;

  return await chat([{ role: 'user', content: prompt }], systemPrompt, 4096);
}

async function generateCoverLetter(resumeText, job) {
  const systemPrompt = `You are an expert cover letter writer. Write compelling, specific, ATS-friendly cover letters. Never use generic templates or filler language.`;

  const prompt = `Write a professional cover letter (180-200 words maximum) for this application.

WRITING RULES — apply all without exception:
- 2-3 paragraphs only. Hard limit: 200 words. Cut ruthlessly.
- Open with a specific, direct statement about WHY this role and company — not "I am excited to apply". Reference something concrete.
- Every sentence must earn its place. Cut anything that could appear in any cover letter for any job.
- Do NOT use: "I am a passionate", "results-driven", "team player", "I believe I would be a great fit", "I am writing to express my interest", "I am excited about the opportunity", "my skills align with", "I would love the chance to", "please find attached", "do not hesitate to contact me", "thank you for your consideration".
- Each paragraph must make a different point.
- Use strong, specific verbs. Prefer "I cut deployment time by 30%" over "I helped improve the process".
- The closing paragraph states what you bring — confident, not supplicating. No bullet points.

Job: ${job.title} at ${job.company}
Description:
${(job.description || '').substring(0, 2000)}

Candidate Background:
${resumeText.substring(0, 2000)}

Start with "Dear Hiring Manager," — no date/address header.`;

  return await chat([{ role: 'user', content: prompt }], systemPrompt, 2048);
}

async function generateEmail(resumeAnalysis, job, coverLetter) {
  const systemPrompt = `You are an expert at writing professional job application emails. Return valid JSON only.`;

  const prompt = `Write a professional application email. Return ONLY this JSON:

{
  "subject": "Application for ${job.title} – ${resumeAnalysis?.name || 'Candidate'}",
  "body": "Full email body text here..."
}

Candidate: ${resumeAnalysis?.name || 'Candidate'}
Role: ${job.title}
Company: ${job.company}

Cover Letter Preview:
${(coverLetter || '').substring(0, 500)}`;

  const text = await chat([{ role: 'user', content: prompt }], systemPrompt, 1024);
  const result = extractJSON(text);
  if (!result) {
    return {
      subject: `Application for ${job.title} – ${resumeAnalysis?.name || 'Candidate'}`,
      body: `Dear Hiring Team,\n\nPlease find attached my resume and cover letter for the ${job.title} position at ${job.company}.\n\nI am excited about this opportunity and believe my background is a strong match for your requirements.\n\nBest regards,\n${resumeAnalysis?.name || 'Candidate'}`
    };
  }
  return result;
}

async function structureResumeForPDF(resumeText) {
  const systemPrompt = `You are a resume parser. Extract every section from resume text into clean structured JSON. Return only valid JSON, no markdown.`;

  const prompt = `Parse this resume into structured JSON. Include every section present. Return ONLY this JSON:

{
  "name": "Full Name",
  "title": "Current/Target Job Title",
  "email": "email or null",
  "phone": "phone or null",
  "location": "City, Country or null",
  "linkedin": "full linkedin URL or null",
  "github": "full github URL or null",
  "website": "personal website URL or null",
  "portfolio": "portfolio URL or null",
  "summary": "professional summary paragraph or null",
  "skills": ["skill1", "skill2"],
  "experience": [
    {
      "title": "Job Title",
      "company": "Company Name",
      "location": "City, Country or null",
      "duration": "Jan 2020 – Dec 2022",
      "bullets": ["achievement 1", "achievement 2"]
    }
  ],
  "education": [
    {
      "degree": "Bachelor of Science in Computer Science",
      "institution": "University Name",
      "year": "2020",
      "gpa": null
    }
  ],
  "certifications": ["Certification Name"],
  "projects": [
    {
      "name": "Project Name",
      "description": "one sentence description",
      "tech": ["React", "Node.js"]
    }
  ]
}

Resume text:
${resumeText}`;

  const text = await chat([{ role: 'user', content: prompt }], systemPrompt, 2048);
  const result = extractJSON(text);
  if (!result) throw new Error('Failed to parse resume into structured format');
  return result;
}

async function parseJobFromText(text) {
  const systemPrompt = `You extract structured job information from pasted text. Return ONLY valid JSON.`;

  const prompt = `Extract job details from this pasted text. Return ONLY this JSON:

{
  "title": "job title or null",
  "company": "company name or null",
  "email": "hiring manager or recruiter email if explicitly present, null otherwise",
  "url": "application URL if present, null otherwise",
  "location": "location or Remote or null",
  "locationType": "remote|onsite|hybrid|any",
  "description": "full job description text",
  "salary": "salary range if mentioned, null otherwise"
}

Text:
${text.substring(0, 4000)}`;

  const result = await chat([{ role: 'user', content: prompt }], systemPrompt, 1024);
  const parsed = extractJSON(result);
  if (!parsed) throw new Error('Could not extract job details from the pasted text. Make sure it contains a job description.');
  if (!parsed.title && !parsed.company) throw new Error('Could not identify a job title or company. Please paste a job description.');
  return parsed;
}

async function classifyJobDescription(text) {
  const systemPrompt = `You classify messages as job descriptions. Return ONLY valid JSON.`;

  const prompt = `Is this message a job description or job posting? If yes, extract the details.

Return ONLY this JSON:
{
  "isJob": true,
  "job": {
    "title": "job title",
    "company": "company name or null",
    "location": "location or Remote",
    "locationType": "remote|onsite|hybrid|any",
    "description": "job description",
    "email": "contact email or null",
    "url": "application url or null",
    "salary": "salary if mentioned or null"
  }
}

If NOT a job posting, return: {"isJob": false, "job": null}

Message:
${text.substring(0, 3000)}`;

  const result = await chat([{ role: 'user', content: prompt }], systemPrompt, 1024);
  const parsed = extractJSON(result);
  return parsed || { isJob: false, job: null };
}

module.exports = { analyzeResume, matchJob, tailorResume, generateCoverLetter, generateEmail, structureResumeForPDF, parseJobFromText, classifyJobDescription };
