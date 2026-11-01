import fs from 'node:fs';
import path from 'node:path';
import { emi, balanceAfter, summary, inr, lakhLabel } from './math.js';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'dist');
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'config.json'), 'utf8'));
const today = new Date().toISOString().slice(0, 10);

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const href = (p) => cfg.basePath + p;
const pages = [];

function write(rel, content) {
  const file = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

const CSS = `
:root{--bg:#fff;--fg:#1b1f23;--muted:#5b6670;--card:#f4f6f8;--accent:#0b5cad;--on:#fff;--line:#dfe3e8}
@media (prefers-color-scheme:dark){:root{--bg:#14171a;--fg:#e8eaed;--muted:#9aa4ad;--card:#1e2328;--accent:#6cb2ff;--on:#0b1622;--line:#2d343b}}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.55 system-ui,sans-serif}
header,main,footer{max-width:760px;margin:0 auto;padding:12px 16px}
header{display:flex;flex-wrap:wrap;gap:8px 16px;align-items:center;justify-content:space-between}
header a.brand{font-weight:700;color:var(--fg);text-decoration:none}
nav a{margin-right:12px;color:var(--accent)}
h1{font-size:1.6rem;line-height:1.25} h2{font-size:1.2rem;margin-top:1.8rem}
a{color:var(--accent)}
.card{background:var(--card);border-radius:12px;padding:14px 16px;margin:14px 0}
label{display:block;font-size:.9rem;margin:8px 0 2px;color:var(--muted)}
input[type=number],input[type=text],input[type=tel]{width:100%;padding:9px 10px;border:1px solid var(--line);border-radius:8px;background:var(--bg);color:var(--fg);font-size:1rem}
.row{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px}
@media (max-width:560px){.row{grid-template-columns:1fr}}
.big{font-size:1.8rem;font-weight:700} .big span{font-size:.95rem;font-weight:400;color:var(--muted)}
button{background:var(--accent);color:var(--on);border:0;border-radius:8px;padding:10px 16px;font-size:1rem;font-weight:600;cursor:pointer;margin-top:10px}
table{width:100%;border-collapse:collapse;font-size:.92rem} th,td{border-bottom:1px solid var(--line);padding:6px 8px;text-align:right} th:first-child,td:first-child{text-align:left}
.scroll{overflow-x:auto}
.muted,.small{color:var(--muted);font-size:.85rem}
.chips a{display:inline-block;margin:3px 6px 3px 0;padding:4px 10px;border:1px solid var(--line);border-radius:999px;text-decoration:none;font-size:.9rem}
.hp{position:absolute;left:-9999px}
`;

function layout({ title, desc, url, body, jsonld }) {
  const full = `${cfg.siteUrl}${url}`;
  pages.push(url);
  return `<!doctype html>
<html lang="en-IN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${esc(full)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:type" content="website">
<style>${CSS}</style>
${jsonld ? `<script type="application/ld+json">${JSON.stringify(jsonld).replace(/</g, '\\u003c')}</script>` : ''}
</head>
<body>
<header><a class="brand" href="${href('/')}">${esc(cfg.siteName)}</a>
<nav><a href="${href('/home-loan-emi-calculator/')}">EMI calculator</a><a href="${href('/home-loan-eligibility-calculator/')}">Eligibility</a></nav></header>
<main>
${body}
</main>
<footer class="small">
<p>Estimates only, not financial advice and not a loan offer. Actual EMI and eligibility depend on the lender, your profile and current rates. We are not a lender.</p>
<p><a href="${href('/about/')}">About</a> · <a href="${href('/privacy/')}">Privacy</a></p>
</footer>
<script>window.CALC={worker:${JSON.stringify(cfg.workerUrl)}};</script>
<script src="${href('/app.js')}" defer></script>
</body>
</html>
`;
}

const field = (label, name, value, step = 'any') =>
  `<div><label for="${name}">${label}</label><input type="number" inputmode="decimal" id="${name}" name="${name}" value="${value}" step="${step}" min="0"></div>`;

const emiWidget = (amount, rate, years) => `<div class="card" data-calc="emi">
<div class="row">${field('Loan amount (₹)', 'amount', amount)}${field('Interest rate (% p.a.)', 'rate', rate, '0.05')}${field('Tenure (years)', 'years', years)}</div>
<div class="out" aria-live="polite"></div></div>`;

const leadForm = (amount = '') => `<form class="card" data-lead>
<h2 style="margin-top:0">Want help comparing home loan offers?</h2>
<p class="small">Share your details and a partner lender or loan advisor may call you. No fee from us.</p>
<div class="row">
<div><label for="lname">Name</label><input type="text" id="lname" name="name" autocomplete="name" maxlength="80"></div>
<div><label for="lphone">Mobile number</label><input type="tel" id="lphone" name="phone" autocomplete="tel" inputmode="tel" maxlength="16"></div>
<div><label for="lcity">City</label><input type="text" id="lcity" name="city" autocomplete="address-level2" maxlength="60"></div>
</div>
<div class="row"><div>${field('Loan amount needed (₹)', 'amount', amount)}</div></div>
<div class="hp"><label>Leave this empty<input type="text" name="website" tabindex="-1" autocomplete="off"></label></div>
<label style="display:flex;gap:8px;align-items:flex-start;color:var(--fg)"><input type="checkbox" name="consent" style="margin-top:4px">
<span class="small">I agree to be contacted by phone, SMS or WhatsApp by partner lenders or loan advisors about home loans, and to my details being shared with them. See the <a href="${href('/privacy/')}">privacy policy</a>.</span></label>
<button type="submit">Request a call back</button>
<p class="msg small" aria-live="polite"></p>
</form>`;

const faqLd = (qa) => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: qa.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
});
const faqHtml = (qa) => qa.map(([q, a]) => `<h3>${esc(q)}</h3><p>${esc(a)}</p>`).join('\n');

