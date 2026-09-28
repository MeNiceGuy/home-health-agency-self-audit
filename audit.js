"use strict";
/*
 * Home Health Agency Self-Audit - scoring model.
 * Ported from Boswell Consulting Group's internal Python model (intelligence_engine.py).
 * Pure functions: an input object goes in, a score and recommendations come out.
 * Everything runs in the browser. No data is uploaded or stored anywhere.
 */

var KITS = {
  audit: {
    name: "Operations Audit Toolkit",
    price: "$39",
    url: "https://drboswell.gumroad.com/l/operations-audit-toolkit",
    blurb: "Excel workbook plus playbook that walks you through a full operational audit, step by step."
  },
  retention: {
    name: "Caregiver Pay & Retention Playbook",
    price: "$29",
    url: "https://drboswell.gumroad.com/l/caregiver-pay-retention-playbook",
    blurb: "Pay benchmarking, retention math, and the first-90-days onboarding structure that keeps new hires."
  },
  privatePay: {
    name: "Private-Pay Client Playbook",
    price: "$39",
    url: "https://drboswell.gumroad.com/l/private-pay-client-playbook",
    blurb: "Where private-pay clients actually come from, plus a referral pipeline tracker."
  }
};

function num(value, fallback) {
  var n = parseFloat(value);
  return isFinite(n) ? n : fallback;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

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
  var paymentImpact = Math.round((total / 100) * -5 * 100) / 100;

  var drivers = [
    { label: "Quality star rating gap", points: starRisk,
      detail: "Each star below 5 adds 15 points. Star ratings drive referrals and payer attention." },
    { label: "Hospital readmissions", points: readmitRisk,
      detail: "Each point of readmission rate adds 2 points. Readmissions are the costliest failure in home health." },
    { label: "Patient satisfaction gap", points: satisfactionRisk,
      detail: "Each point below 100 adds 1.2 points. Low satisfaction shows up as complaints, then as lost referrals." },
    { label: "OASIS documentation timeliness gap", points: oasisRisk,
      detail: "Each point below 100 adds 1.1 points. Late OASIS means late claims and cash flow drag." }
  ].sort(function (a, b) { return b.points - a.points; });

  return {
    risk_score: total,
    risk_tier: tier,
    payment_impact_pct: paymentImpact,
    drivers: drivers,
    inputs: { star: star, readmit: readmit, satisfaction: satisfaction, oasis: oasis }
  };
}

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
      text: "Documentation is lagging. Late OASIS and visit notes delay claims and hide problems until they are expensive. Set a 24-hour documentation rule and track completion by clinician every week.",
      kit: "audit"
    });
  }
  if (flags.indexOf("turnover") !== -1) {
    recs.push({
      text: "Turnover above 25 percent means you are paying the full hiring cost over and over. Benchmark your pay against local competitors and structure the first 90 days like a program, not probation: a week-one check-in, a 30-day schedule review, and consistent hours.",
      kit: "retention"
    });
  }
  if (flags.indexOf("soc_delay") !== -1) {
    recs.push({
      text: "Starts of care are taking too long. Every day between referral and first visit is a day a hospital discharge planner can send the patient somewhere else. Map the intake workflow and find the step where referrals stall.",
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
  lines.push("Estimated reimbursement impact: " + risk.payment_impact_pct + " percent.");
  lines.push("Top drivers: " + risk.drivers.slice(0, 3).map(function (d) {
    return d.label + " (" + Math.round(d.points) + " pts)";
  }).join(", ") + ".");
  lines.push(recs.length + (recs.length === 1 ? " recommended action." : " recommended actions."));
  return lines.join(" ");
}

// Sample agency used by the "Load sample agency" button and the demo video.
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

if (typeof module !== "undefined" && module.exports) {
  module.exports = { computeRiskModel: computeRiskModel, operationalFlags: operationalFlags,
    generateRecommendations: generateRecommendations, buildSummary: buildSummary,
    SAMPLE_AGENCY: SAMPLE_AGENCY, KITS: KITS };
}
