"use strict";
/*
 * Home Health Agency Self-Audit - scoring model.
 * Ported from Boswell Consulting Agency's internal Python model (intelligence_engine.py).
 * Pure functions: an input object goes in, a score and recommendations come out.
 * Scoring runs in the browser. The page sends a visitor's contact details,
 * answers, and score to Boswell Consulting Agency only when the visitor
 * submits the short results form.
 *
 * Scoring basis: the numeric score (0-100) uses ONLY star rating, readmission
 * rate, patient satisfaction, and OASIS timeliness. Turnover, start-of-care
 * delay, documentation lag, and referral source do NOT change the score; they
 * only shape the recommendations. See the Methodology and Sources section in
 * index.html and README.md for the full model description.
 */

function num(value, fallback) {
  var n = parseFloat(value);
  return isFinite(n) ? n : fallback;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

/* The numeric score uses only these four inputs. */
function computeRiskModel(p) {
  var star = clamp(num(p.star_rating, 3), 1, 5);
  var readmit = clamp(num(p.readmission_rate, 15), 0, 100);
  var satisfaction = clamp(num(p.patient_satisfaction, 85), 0, 100);
  var oasis = clamp(num(p.oasis_timeliness, 90), 0, 100);

  var starRisk = (5 - star) * 15;
  var readmitRisk = readmit * 2;
  var satisfactionRisk = (100 - satisfaction) * 1.2;
  var oasisRisk = (100 - oasis) * 1.1;

  var total = Math.round(starRisk + readmitRisk + satisfactionRisk + oasisRisk);
  total = Math.min(total, 100);

  var tier = total >= 75 ? "High" : total >= 50 ? "Moderate" : "Low";

  var drivers = [
    { label: "Quality star rating gap", points: starRisk,
      detail: "Each star below 5 adds 15 points. CMS publishes star ratings on Care Compare, so referral sources can see them. The weight is the author's professional judgment." },
    { label: "Hospital readmissions", points: readmitRisk,
      detail: "Each point of readmission rate adds 2 points. In the author's professional judgment, readmissions are one of the most expensive things that can go wrong in a home health operation." },
    { label: "Patient satisfaction gap", points: satisfactionRisk,
      detail: "Each point below 100 adds 1.2 points. In the author's professional judgment, low satisfaction tends to surface first as complaints and later as lost referrals." },
    { label: "OASIS documentation timeliness gap", points: oasisRisk,
      detail: "Each point below 100 adds 1.1 points. Federal rules require OASIS assessments to be transmitted within 30 days of the assessment (42 CFR 484.45); in the author's professional judgment, late OASIS work drags on claims and cash flow." }
  ].sort(function (a, b) { return b.points - a.points; });

  return {
    risk_score: total,
    risk_tier: tier,
    drivers: drivers,
    inputs: { star: star, readmit: readmit, satisfaction: satisfaction, oasis: oasis }
  };
}

/*
 * Operational flags. These thresholds are working assumptions, not validated
 * cutoffs. They trigger targeted recommendations; they never change the score.
 */
function operationalFlags(p) {
  var flags = [];
  if (num(p.turnover_rate, 0) > 25) flags.push("turnover");
  if (num(p.soc_delay_days, 0) > 2) flags.push("soc_delay");
  if (num(p.documentation_lag_hours, 0) > 24) flags.push("doc_lag");
  return flags;
}

function generateRecommendations(p, risk, flags) {
  var recs = [];
  var readmit = num(p.readmission_rate, 0);
  var oasis = num(p.oasis_timeliness, 100);
  var satisfaction = num(p.patient_satisfaction, 100);

  if (readmit > 14) {
    recs.push({
      text: "Readmissions are running hot. Put a readmission reduction protocol in writing: 48-hour follow-up calls after every hospital discharge, a medication reconciliation checklist, and a clear escalation path when a patient declines.",
      kit: "audit"
    });
  }
  if (oasis < 92 || flags.indexOf("doc_lag") !== -1) {
    recs.push({
      text: "Documentation is lagging. Late OASIS and visit notes delay claims and hide problems until they are expensive. Set an internal documentation standard that meets your payers' requirements and your agency's own policy, then track completion by clinician every week.",
      kit: "audit"
    });
  }
  if (flags.indexOf("turnover") !== -1) {
    recs.push({
      text: "Turnover above 25 percent means hiring and training costs repeat on a loop. Benchmark your pay against local competitors and structure the first 90 days like a program, not probation: a week-one check-in, a 30-day schedule review, and consistent hours.",
      kit: "retention"
    });
  }
  if (flags.indexOf("soc_delay") !== -1) {
    recs.push({
      text: "Starts of care are taking too long. In the author's experience, every day between referral and first visit is a day a hospital discharge planner can choose a different agency. Map the intake workflow and find the step where referrals stall.",
      kit: "audit"
    });
  }
  if (satisfaction < 90) {
    recs.push({
      text: "Satisfaction below 90 is a referral problem waiting to happen. Start calling discharged clients at 7 and 30 days, log every complaint with a resolution date, and turn your happiest clients into a review and referral routine.",
      kit: "privatePay"
    });
  }
  if (risk.risk_tier === "High") {
    recs.push({
      text: "High overall risk means this needs a full operational audit, not one-off fixes. Work through intake, staffing, documentation, and billing in order and fix the biggest driver first.",
      kit: "audit"
    });
  }
  var referral = (p.referral_source || "").toLowerCase();
  if (referral === "few" || referral === "word") {
    recs.push({
      text: "Your client pipeline depends on luck. Build one repeatable referral channel: pick ten local referral sources, visit them on a schedule, and track every referral to its source so you know what works.",
      kit: "privatePay"
    });
  }
  if (!recs.length) {
    recs.push({
      text: "Nothing is flashing red. Keep the weekly habits that got you here: watch readmissions, documentation turnaround, and turnover every single week, because drift is how good agencies slide.",
      kit: null
    });
  }
  return recs;
}

function buildSummary(risk, recs) {
  var lines = [];
  lines.push("Risk level: " + risk.risk_tier + " (" + risk.risk_score + " out of 100).");
  lines.push("Score uses questions 1-4 only; questions 5-8 shape the recommendations, not the score.");
  lines.push("Top drivers: " + risk.drivers.slice(0, 3).map(function (d) {
    return d.label + " (" + Math.round(d.points) + " pts)";
  }).join(", ") + ".");
  lines.push(recs.length + (recs.length === 1 ? " recommended action." : " recommended actions."));
  return lines.join(" ");
}

// Sample agency used by the "Load sample agency" button, the demo video, and the tests.
var SAMPLE_AGENCY = {
  star_rating: 3.5,
  readmission_rate: 16,
  patient_satisfaction: 84,
  oasis_timeliness: 88,
  turnover_rate: 40,
  soc_delay_days: 3,
  documentation_lag_hours: 30,
  referral_source: "word"
};

/*
 * Non-medical home care track (added in the capture release).
 * Same structure as the certified model: the numeric score (0-100) uses ONLY
 * turnover, unfilled shifts, EVV/documentation exceptions, and delivered
 * hours. Speed to first visit, supervisory visits, care plan reviews, and
 * referral source do NOT change the score; they only shape recommendations.
 * Weights are working assumptions from the author's professional judgment.
 */
function computeRiskModelNM(p) {
  var turnover = clamp(num(p.nm_turnover_rate, 40), 0, 200);
  var unfilled = clamp(num(p.nm_unfilled_rate, 5), 0, 100);
  var evv = clamp(num(p.nm_evv_rate, 8), 0, 100);
  var delivered = clamp(num(p.nm_utilization_rate, 90), 0, 100);

  var turnoverRisk = turnover * 0.4;
  var unfilledRisk = unfilled * 1.5;
  var evvRisk = evv * 1.2;
  var missedRisk = (100 - delivered) * 0.7;

  var total = Math.round(turnoverRisk + unfilledRisk + evvRisk + missedRisk);
  total = Math.min(total, 100);
  var tier = total >= 75 ? "High" : total >= 50 ? "Moderate" : "Low";

  var drivers = [
    { label: "Caregiver turnover", points: turnoverRisk,
      detail: "Each point of turnover adds 0.4 points. In the author's professional judgment, turnover is the most expensive recurring problem in non-medical home care: every exit repeats recruiting, onboarding, and training cost, and puts scheduled shifts at risk." },
    { label: "Unfilled shifts", points: unfilledRisk,
      detail: "Each point adds 1.5 points. An unfilled shift is missed care and missed revenue, and a family that gets stood up starts calling other agencies." },
    { label: "EVV and documentation exceptions", points: evvRisk,
      detail: "Each point adds 1.2 points. For Medicaid-funded personal care, federal law requires electronic visit verification capturing the service performed, the individual receiving it, the date, the location, the caregiver, and the start and end times (Section 12006 of the 21st Century Cures Act). Exceptions are where audits, payment holds, and corrective action plans start." },
    { label: "Authorized hours not delivered", points: missedRisk,
      detail: "Each point of authorized hours not delivered adds 0.7 points. Hours you won authorization for and did not staff are revenue you already earned on paper and gave back." }
  ].sort(function (a, b) { return b.points - a.points; });

  return {
    risk_score: total,
    risk_tier: tier,
    drivers: drivers,
    inputs: { turnover: turnover, unfilled: unfilled, evv: evv, delivered: delivered }
  };
}

function operationalFlagsNM(p) {
  var flags = [];
  if (num(p.nm_soc_delay_days, 0) > 2) flags.push("soc_delay");
  if ((p.nm_supervisory || "yes") !== "yes") flags.push("supervisory");
  if ((p.nm_careplan || "yes") !== "yes") flags.push("careplan");
  return flags;
}

function generateRecommendationsNM(p, risk, flags) {
  var recs = [];
  var turnover = num(p.nm_turnover_rate, 0);
  var unfilled = num(p.nm_unfilled_rate, 0);
  var evv = num(p.nm_evv_rate, 0);
  var delivered = num(p.nm_utilization_rate, 100);

  if (turnover > 40) {
    recs.push({
      text: "Turnover above 40 percent means hiring and training costs repeat on a loop. Benchmark your caregiver pay against local competitors and structure the first 90 days like a program, not probation: a week-one check-in, a 30-day schedule review, and consistent hours.",
      kit: "retention"
    });
  }
  if (unfilled > 5) {
    recs.push({
      text: "More than 1 in 20 shifts is going unfilled. Keep a live bench of backup caregivers for every area you serve, confirm every shift the day before, and track unfilled shifts by client and by caregiver every week so the pattern shows itself.",
      kit: "audit"
    });
  }
  if (evv > 10) {
    recs.push({
      text: "EVV and documentation exceptions above 10 percent are an audit finding waiting to happen. Review exceptions daily, fix them while the visit is still fresh, and make one person own the exception queue instead of letting it sit.",
      kit: "audit"
    });
  }
  if (delivered < 90) {
    recs.push({
      text: "You are delivering less than 90 percent of the hours you are authorized or scheduled for. That is won business leaking out through scheduling. Match caregiver availability to authorized hours before you take on new clients, and review the gap every week.",
      kit: "audit"
    });
  }
  if (flags.indexOf("soc_delay") !== -1) {
    recs.push({
      text: "New clients wait too long for a first visit. In the author's experience, every day between yes and the first visit is a day the family can call the next agency on the list. Map the intake steps and find where new clients stall.",
      kit: "privatePay"
    });
  }
  if (flags.indexOf("supervisory") !== -1) {
    recs.push({
      text: "Supervisory visits are slipping. Put them on a fixed cadence for every client, document every visit, and review the schedule monthly. Surveyors and families both read a missed supervisory visit as an agency that is not watching its own care.",
      kit: "audit"
    });
  }
  if (flags.indexOf("careplan") !== -1) {
    recs.push({
      text: "Care plans are going stale. Set a 90-day review rhythm for every active client, document changes in condition the day you hear about them, and keep the signed plan where a surveyor can pull it in one step.",
      kit: "audit"
    });
  }
  if (risk.risk_tier === "High") {
    recs.push({
      text: "High overall risk means this needs a full operational audit, not one-off fixes. Work through intake, staffing, documentation, and scheduling in order and fix the biggest driver first.",
      kit: "audit"
    });
  }
  var referral = (p.nm_referral_source || "").toLowerCase();
  if (referral === "few" || referral === "word") {
    recs.push({
      text: "Your client pipeline depends on luck. Build one repeatable referral channel: pick ten local referral sources, visit them on a schedule, and track every referral to its source so you know what works.",
      kit: "privatePay"
    });
  }
  if (!recs.length) {
    recs.push({
      text: "Nothing is flashing red. Keep the weekly habits that got you here: watch turnover, unfilled shifts, and EVV exceptions every single week, because drift is how good agencies slide.",
      kit: null
    });
  }
  return recs;
}

// Sample non-medical agency used by the "Load sample agency" button on that track.
var SAMPLE_AGENCY_NM = {
  nm_turnover_rate: 55,
  nm_unfilled_rate: 12,
  nm_evv_rate: 18,
  nm_utilization_rate: 78,
  nm_soc_delay_days: 4,
  nm_supervisory: "sometimes",
  nm_careplan: "sometimes",
  nm_referral_source: "word"
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = { computeRiskModel: computeRiskModel, operationalFlags: operationalFlags,
    generateRecommendations: generateRecommendations, buildSummary: buildSummary,
    SAMPLE_AGENCY: SAMPLE_AGENCY,
    computeRiskModelNM: computeRiskModelNM, operationalFlagsNM: operationalFlagsNM,
    generateRecommendationsNM: generateRecommendationsNM, SAMPLE_AGENCY_NM: SAMPLE_AGENCY_NM };
}