const slug = (lakh, years) => `/emi/${lakh}-lakh-home-loan${years ? `-${years}-years` : ''}/`;

// ---------- page generators ----------

function emiMainPage() {
  return layout({
    title: `Home Loan EMI Calculator India | ${cfg.siteName}`,
    desc: 'Free home loan EMI calculator. Enter loan amount, interest rate and tenure to see your monthly EMI, total interest and total payment.',
    url: '/home-loan-emi-calculator/',
    body: `<h1>Home Loan EMI Calculator</h1>
<p>Change the amount, rate and tenure to see your monthly EMI instantly.</p>
${emiWidget(5000000, cfg.defaultRate, cfg.defaultTenure)}
${leadForm(5000000)}
<h2>Popular loan amounts</h2>
<p class="chips">${cfg.amountsLakh.map((a) => `<a href="${href(slug(a))}">${lakhLabel(a)}</a>`).join('')}</p>`,
  });
}

function eligibilityPage() {
  return layout({
    title: `Home Loan Eligibility Calculator India | ${cfg.siteName}`,
    desc: 'Estimate how much home loan you may be eligible for from your monthly income and existing EMIs.',
    url: '/home-loan-eligibility-calculator/',
    body: `<h1>Home Loan Eligibility Calculator</h1>
<p>A quick estimate of the loan you may qualify for, based on your net monthly income and current EMIs.</p>
<div class="card" data-calc="eligibility">
<div class="row">${field('Net monthly income (₹)', 'income', 100000)}${field('Existing EMIs per month (₹)', 'obligations', 0)}${field('Interest rate (% p.a.)', 'rate', cfg.defaultRate, '0.05')}</div>
<div class="row">${field('Tenure (years)', 'years', cfg.defaultTenure)}</div>
<div class="out" aria-live="polite"></div></div>
${leadForm()}`,
  });
}

