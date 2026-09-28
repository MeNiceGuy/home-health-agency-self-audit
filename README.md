# Home Health Agency Self-Audit

A free, open-source operational health check for home health agency owners. Answer 8 questions, get a risk score from 0 to 100, your three biggest problem areas, and plain-language recommended actions.

**Live demo:** enable GitHub Pages on this repo (Settings > Pages > Deploy from branch > main) and it runs at `https://<username>.github.io/home-health-agency-self-audit/`.

## Why this exists

Most agencies find out they have an operations problem when it is already expensive: a star rating drops, readmissions spike, or half the caregivers quit. This tool gives owners a fast, honest read on where they stand before that happens.

## How the score works

Four inputs feed a weighted model (maximum 100 points, higher is worse):

| Input | Weight |
|---|---|
| Quality star rating gap (each star below 5) | 15 pts |
| Hospital readmission rate (each point) | 2 pts |
| Patient satisfaction gap (each point below 100) | 1.2 pts |
| OASIS timeliness gap (each point below 100) | 1.1 pts |

Score bands: under 50 is Low risk, 50 to 74 is Moderate, 75 and up is High. Three more operational flags (turnover above 25 percent, start-of-care delay over 2 days, documentation lag over 24 hours) trigger targeted recommendations.

**Honest note:** the weights are a working model based on the professional judgment of Dr. Devon Boswell of Boswell Consulting Group. This is not a CMS-validated instrument, and it is not clinical, legal, or financial advice.

## Privacy

Everything runs in the browser. Your answers are never uploaded, stored, or shared. There is no backend, no account, and no tracking.

## Run it locally

No build step. Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8000
```

## Files

- `index.html` - the tool (form, results, print stylesheet)
- `audit.js` - the scoring model, portable to Node (`require("./audit.js")`)
- `SCOPE.md` - the original build scope

## The paid toolkits behind the recommendations

Each recommendation links to the matching paid toolkit on Gumroad, where the full fix lives:

- [Operations Audit Toolkit](https://drboswell.gumroad.com/l/operations-audit-toolkit) ($39) - the full step-by-step operational audit
- [Caregiver Pay & Retention Playbook](https://drboswell.gumroad.com/l/caregiver-pay-retention-playbook) ($29) - pay benchmarking and first-90-days retention
- [Private-Pay Client Playbook](https://drboswell.gumroad.com/l/private-pay-client-playbook) ($39) - referral pipeline and private-pay growth

## License

MIT. Use it, fork it, adapt it. Attribution appreciated but not required.
