"use strict";
/*
 * Held-Paycheck Exposure Calculator
 * Pure math for the wage exposure model, shared by the page and the tests.
 * Every legal figure below was verified against primary sources on
 * November 1, 2026. The model structure is Dr. Boswell's professional
 * judgment, labeled as such on the page.
 *
 * Federal (FLSA): unpaid wages plus liquidated damages of an equal amount
 * under 29 USC 216(b). One employee may sue for all similarly situated
 * employees (216(b) collective action). Attorney fees and costs are added
 * by the court and are NOT estimated here.
 *
 * South Carolina (Payment of Wages Act): S.C. Code 41-10-80(C) allows up
 * to three times the unpaid wages (treble, at the court's discretion)
 * plus costs and attorney's fees. 41-10-80(B) adds a civil penalty of
 * $100 for each payday failure.
 *
 * New York (Labor Law): unpaid wages plus 100 percent liquidated damages
 * under section 198(1-a), plus attorney fees and prejudgment interest.
 * Interest is estimated at 9 percent per year (CPLR 5004) over the weeks
 * until the pay is fixed, and is labeled an estimate wherever it appears.
 */

var SC_PENALTY_PER_PAYDAY = 100; // S.C. Code 41-10-80(B)
var NY_INTEREST_RATE_PER_YEAR = 0.09; // CPLR 5004 prejudgment interest

function num(v) {
  var n = typeof v === "number" ? v : parseFloat(String(v).replace(/[^0-9.\-]/g, ""));
  return isFinite(n) && n > 0 ? n : 0;
}
function whole(v) {
  return Math.floor(num(v));
}

function computeExposure(input) {
  var rate = num(input.hourlyRate);
  var hours = num(input.hoursWorked);
  var paydays = whole(input.paydaysLate);
  var caregiversRaw = whole(input.caregiversAffected);
  var caregivers = caregiversRaw > 0 ? caregiversRaw : 1;
  var weeks = num(input.weeksUntilFixed);
  var state = (input.state === "sc" || input.state === "ny") ? input.state : "federal";

  var wages = rate * hours; // unpaid wages owed to one caregiver

  /* Federal floor: wages doubled under 29 USC 216(b). */
  var federalPerCaregiver = wages * 2;
  var federalTotal = federalPerCaregiver * caregivers;

  /* South Carolina maximum: treble wages plus $100 per failed payday. */
  var scTreblePerCaregiver = wages * 3;
  var scPenaltyPerCaregiver = SC_PENALTY_PER_PAYDAY * paydays;
  var scPerCaregiver = scTreblePerCaregiver + scPenaltyPerCaregiver;
  var scTotal = scPerCaregiver * caregivers;
  /* Projection only: each added week the pay stays held, on a weekly pay
   * cycle, is one more failed payday per caregiver. */
  var scDragPenaltyPerCaregiver = SC_PENALTY_PER_PAYDAY * weeks;
  var scDragTotal = (scPerCaregiver + scDragPenaltyPerCaregiver) * caregivers;

  /* New York: wages doubled under 198(1-a), plus estimated interest. */
  var nyInterestPerCaregiver = wages * NY_INTEREST_RATE_PER_YEAR * (weeks / 52);
  var nyPerCaregiver = wages * 2 + nyInterestPerCaregiver;
  var nyTotal = nyPerCaregiver * caregivers;

  var headlinePerCaregiver, headlineTotal, branchNote;
  if (state === "sc") {
    headlinePerCaregiver = scPerCaregiver;
    headlineTotal = scTotal;
    branchNote = "South Carolina maximum: up to three times the unpaid wages under S.C. Code 41-10-80(C), plus $100 for each failed payday under 41-10-80(B). The treble amount is discretionary with the court, so read this as the maximum, not a promise. Attorney fees and costs come on top.";
  } else if (state === "ny") {
    headlinePerCaregiver = nyPerCaregiver;
    headlineTotal = nyTotal;
    branchNote = "New York: the unpaid wages plus liquidated damages of an equal amount under Labor Law 198(1-a), plus estimated interest. Attorney fees and court costs come on top. A 2025 amendment softened liquidated damages only for first-time late-pay frequency cases where the wages were eventually paid in full.";
  } else {
    headlinePerCaregiver = federalPerCaregiver;
    headlineTotal = federalTotal;
    branchNote = "Federal floor under the Fair Labor Standards Act: the unpaid wages plus liquidated damages of an equal amount under 29 USC 216(b). Attorney fees and court costs come on top, and your state law may add more.";
  }

  return {
    state: state,
    wagesPerCaregiver: wages,
    caregivers: caregivers,
    paydaysLate: paydays,
    weeksUntilFixed: weeks,
    federalPerCaregiver: federalPerCaregiver,
    federalTotal: federalTotal,
    scTreblePerCaregiver: scTreblePerCaregiver,
    scPenaltyPerCaregiver: scPenaltyPerCaregiver,
    scPerCaregiver: scPerCaregiver,
    scTotal: scTotal,
    scDragTotal: scDragTotal,
    nyInterestPerCaregiver: nyInterestPerCaregiver,
    nyPerCaregiver: nyPerCaregiver,
    nyTotal: nyTotal,
    headlinePerCaregiver: headlinePerCaregiver,
    headlineTotal: headlineTotal,
    branchNote: branchNote
  };
}

var SAMPLE_INPUT = {
  hourlyRate: 15,
  hoursWorked: 40,
  paydaysLate: 1,
  caregiversAffected: 1,
  state: "sc",
  weeksUntilFixed: 2
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    computeExposure: computeExposure,
    SAMPLE_INPUT: SAMPLE_INPUT,
    SC_PENALTY_PER_PAYDAY: SC_PENALTY_PER_PAYDAY,
    NY_INTEREST_RATE_PER_YEAR: NY_INTEREST_RATE_PER_YEAR
  };
}