function amountTenurePage(lakh, years) {
  const P = lakh * 100000;
  const label = lakhLabel(lakh);
  const base = summary(P, cfg.defaultRate, years);
  const income = (e, f) => inr(e / f);
  const rows = cfg.rates
    .map((r) => {
      const s = summary(P, r, years);
      return `<tr><td>${r}%</td><td>${inr(s.emi)}</td><td>${inr(s.interest)}</td><td>${inr(s.total)}</td></tr>`;
    })
    .join('');
  const balRows = [5, 10, 15, 20, 25]
    .filter((y) => y < years)
    .map((y) => `<tr><td>After ${y} years</td><td>${inr(balanceAfter(P, cfg.defaultRate, years, y * 12))}</td></tr>`)
    .join('');
  const qa = [
    [`What is the EMI for a ${label} home loan for ${years} years?`,
      `At ${cfg.defaultRate}% a year the monthly EMI is about ${inr(base.emi)}. At 9% it is about ${inr(emi(P, 9, years))} and at 10% about ${inr(emi(P, 10, years))}.`],
    [`How much interest will I pay on a ${label} loan over ${years} years?`,
      `At ${cfg.defaultRate}% the total interest is about ${inr(base.interest)}, so you repay about ${inr(base.total)} in total.`],
    [`What income do I need for a ${label} home loan?`,
      `Lenders commonly keep total EMIs within roughly 40% to 50% of net monthly income. For an EMI of ${inr(base.emi)}, that suggests a net monthly income of about ${income(base.emi, 0.5)} to ${income(base.emi, 0.4)}. Your lender's rules may differ.`],
  ];
  const otherTenures = cfg.tenuresYears.filter((y) => y !== years);
  const otherAmounts = cfg.amountsLakh.filter((a) => a !== lakh);
  return layout({
    title: `EMI for ${label} Home Loan for ${years} Years: ${inr(base.emi)}/month | ${cfg.siteName}`,
    desc: `EMI on a ${label} home loan over ${years} years is about ${inr(base.emi)} a month at ${cfg.defaultRate}%. See EMI at other interest rates, total interest and balance over time.`,
    url: slug(lakh, years),
    jsonld: faqLd(qa),
    body: `<h1>EMI for a ${label} Home Loan for ${years} Years</h1>
<p>At <b>${cfg.defaultRate}%</b> a year, the EMI is about <b>${inr(base.emi)}</b> per month, with total interest of about ${inr(base.interest)}. Rates below are illustrative, so use your lender's actual rate in the calculator.</p>
${emiWidget(P, cfg.defaultRate, years)}
<h2>EMI at different interest rates</h2>
<div class="scroll"><table><thead><tr><th>Rate</th><th>Monthly EMI</th><th>Total interest</th><th>Total payment</th></tr></thead><tbody>${rows}</tbody></table></div>
${balRows ? `<h2>Outstanding loan balance at ${cfg.defaultRate}%</h2>
<div class="scroll"><table><thead><tr><th>When</th><th>Balance</th></tr></thead><tbody>${balRows}</tbody></table></div>` : ''}
${leadForm(P)}
<h2>Frequently asked questions</h2>
${faqHtml(qa)}
<h2>Other tenures for ${label}</h2>
<p class="chips">${otherTenures.map((y) => `<a href="${href(slug(lakh, y))}">${y} years</a>`).join('')}</p>
<h2>Other loan amounts for ${years} years</h2>
<p class="chips">${otherAmounts.map((a) => `<a href="${href(slug(a, years))}">${lakhLabel(a)}</a>`).join('')}</p>`,
  });
}

function amountPage(lakh) {
  const P = lakh * 100000;
  const label = lakhLabel(lakh);
  const head = cfg.rates.map((r) => `<th>${r}%</th>`).join('');
  const rows = cfg.tenuresYears
    .map((y) => `<tr><td><a href="${href(slug(lakh, y))}">${y} years</a></td>${cfg.rates.map((r) => `<td>${inr(emi(P, r, y))}</td>`).join('')}</tr>`)
    .join('');
  const e = emi(P, cfg.defaultRate, cfg.defaultTenure);
  return layout({
    title: `${label} Home Loan EMI Calculator: ${inr(e)}/month for ${cfg.defaultTenure} Years | ${cfg.siteName}`,
    desc: `Monthly EMI on a ${label} home loan for 10 to 30 years at 7.5% to 10.5% interest. Calculator with total interest and payment.`,
    url: slug(lakh),
    body: `<h1>${label} Home Loan EMI</h1>
<p>On a ${label} loan for ${cfg.defaultTenure} years at ${cfg.defaultRate}%, the EMI is about <b>${inr(e)}</b> a month. The table shows the EMI for other tenures and rates. These are illustrative rates, not offers.</p>
${emiWidget(P, cfg.defaultRate, cfg.defaultTenure)}
<h2>EMI by tenure and interest rate</h2>
<div class="scroll"><table><thead><tr><th>Tenure</th>${head}</tr></thead><tbody>${rows}</tbody></table></div>
${leadForm(P)}
<h2>Other loan amounts</h2>
<p class="chips">${cfg.amountsLakh.filter((a) => a !== lakh).map((a) => `<a href="${href(slug(a))}">${lakhLabel(a)}</a>`).join('')}</p>`,
  });
}

