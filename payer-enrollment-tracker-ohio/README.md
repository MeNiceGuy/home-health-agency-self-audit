# Ohio Medicaid Payer Enrollment and Contracting Tracker

A free tool from Boswell Consulting Agency for Ohio Medicaid providers: the two doors, in order. Door 1 is Ohio Department of Medicaid (ODM) enrollment in the Provider Network Management (PNM) module. Door 2 is credentialing and contracting with each of the seven Ohio Medicaid managed care plans separately, because enrollment is not network participation. OhioRISE, run by Aetna Better Health of Ohio, is a separate door again for providers who serve youth with complex behavioral health needs.

Live at: https://boswellconsultingagency.com/home-health-agency-self-audit/payer-enrollment-tracker-ohio/

Deployment note: the tool ships inside the home-health-agency-self-audit repository as a subfolder, because the GitHub integration cannot create new repositories (403 on Nov 1, 2026). If a standalone repo is created later, the same files move over unchanged and the address shortens.

## How it works

Content first: the full tracker shows on the page immediately, with no form in front of it. Twenty-one checkboxes walk the provider through preparation, Door 1, two steps per plan (request sent, contracting finished), and OhioRISE. Checks persist in the visitor's own browser through localStorage (key ohioPayerTracker.v1), so the tracker works as a tracker across visits on the same device. No account, and no server storage of progress. An optional form after the content offers a printable copy of the checklist by email, carrying the visitor's progress exactly as marked.

## The two doors, as verified on November 1, 2026

Door 1, ODM enrollment in PNM:
- Sign in with an OH|ID at the PNM portal. PNM is ODM's single point for provider enrollment, centralized credentialing, and provider self-service updates.
- Support: Ohio Medicaid Integrated Helpdesk (IHD), 1-800-686-1516, IHD@medicaid.ohio.gov, Monday through Friday 8 a.m. to 4:30 p.m. Eastern (provider enrollment prompts: option 2, then option 2).
- Moratorium: effective May 14, 2026 through November 14, 2026, under 42 CFR 455.470, ODM is not accepting new enrollment applications for PNM provider types 16, 25, 26, 38, 44, 45, 55, and 60. Applications for those types submitted before May 14, 2026 but not yet processed will be denied; those applicants may reapply when the moratorium ends. Already enrolled providers of these types keep operating, demographic changes and revalidations still process, and no new service locations are added during the pause. Behavioral health provider types are not on ODM's list and are not frozen. The notice is posted on the PNM portal sign-in page itself and restated in ODM's May/June 2026 EVV newsletter.

Door 2, one door per plan (each contracts separately):
- AmeriHealth Caritas Ohio: Provider Contract Inquiry Form plus W-9 to ProviderRecruitmentOH@amerihealthcaritas.com, or Provider Recruitment 1-833-296-2259. The plan's join page said on the check date that its panel is closed except for behavioral health CANS providers and vision exam providers, with other types told to check back in six months.
- Anthem Blue Cross and Blue Shield: anthem.com/oh/provider, Our Network, prompts by provider type. Anthem requires state enrollment and credentialing with an active Ohio Medicaid number before contracting. Ohio Medicaid questions: OhioMedicaidProvider@anthem.com.
- Buckeye Health Plan: Become a Provider page, join our network forms by type (Waiver-Only, Individual or Solo, Facility or Agency, Group). The page said on the check date that network expansion is limited and requests are evaluated by provider type, specialty, and geographic need.
- CareSource: New Health Partner Contract Form; credentialing stays with ODM centralized credentialing. Behavioral health contracting keys on ODM and OhioMHAS specialty 84 (Mental Health) and 95 (Substance Use Disorder), and needs IRS name, tax ID, specialty NPIs, W-9, and a rendering provider roster. Completion is marked by the welcome letter with the CareSource ID. Provider Services 1-800-488-0134.
- Humana Healthy Horizons in Ohio: Join Our Network participation request, separate routes for medical and behavioral health. Contracting contacts in Humana's Ohio provider manual: OhioNetworkSpecialist@humana.com (medical), OHBHMedicaid@humana.com (behavioral health).
- Molina Healthcare of Ohio: Ohio Provider Contract Request Form to OHContractRequests@MolinaHealthcare.com. Molina requires active ODM enrollment with an active Medicaid ID for each billing NPI first, under 42 CFR 438.602.
- UnitedHealthcare Community Plan of Ohio: Join Our Network application at UHCprovider.com, three phases starting with the application. Ohio credentialing and attestation run through ODM. Behavioral health practitioners route through Optum Behavioral Health Solutions (providerexpress.com).

OhioRISE: Aetna Better Health of Ohio, its own network and contract. Aetna's Ohio Join Our Network page is the entry point; the OhioRISE network application packet is requested and returned through OHRISE-Network@aetna.com. An active Medicaid ID is required first.

Honest framing carried on the page: a plan's contracting door being open does not guarantee its panel is accepting every specialty in every county. The advice to get any denial reason in writing, specified by specialty, county, and scope, with a reopen date, and to file all seven plans in parallel, is labeled on the page as Dr. Boswell's professional judgment, not a plan rule.

## Capture

The optional form after the content (name, email, state, agency type) posts to the same FormSubmit endpoint as the Home Health Agency Self-Audit, the Caregiver Turnover Cost Calculator, and the Client Acquisition and Census Gap Calculator, and lands in the Boswell Consulting Agency inbox with the visitor's Door 1 status, per-plan status, and the full marked checklist. The page promises the information is never sold, and nothing is sold on the page itself. Note: the live capture POST for this page has not been test-submitted; Devon has not ordered a live test for this page. The wiring is identical to the three proven sibling tools and is asserted in the test suite.

## Run it locally

Open index.html in a browser, or serve the folder with any static server. The checklist logic lives in tracker.js and is shared with the test suite.

## Run the tests

    node tests/run-tests.js

## Files

- index.html - the page: tracker content, checklists, plan doors with source lines, optional checklist form, and inline wiring.
- tracker.js - the checklist model (items, localStorage load and save, progress, per-plan status, capture summary text). Pure functions, no DOM.
- tests/run-tests.js - checklist logic checks, page wiring checks, source and fact checks, and no-pitch and no-dash scans.
