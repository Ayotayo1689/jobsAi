const axios = require('axios');
const cheerio = require('cheerio');
const { getConfig } = require('../config');

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
};

function stripHtml(html) {
  return (html || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function slug(id, prefix) { return `${prefix}-${id}`; }

// ─── Free JSON APIs ──────────────────────────────────────────────────────────

async function fetchRemotive(keywords, primaryKeyword) {
  try {
    const params = { limit: 50 };
    if (primaryKeyword) params.search = primaryKeyword;
    const res = await axios.get('https://remotive.com/api/remote-jobs', { params, timeout: 12000 });
    return (res.data.jobs || [])
      .filter(j => matchesKeywords(`${j.title} ${j.description} ${(j.tags||[]).join(' ')}`, keywords))
      .slice(0, 30)
      .map(j => ({
        id: slug(j.id, 'remotive'),
        title: j.title,
        company: j.company_name,
        location: j.candidate_required_location || 'Worldwide',
        locationType: 'remote',
        salary: j.salary || null,
        url: j.url,
        description: stripHtml(j.description).substring(0, 3000),
        tags: j.tags || [],
        postedAt: j.publication_date,
        source: 'Remotive'
      }));
  } catch (e) { if (!e.response || e.response.status >= 500) console.error('Remotive:', e.message); return []; }
}

async function fetchArbeitnow(keywords, locationType) {
  try {
    const res = await axios.get('https://www.arbeitnow.com/api/job-board-api', { timeout: 12000 });
    let jobs = res.data.data || [];
    if (locationType === 'remote')  jobs = jobs.filter(j => j.remote);
    if (locationType === 'onsite')  jobs = jobs.filter(j => !j.remote);
    return jobs
      .filter(j => matchesKeywords(`${j.title} ${j.description} ${(j.tags||[]).join(' ')}`, keywords))
      .slice(0, 25)
      .map(j => ({
        id: slug(j.slug, 'arbeitnow'),
        title: j.title,
        company: j.company_name,
        location: j.location || (j.remote ? 'Remote' : 'On-site'),
        locationType: j.remote ? 'remote' : 'onsite',
        salary: null,
        url: j.url,
        description: stripHtml(j.description).substring(0, 3000),
        tags: j.tags || [],
        postedAt: j.created_at ? new Date(j.created_at * 1000).toISOString() : new Date().toISOString(),
        source: 'Arbeitnow'
      }));
  } catch (e) { if (!e.response || e.response.status >= 500) console.error('Arbeitnow:', e.message); return []; }
}

async function fetchJobicy(keywords, geo, primaryKeyword) {
  try {
    const params = { count: 50, geo: geo || 'worldwide' };
    if (primaryKeyword) params.tag = primaryKeyword.split(/\s+/)[0]; // Jobicy supports tag filter
    const res = await axios.get('https://jobicy.com/api/v2/remote-jobs', { params, timeout: 12000 });
    return (res.data.jobs || [])
      .filter(j => matchesKeywords(`${j.jobTitle} ${j.jobDescription} ${j.jobIndustry}`, keywords))
      .slice(0, 25)
      .map(j => ({
        id: slug(j.id, 'jobicy'),
        title: j.jobTitle,
        company: j.companyName,
        location: 'Remote',
        locationType: 'remote',
        salary: j.annualSalaryMin ? `$${j.annualSalaryMin}–$${j.annualSalaryMax}` : null,
        url: j.url,
        description: stripHtml(j.jobDescription).substring(0, 3000),
        tags: [j.jobIndustry, j.jobType].filter(Boolean),
        postedAt: j.pubDate,
        source: 'Jobicy'
      }));
  } catch (e) { if (!e.response || e.response.status >= 500) console.error('Jobicy:', e.message); return []; }
}

async function fetchHimalayas(keywords) {
  try {
    const query = keywords.slice(0, 3).join(' ');
    const res = await axios.get('https://himalayas.app/api/jobs', {
      params: { q: query, limit: 20 },
      timeout: 12000
    });
    return (res.data.jobs || []).slice(0, 25).map(j => ({
      id: slug(j.id || j.slug, 'himalayas'),
      title: j.title,
      company: j.companyName,
      location: 'Remote',
      locationType: 'remote',
      salary: j.minSalary ? `$${j.minSalary}–$${j.maxSalary}` : null,
      url: `https://himalayas.app/jobs/${j.slug}`,
      description: stripHtml(j.description || '').substring(0, 3000),
      tags: j.tech || [],
      postedAt: j.createdAt,
      source: 'Himalayas'
    }));
  } catch (e) { if (!e.response || e.response.status >= 500) console.error('Himalayas:', e.message); return []; }
}

async function fetchTheMuse(keywords, location, primaryKeyword) {
  try {
    const params = { page: 0, descending: true };
    if (location) params.location = location;
    if (primaryKeyword) params.search = primaryKeyword;
    const res = await axios.get('https://www.themuse.com/api/public/jobs', { params, timeout: 12000 });
    return (res.data.results || [])
      .filter(j => matchesKeywords(`${j.name} ${j.contents} ${(j.categories||[]).map(c=>c.name).join(' ')}`, keywords))
      .slice(0, 25)
      .map(j => {
        const loc = j.locations?.[0]?.name || '';
        const isRemote = loc.toLowerCase().includes('remote') || loc.toLowerCase().includes('flexible');
        return {
          id: slug(j.id, 'themuse'),
          title: j.name,
          company: j.company?.name,
          location: loc || 'Flexible',
          locationType: isRemote ? 'remote' : (loc.toLowerCase().includes('hybrid') ? 'hybrid' : 'onsite'),
          salary: null,
          url: j.refs?.landing_page,
          description: stripHtml(j.contents || '').substring(0, 3000),
          tags: (j.categories || []).map(c => c.name),
          postedAt: j.publication_date,
          source: 'The Muse'
        };
      });
  } catch (e) { if (!e.response || e.response.status >= 500) console.error('TheMuse:', e.message); return []; }
}

// ─── Web Scrapers ─────────────────────────────────────────────────────────────

async function scrapeWeWorkRemotely(keyword) {
  try {
    const term = encodeURIComponent(keyword);
    const res = await axios.get(`https://weworkremotely.com/remote-jobs/search?term=${term}`, {
      headers: HEADERS, timeout: 15000
    });
    const $ = cheerio.load(res.data);
    const jobs = [];
    $('section.jobs article').each((_, el) => {
      const titleEl = $(el).find('.title');
      const companyEl = $(el).find('.company');
      const regionEl = $(el).find('.region');
      const href = $(el).find('a').attr('href');
      if (titleEl.text().trim() && companyEl.text().trim()) {
        jobs.push({
          id: slug(href?.replace(/\//g, '-').slice(1) || Math.random(), 'wwr'),
          title: titleEl.text().trim(),
          company: companyEl.text().trim(),
          location: regionEl.text().trim() || 'Remote',
          locationType: 'remote',
          salary: null,
          url: href ? `https://weworkremotely.com${href}` : 'https://weworkremotely.com',
          description: `Remote ${titleEl.text().trim()} position at ${companyEl.text().trim()}`,
          tags: [],
          postedAt: new Date().toISOString(),
          source: 'WeWorkRemotely'
        });
      }
    });
    return jobs.slice(0, 25);
  } catch (e) { if (!e.response || e.response.status >= 500) console.error('WWR:', e.message); return []; }
}

async function scrapeLinkedInJobs(keyword, location, locationType) {
  try {
    const geoId = locationType === 'remote' ? '&f_WT=2' : locationType === 'hybrid' ? '&f_WT=3' : locationType === 'onsite' ? '&f_WT=1' : '';
    const loc = encodeURIComponent(location || 'Worldwide');
    const kw = encodeURIComponent(keyword);
    const url = `https://www.linkedin.com/jobs/search?keywords=${kw}&location=${loc}${geoId}&sortBy=DD&f_TPR=r604800`;
    const res = await axios.get(url, { headers: HEADERS, timeout: 15000 });
    const $ = cheerio.load(res.data);
    const jobs = [];
    $('li.result-card, .job-search-card, [data-entity-urn]').each((_, el) => {
      const title = $(el).find('.result-card__title, .job-result-card__title, .base-search-card__title').text().trim();
      const company = $(el).find('.result-card__subtitle, .job-result-card__subtitle, .base-search-card__subtitle').text().trim();
      const loc = $(el).find('.job-result-card__location, .job-search-card__location').text().trim();
      const href = $(el).find('a').attr('href') || '';
      if (title && company) {
        jobs.push({
          id: slug(href.split('?')[0].replace(/\//g,'-').slice(-20) || Math.random(), 'linkedin'),
          title,
          company,
          location: loc || location || 'See posting',
          locationType: locationType || 'any',
          salary: null,
          url: href.split('?')[0] || url,
          description: `${title} at ${company}${loc ? ` · ${loc}` : ''}`,
          tags: [],
          postedAt: new Date().toISOString(),
          source: 'LinkedIn'
        });
      }
    });
    return jobs.slice(0, 25);
  } catch (e) { if (!e.response || e.response.status >= 500) console.error('LinkedIn:', e.message); return []; }
}

async function scrapeIndeed(keyword, location, locationType) {
  try {
    const searchLoc = locationType === 'remote' ? 'remote' : (location || '');
    const url = `https://www.indeed.com/jobs?q=${encodeURIComponent(keyword)}&l=${encodeURIComponent(searchLoc)}&sort=date&fromage=14`;
    const res = await axios.get(url, { headers: HEADERS, timeout: 15000 });
    const $ = cheerio.load(res.data);
    const jobs = [];

    // Try multiple selectors since Indeed changes their HTML
    $('[data-jk], .job_seen_beacon, .tapItem').each((_, el) => {
      const jk = $(el).attr('data-jk') || $(el).find('[data-jk]').attr('data-jk');
      const title =
        $(el).find('h2.jobTitle span, [data-testid="jobsearch-JobInfoHeader-title"], .jcs-JobTitle span').first().text().trim() ||
        $(el).find('h2').first().text().trim();
      const company =
        $(el).find('[data-testid="company-name"], .companyName, .company').first().text().trim();
      const loc =
        $(el).find('[data-testid="text-location"], .companyLocation').first().text().trim();
      const snippet =
        $(el).find('.job-snippet, [data-testid="job-snippet"]').text().trim();

      if (title && company) {
        const isRemote = loc.toLowerCase().includes('remote');
        const isHybrid = loc.toLowerCase().includes('hybrid') || snippet.toLowerCase().includes('hybrid');
        jobs.push({
          id: slug(jk || Math.random(), 'indeed'),
          title,
          company,
          location: loc || searchLoc || 'See posting',
          locationType: isRemote ? 'remote' : isHybrid ? 'hybrid' : 'onsite',
          salary: null,
          url: jk ? `https://www.indeed.com/viewjob?jk=${jk}` : url,
          description: snippet || `${title} at ${company}`,
          tags: [],
          postedAt: new Date().toISOString(),
          source: 'Indeed'
        });
      }
    });
    return jobs.slice(0, 25);
  } catch (e) { if (!e.response || e.response.status >= 500) console.error('Indeed:', e.message); return []; }
}

// ─── Optional: JSearch via RapidAPI (if key is provided) ─────────────────────

async function fetchJSearch(keyword, location, locationType, rapidApiKey) {
  try {
    const query = locationType === 'remote' ? `${keyword} remote` : `${keyword}${location ? ` in ${location}` : ''}`;
    const res = await axios.get('https://jsearch.p.rapidapi.com/search', {
      params: { query, page: 1, num_pages: 1, date_posted: 'week' },
      headers: { 'X-RapidAPI-Key': rapidApiKey, 'X-RapidAPI-Host': 'jsearch.p.rapidapi.com' },
      timeout: 15000
    });
    return (res.data.data || []).slice(0, 30).map(j => ({
      id: slug(j.job_id, 'jsearch'),
      title: j.job_title,
      company: j.employer_name,
      location: j.job_city ? `${j.job_city}, ${j.job_country}` : j.job_country || 'See posting',
      locationType: j.job_is_remote ? 'remote' : (j.job_title?.toLowerCase().includes('hybrid') ? 'hybrid' : 'onsite'),
      salary: j.job_min_salary ? `$${j.job_min_salary}–$${j.job_max_salary}` : null,
      url: j.job_apply_link,
      description: (j.job_description || '').substring(0, 3000),
      tags: j.job_required_skills || [],
      postedAt: j.job_posted_at_datetime_utc,
      source: 'JSearch (LinkedIn/Indeed/Glassdoor)'
    }));
  } catch (e) { if (!e.response || e.response.status >= 500) console.error('JSearch:', e.message); return []; }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function matchesKeywords(text, keywords) {
  if (!keywords || keywords.length === 0) return true;
  const lower = (text || '').toLowerCase();
  // Try matching the full phrase first, then fall back to any individual word
  const phrase = keywords.join(' ').toLowerCase();
  if (phrase && lower.includes(phrase)) return true;
  return keywords.some(kw => kw && kw.length > 2 && lower.includes(kw.toLowerCase()));
}

function applyLocationFilter(jobs, locationType) {
  if (!locationType || locationType === 'any') return jobs;
  return jobs.filter(j => {
    if (j.locationType === locationType) return true;
    // Fallback: check description text
    const text = `${j.location} ${j.description}`.toLowerCase();
    if (locationType === 'remote') return text.includes('remote') || text.includes('work from home') || text.includes('wfh');
    if (locationType === 'hybrid') return text.includes('hybrid');
    if (locationType === 'onsite') return !text.includes('remote') || text.includes('on-site') || text.includes('onsite') || text.includes('in office');
    return true;
  });
}

// ─── Main export ──────────────────────────────────────────────────────────────

async function searchJobs(resumeData, preferences = {}) {
  const { rapidApiKey } = getConfig();
  const extraKeys = { rapidApiKey };
  const {
    locationType = 'any',   // 'remote' | 'hybrid' | 'onsite' | 'any'
    location = '',           // e.g. "New York, USA"
    keywords: customKeywords // user-typed keywords
  } = preferences;

  const roleKeywords = customKeywords
    ? customKeywords.split(/[\s,]+/).filter(Boolean)
    : [resumeData.role, ...(resumeData.skills || []).slice(0, 6)].filter(Boolean);

  const primaryKeyword = customKeywords || resumeData.role || roleKeywords[0] || 'developer';

  console.log(`Searching: "${primaryKeyword}" | type: ${locationType} | location: ${location || 'any'}`);

  const tasks = [];

  // Remote-focused sources
  if (locationType === 'remote' || locationType === 'any') {
    tasks.push(fetchRemotive(roleKeywords, primaryKeyword));
    tasks.push(fetchJobicy(roleKeywords, geoFromLocation(location), primaryKeyword));
    tasks.push(fetchHimalayas(roleKeywords));
    tasks.push(scrapeWeWorkRemotely(primaryKeyword));
  }

  // General / onsite / hybrid sources
  tasks.push(fetchArbeitnow(roleKeywords, locationType));
  tasks.push(fetchTheMuse(roleKeywords, location, primaryKeyword));
  tasks.push(scrapeIndeed(primaryKeyword, location, locationType));
  tasks.push(scrapeLinkedInJobs(primaryKeyword, location, locationType));

  // If user added RapidAPI key for JSearch (LinkedIn/Indeed/Glassdoor aggregator)
  if (extraKeys.rapidApiKey) {
    tasks.push(fetchJSearch(primaryKeyword, location, locationType, extraKeys.rapidApiKey));
  }

  const results = await Promise.allSettled(tasks);
  const allJobs = results.flatMap(r => r.status === 'fulfilled' ? r.value : []);

  // Deduplicate by title+company
  const seen = new Set();
  const unique = allJobs.filter(j => {
    const key = `${j.title?.toLowerCase()}-${j.company?.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return j.title && j.company;
  });

  // Apply location type filter on top of everything
  const filtered = applyLocationFilter(unique, locationType);

  // Sort by recency
  filtered.sort((a, b) => new Date(b.postedAt || 0) - new Date(a.postedAt || 0));

  console.log(`Total: ${allJobs.length} raw → ${filtered.length} after filter`);
  return filtered;
}

function geoFromLocation(location) {
  if (!location) return 'worldwide';
  const l = location.toLowerCase();
  if (l.includes('usa') || l.includes('united states') || l.includes('us ')) return 'usa';
  if (l.includes('uk') || l.includes('united kingdom') || l.includes('britain')) return 'gb';
  if (l.includes('canada')) return 'ca';
  if (l.includes('australia')) return 'au';
  if (l.includes('europe') || l.includes('eu')) return 'eu';
  return 'worldwide';
}

module.exports = { searchJobs };
