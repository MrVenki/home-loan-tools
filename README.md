# HomeLoan Tools India

Static site of home loan calculators: 77 pages (EMI and eligibility calculators, plus EMI tables for 12 loan amounts × 5 tenures). Pure math, no scraped data, free hosting on GitHub Pages.

```bash
npm test          # EMI formula checks
npm run build     # writes dist/
```

## How it earns
Every page has a call-back form. Submissions go to the Cloudflare worker's `/lead` endpoint (in the `DealAgents` repo, `worker/redirect.js`), which stores the lead, rate-limits by IP, requires consent, and sends you a Telegram alert. Leads are then passed to a lender or loan advisor network that pays per lead.

## One-time setup
1. Set `contactEmail` in `config.json` (shown in the privacy policy; required for a real consent flow).
2. Redeploy the worker so it has `/lead`: `cd DealAgents/worker && npx wrangler deploy`.
3. Give the worker the alert secrets: `npx wrangler secret put TELEGRAM_BOT_TOKEN` and `npx wrangler secret put TELEGRAM_CHAT_ID` (use the same values as the DealAgents repo).
4. Push this repo to GitHub, then Settings → Pages → Source: GitHub Actions. Each push builds, tests, deploys and pings IndexNow.
5. Add the site in Google Search Console and submit `sitemap.xml`.
6. Sign up with a lead network or lender partner program, and only sell leads where the consent text allows it.

## Notes
- Rates shown are illustrative, not lender offers. Do not present them as current bank rates.
- Phase 2 (needs verified data): stamp duty and registration pages by state and city.