function homePage() {
  return layout({
    title: `${cfg.siteName}: Home Loan EMI and Eligibility Calculators`,
    desc: 'Free home loan EMI and eligibility calculators for India, with EMI tables for popular loan amounts and tenures.',
    url: '/',
    body: `<h1>Home loan calculators for India</h1>
<p>Work out your EMI, total interest and the loan you may be eligible for. Free, no sign-up.</p>
<div class="card"><p><a href="${href('/home-loan-emi-calculator/')}"><b>Home loan EMI calculator</b></a><br><span class="muted">Monthly EMI, total interest and total payment.</span></p>
<p><a href="${href('/home-loan-eligibility-calculator/')}"><b>Home loan eligibility calculator</b></a><br><span class="muted">How much loan your income may support.</span></p></div>
<h2>EMI by loan amount</h2>
<p class="chips">${cfg.amountsLakh.map((a) => `<a href="${href(slug(a))}">${lakhLabel(a)}</a>`).join('')}</p>`,
  });
}

function aboutPage() {
  return layout({
    title: `About | ${cfg.siteName}`,
    desc: `About ${cfg.siteName}.`,
    url: '/about/',
    body: `<h1>About</h1>
<p>${esc(cfg.siteName)} offers free home loan calculators. The results are estimates calculated with the standard reducing-balance EMI formula. We are not a bank or a lender.</p>
<p>If you request a call back, your details may be shared with partner lenders or loan advisors, who may pay us a referral fee. This does not increase what you pay.</p>`,
  });
}

function privacyPage() {
  return layout({
    title: `Privacy Policy | ${cfg.siteName}`,
    desc: 'How we handle personal information.',
    url: '/privacy/',
    body: `<h1>Privacy Policy</h1>
<p>The calculators run in your browser and the numbers you type into them are not sent anywhere.</p>
<p>If you submit the call-back form we collect your name, mobile number, city, loan amount and the page you used. We use it to connect you with partner lenders or loan advisors and to run this site. By ticking the consent box you agree that they may contact you by phone, SMS or WhatsApp.</p>
<p>You can ask us to correct or delete your details at any time${cfg.contactEmail ? ` by emailing <a href="mailto:${esc(cfg.contactEmail)}">${esc(cfg.contactEmail)}</a>` : ''}. We do not sell your details to anyone other than the lenders or advisors described above.</p>`,
  });
}

// ---------- build ----------

fs.rmSync(OUT, { recursive: true, force: true });
write('index.html', homePage());
write('home-loan-emi-calculator/index.html', emiMainPage());
write('home-loan-eligibility-calculator/index.html', eligibilityPage());
write('about/index.html', aboutPage());
write('privacy/index.html', privacyPage());
for (const lakh of cfg.amountsLakh) {
  write(`${slug(lakh)}index.html`.slice(1), amountPage(lakh));
  for (const years of cfg.tenuresYears) write(`${slug(lakh, years)}index.html`.slice(1), amountTenurePage(lakh, years));
}
write('404.html', `<!doctype html><meta charset="utf-8"><title>Not found</title><p>Page not found. <a href="${href('/')}">Home</a></p>`);
write('app.js', fs.readFileSync(path.join(ROOT, 'src', 'client.js'), 'utf8'));
write('robots.txt', `User-agent: *\nAllow: /\nSitemap: ${cfg.siteUrl}/sitemap.xml\n`);
write(
  'sitemap.xml',
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages
    .map((p) => `<url><loc>${cfg.siteUrl}${p}</loc><lastmod>${today}</lastmod></url>`)
    .join('\n')}\n</urlset>\n`,
);
write(`${cfg.indexNowKey}.txt`, cfg.indexNowKey);
write('urls.json', JSON.stringify(pages.map((p) => `${cfg.siteUrl}${p}`), null, 1));
console.log(`Built ${pages.length} pages into dist/`);
