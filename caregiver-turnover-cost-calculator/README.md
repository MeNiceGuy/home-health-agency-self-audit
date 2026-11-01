# Caregiver Turnover Cost Calculator

A free tool from Boswell Consulting Agency for home care and home health agency owners: what caregiver turnover actually cost your agency this year, priced from your own numbers.

Live at: https://boswellconsultingagency.com/home-health-agency-self-audit/caregiver-turnover-cost-calculator/

Deployment note: the tool ships inside the home-health-agency-self-audit repository as a subfolder, because the GitHub integration cannot create new repositories (403 on Nov 1, 2026). If a standalone repo named caregiver-turnover-cost-calculator is created later, the same files move over unchanged and the address shortens to /caregiver-turnover-cost-calculator/.

## How it works

The owner enters ten figures: caregivers on staff, caregivers who left in the last 12 months, caregiver pay, bill rate, weekly hours per caregiver, weeks a departed caregiver's hours sit uncovered, paid training hours per hire, recruiting and screening cost per hire, the hiring time of the owner or administrator, and what that time is worth per hour.

The model prices each departure three ways, then multiplies by the number who left:

- Replacement cost: recruiting and screening, plus training hours times caregiver pay, plus hiring hours times the hiring person's pay.
- Lost margin while uncovered: vacancy weeks times weekly hours times (bill rate minus caregiver pay).
- Annual cost: departures times (replacement cost plus lost margin). The page also shows the monthly cost, the cost per departure, the turnover rate, and the annual cost as a share of total billings.

The cost structure is Dr. Devon Boswell's professional judgment from consulting work with agency owners, and the page labels it that way. Every input is owner-entered and editable, including the sample recruiting figure, which the page calls an editable estimate rather than a standard.

## Sources

- Industry comparison: caregiver turnover averaged 75 percent in 2024 (Activated Insights benchmarking). It is the only outside figure in the model.
- All other figures come from the owner filling in the form, and each input on the page says where to find the number (payroll, scheduling reports, personnel files).

## Capture

The result is gated behind a short form (name, email, state, agency type). Submissions post to the same FormSubmit endpoint as the Home Health Agency Self-Audit and land in the Boswell Consulting Agency inbox with every input and the full computed breakdown. The page promises the information is never sold, and nothing is sold on the page itself. Follow-up happens by email; turnover leads match the retention follow-up draft kept with the self-audit tool.

## Run it locally

Open index.html in a browser, or serve the folder with any static server. The math lives in calc.js and is shared with the test suite.

## Run the tests

    node tests/run-tests.js

## Files

- index.html - the page, capture form, results, methodology, and inline wiring.
- calc.js - the turnover cost model (pure functions, no DOM).
- tests/run-tests.js - model math checks plus page wiring and no-pitch checks.
