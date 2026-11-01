"use strict";
/*
 * Caregiver Turnover Cost Calculator
 * Pure math for the turnover cost model, shared by the page and the tests.
 * Every input is owner-entered. The only outside figure on the page is the
 * industry turnover benchmark, cited on the page (Activated Insights, 2024).
 * The model structure is Dr. Boswell's professional judgment, labeled as such.
 */

var INDUSTRY_TURNOVER_PCT = 75; // Activated Insights benchmarking, 2024

function num(v) {
  var n = typeof v === "number" ? v : parseFloat(String(v).replace(/[^0-9.\-]/g, ""));
  return isFinite(n) && n > 0 ? n : 0;
}

function computeTurnoverCost(input) {
  var caregivers = num(input.caregivers);
  var left = num(input.leftLastYear);
  var wage = num(input.wage);
  var billRate = num(input.billRate);
  var weeklyHours = num(input.weeklyHours);
  var vacancyWeeks = num(input.vacancyWeeks);
  var trainingHours = num(input.trainingHours);
  var recruitCost = num(input.recruitCost);
  var adminHours = num(input.adminHours);
  var adminPay = num(input.adminPay);

  var turnoverRate = caregivers > 0 ? (left / caregivers) * 100 : 0;

  var trainingCost = trainingHours * wage;
  var adminCost = adminHours * adminPay;
  var replacementCost = recruitCost + trainingCost + adminCost;

  var marginPerHour = Math.max(billRate - wage, 0);
  var lostMarginPerLeaver = vacancyWeeks * weeklyHours * marginPerHour;

  var perLeaver = replacementCost + lostMarginPerLeaver;
  var annual = left * perLeaver;
  var monthly = annual / 12;

  var annualBillings = caregivers * weeklyHours * billRate * 52;
  var sharePct = annualBillings > 0 ? (annual / annualBillings) * 100 : 0;

  var verdict;
  if (left === 0) {
    verdict = "No caregivers left in the last 12 months, so turnover cost you nothing this year. Keep doing what you are doing, and recheck after any change in pay or scheduling.";
  } else if (turnoverRate >= INDUSTRY_TURNOVER_PCT) {
    verdict = "Your turnover rate is at or above the industry average of 75 percent (Activated Insights, 2024). At your numbers, churn is one of the largest costs in the business, larger than most owners expect until they see it priced.";
  } else if (turnoverRate >= 60) {
    verdict = "Your turnover rate is closing on the industry average of 75 percent (Activated Insights, 2024). The cost is already real money every month, and it grows with every added caregiver until the rate comes down.";
  } else {
    verdict = "Your turnover rate is below the industry average of 75 percent (Activated Insights, 2024). Even so, the departures you do have carry a real price tag, and it repeats every year the rate holds.";
  }

  return {
    turnoverRate: turnoverRate,
    leavers: left,
    trainingCost: trainingCost,
    adminCost: adminCost,
    replacementCost: replacementCost,
    marginPerHour: marginPerHour,
    lostMarginPerLeaver: lostMarginPerLeaver,
    perLeaver: perLeaver,
    annual: annual,
    monthly: monthly,
    annualBillings: annualBillings,
    sharePct: sharePct,
    verdict: verdict
  };
}

var SAMPLE_INPUT = {
  caregivers: 20,
  leftLastYear: 11,
  wage: 15,
  billRate: 30,
  weeklyHours: 30,
  vacancyWeeks: 3,
  trainingHours: 12,
  recruitCost: 250,
  adminHours: 6,
  adminPay: 22
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    computeTurnoverCost: computeTurnoverCost,
    SAMPLE_INPUT: SAMPLE_INPUT,
    INDUSTRY_TURNOVER_PCT: INDUSTRY_TURNOVER_PCT
  };
}
