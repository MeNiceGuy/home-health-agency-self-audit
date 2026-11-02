# Held-Paycheck Exposure Calculator

A free tool from Boswell Consulting Agency for home care and home health agency owners: what one held or late paycheck can actually cost under federal wage law and the owner's state wage payment law, priced from the owner's own scenario.

Live at: https://boswellconsultingagency.com/home-health-agency-self-audit/held-paycheck-exposure-calculator/

Deployment note: the tool ships inside the home-health-agency-self-audit repository as a subfolder, because the GitHub integration cannot create new repositories (403 on Nov 1, 2026). If a standalone repo named held-paycheck-exposure-calculator is created later, the same files move over unchanged and the address shortens.

## How it works

Results first: the owner enters six figures (caregiver hourly rate, hours worked in the unpaid period, paydays the pay was late or held, caregivers affected the same way, which law to price, and weeks until the pay is fixed), presses the button, and the exposure shows on the page immediately. No email is required to see the number. An optional form after the result offers the detailed breakdown by email.

The owner picks one of three laws:
- Federal only: unpaid wages plus liquidated damages of an equal amount under 29 USC 216(b). One employee can sue for all similarly situated employees under the same section, which is why the caregivers-affected input multiplies the total.
- South Carolina: up to three times the unpaid wages under S.C. Code 41-10-80(C) (treble, discretionary with the court, always labeled a maximum), plus a $100 civil penalty for each failed payday under 41-10-80(B), plus a clearly labeled projection if the pay stays unfixed on a weekly pay cycle.
- New York: unpaid wages plus 100 percent liquidated damages under Labor Law 198(1-a), plus prejudgment interest estimated at 9 percent per year under CPLR 5004 over the weeks until the pay is fixed. The page carries one honest line on the 2025 amendment that softened liquidated damages for first-time late-pay frequency cases where wages were eventually paid in full.

Attorney fees and court costs are called out on the page as added by the court and never estimated, so every total reads as a floor. The payroll reserve point is framed as sound practice, never as a legal requirement. The presentation of the model is Dr. Devon Boswell's professional judgment; every legal figure is statute-cited on the page with a link to the primary source.

## Worked reference case

40 hours at $15 an hour is $600 of unpaid wages.
- Federal: $1,200 with liquidated damages.
- South Carolina maximum: $1,800 treble plus one $100 payday penalty is $1,900, before attorney fees.

The test suite reproduces both numbers exactly.

## Sources (checked November 1, 2026)

- 29 USC 216(b), liquidated damages and collective actions: https://www.law.cornell.edu/uscode/text/29/216
- 29 CFR Part 516, employer time-record duty: https://www.law.cornell.edu/cfr/text/29/part-516
- S.C. Code 41-10-80, treble recovery and $100 per-payday penalty: https://www.scstatehouse.gov/code/t41c010.php
- New York Labor Law 198(1-a), 191(1)(a), and 193: https://www.nysenate.gov/legislation/laws/LAB/198, /191, /193
- CPLR 5004, 9 percent prejudgment interest: https://www.nysenate.gov/legislation/laws/CVP/5004

## Capture

The optional form after the result (name, email, state, agency type) posts to the same FormSubmit endpoint as the Home Health Agency Self-Audit and the Caregiver Turnover Cost Calculator, and lands in the Boswell Consulting Agency inbox with the scenario inputs and the full computed breakdown. The page promises the information is never sold, and nothing is sold on the page itself.

## Run it locally

Open index.html in a browser, or serve the folder with any static server. The math lives in calc.js and is shared with the test suite.

## Run the tests

    node tests/run-tests.js

## Files

- index.html - the page, scenario form, results, methodology and sources, optional breakdown form, and inline wiring.
- calc.js - the exposure model (pure functions, no DOM).
- tests/run-tests.js - model math checks (including the worked reference case), page wiring checks, and no-pitch and no-dash scans.
