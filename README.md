# Home Health Agency Self-Audit

A free, open-source operational health check for home health agency owners. Answer 8 questions, get a risk score from 0 to 100, your three biggest problem areas, and plain-language recommended actions.

**Live demo:** enable GitHub Pages on this repo (Settings > Pages > Deploy from branch > main) and it runs at `https://<username>.github.io/home-health-agency-self-audit/`.

## Watch the demo

[![Watch the 3 minute 41 second demo](https://img.youtube.com/vi/zzipY27IaWw/hqdefault.jpg)](https://www.youtube.com/watch?v=zzipY27IaWw)

A 3 minute 41 second walkthrough of the tool: the 8 questions, the score, and how to read your results.

## Why this exists

In the author's professional observation, most agencies find out they have an operations problem when it is already expensive: a star rating drops, readmissions spike, or caregivers quit in numbers that hurt. This tool gives owners a fast, honest read on where they stand before that happens.

## How the score works

**The numeric score (0 to 100) uses only four inputs.** The other four questions shape your recommendations but never change your score.

| Input | Weight |
|---|---|
| Quality star rating gap (each star below 5) | 15 pts |
| Hospital readmission rate (each point) | 2 pts |
| Patient satisfaction gap (each point below 100) | 1.2 pts |
| OASIS timeliness gap (each point below 100) | 1.1 pts |

Score bands: under 50 is Low risk, 50 to 74 is Moderate, 75 and up is High.

Questions 5 to 8 (turnover, start-of-care delay, documentation lag, referral source) trigger targeted recommendations only. Their thresholds are working assumptions, not validated cutoffs: turnover above 25 percent, start-of-care delay over 2 days, documentation lag over 24 hours, OASIS timeliness below 92 percent, readmission rate above 14 percent, satisfaction below 90 percent.

**Honest note:** the weights and thresholds are a working model based on the professional judgment of Dr. Devon Boswell of Boswell Consulting Group. This tool does not draw on his doctoral research. This is not a CMS-validated instrument, and it is not clinical, legal, or financial advice. See Methodology and Sources below.

## Methodology and Sources

**Inputs.** Eight self-reported numbers: CMS Quality of Patient Care star rating, 30-day hospital readmission rate, patient satisfaction score, OASIS on-time rate, annual caregiver turnover, average days from referral to start of care, average hours from visit to signed documentation, and primary referral source. Nothing is verified against any external dataset.

**Weights.** Star gap 15, readmission 2, satisfaction gap 1.2, OASIS gap 1.1. Points are summed, rounded to a whole number, and capped at 100.

**What the score does and does not mean.** It gives a structured read on your own numbers and flags the biggest drivers. It does not benchmark you against other agencies, predict revenue or reimbursement, diagnose compliance problems, or replace an operational audit. Correlation is not causation.

**Medicare-certified measures vs. home care links.** The four scored inputs are Medicare-certified home health measures (CMS star ratings, HHCAHPS satisfaction, OASIS). Two of the linked toolkits, the Caregiver Pay and Retention Playbook and the Private-Pay Client Playbook, are written for non-medical home care (caregiver teams and private-pay clients). Each link states its scope so the two worlds are never confused.

**Limits.** All inputs are self-reported. The model is not validated research. Not clinical, legal, or financial advice.

**Sources.**
- Federal rules require OASIS assessments to be transmitted within 30 days of the assessment (42 CFR 484.45).
- CMS publishes Quality of Patient Care Star Ratings for home health agencies on Care Compare.
- Everything else, including every weight, threshold, and interpretation, is the author's professional judgment. No national benchmarks, no CMS datasets, and no third-party studies are used.

## Privacy

Everything runs in the browser. Your answers are never uploaded, stored, or shared. There is no backend, no account, and no tracking. The one exception: the optional "Want your results by email?" box opens Substack in a new tab so you can subscribe there. Substack handles the signup; this tool does not send, store, or see your email address.

## Run it locally

No build step. Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8000
```

## Run the tests

Node only, no dependencies:

```bash
node tests/run-tests.js
```

The tests exercise the scoring math at its boundaries, confirm the non-scored questions never change the score, run a realistic sample agency, and check the pages for banned claims and required disclosures.

## Files

- `index.html` - the tool (form, results, methodology section, print stylesheet)
- `audit.js` - the scoring model, portable to Node (`require("./audit.js")`)
- `tests/run-tests.js` - boundary tests and a sample-agency test
- `LICENSE` - MIT license
- `SCOPE.md` - the original build scope
- `video/` - demo videos and the articles that announced the tool

## The paid toolkits behind the recommendations

Each recommendation links to the matching paid toolkit on Gumroad, where the full fix lives:

- [Operations Audit Toolkit](https://drboswell.gumroad.com/l/operations-audit-toolkit) ($39) - the full step-by-step operational audit
- [Caregiver Pay & Retention Playbook](https://drboswell.gumroad.com/l/caregiver-pay-retention-playbook) ($29) - pay benchmarking and first-90-days retention
- [Private-Pay Client Playbook](https://drboswell.gumroad.com/l/private-pay-client-playbook) ($39) - referral pipeline and private-pay growth

## License

MIT. See [LICENSE](LICENSE). Copyright (c) 2026 Devon Boswell / Boswell Consulting Group. Use it, fork it, adapt it. Attribution appreciated but not required.
