# Client Acquisition and Census Gap Calculator

A free tool from Boswell Consulting Agency for home care and home health agency owners: how many new clients the agency must sign every month just to hold its census, how many more to reach a target census, the inquiries or referrals behind those signings, and what the census gap is worth in revenue. Getting clients is the problem owners in Dr. Boswell's own group named first (14 of 47 intake answers, October 29 to November 1, 2026), and the November 2026 market benchmark found no good free tool for this math.

Live at: https://boswellconsultingagency.com/home-health-agency-self-audit/census-gap-calculator/

Deployment note: the tool ships inside the home-health-agency-self-audit repository as a subfolder, because the GitHub integration cannot create new repositories (403 on Nov 1, 2026). If a standalone repo named census-gap-calculator is created later, the same files move over unchanged and the address shortens.

## How it works

Results first: the owner enters eight figures (active clients today, target clients, average billable hours per client per week, average hourly rate, average client length of stay in months, inquiry to client close rate, months to reach the target, and an optional monthly marketing spend), presses the button, and the census math shows on the page immediately. No email is required to see the numbers. An optional form after the result offers the detailed breakdown by email.

The model, step by step:
- Clients lost per month = current clients / average length of stay in months. At any census, clients leave at a steady drip set by how long they stay.
- New clients needed to HOLD = the loss number. Growth never starts until the drip is replaced.
- New clients needed for GROWTH = (target clients - current clients) / months to reach the target.
- Total new clients needed per month = hold + growth. Multiplied by the months, it gives the total signings the plan requires.
- Inquiries or referrals needed per month = total new clients per month / close rate. Owners market for inquiries; intake turns them into clients.
- Monthly revenue gap = (target - current) x hours per week x hourly rate x 52/12. Annualized is twelve times that.
- With a marketing spend entered: cost per acquired client = spend / new clients needed per month, and a plain line comparing it to one client's monthly billed revenue.

Every input is the owner's own number and every output is arithmetic on those inputs. There are no outside statistics in this tool, nothing external to cite, and the formulas print with the result so the owner can check each step by hand. The framing, including the replacement number and the reading of the close rate, is Dr. Devon Boswell's professional judgment, labeled as such on the page. A target below today's census prices no growth and no revenue gap, and the page says so.

## Worked reference case

50 current clients, 24 month average stay, target 65 clients in 6 months, 20 billable hours per client per week, $32 an hour, 25 percent close rate:
- Lost per month: 50 / 24 = about 2.1
- Hold: about 2.1 new clients a month
- Growth: (65 - 50) / 6 = 2.5 a month
- Total: about 4.6 new clients a month, 27.5 over the 6 months
- Inquiries: 4.58 / 0.25 = about 18.3 a month
- Monthly revenue gap: (65 - 50) x 20 x $32 x 52/12 = $41,600 a month, $499,200 a year
- Billed revenue from one client: about $2,773 a month, about $66,560 across a 24 month stay

The test suite reproduces every one of these numbers from the formulas above.

## Capture

The optional form after the result (name, email, state, agency type) posts to the same FormSubmit endpoint as the Home Health Agency Self-Audit and the Caregiver Turnover Cost Calculator, and lands in the Boswell Consulting Agency inbox with the owner's inputs and the full computed breakdown. The page promises the information is never sold, and nothing is sold on the page itself. Note: the live capture POST for this page has not been test-submitted; the wiring is identical to the two proven tools and is asserted in the test suite.

## Run it locally

Open index.html in a browser, or serve the folder with any static server. The math lives in calc.js and is shared with the test suite.

## Run the tests

    node tests/run-tests.js

## Files

- index.html - the page, inputs form, results, methodology, optional breakdown form, and inline wiring.
- calc.js - the census model (pure functions, no DOM).
- tests/run-tests.js - model math checks (including the worked reference case), division guard checks, page wiring checks, and no-pitch and no-dash scans.
