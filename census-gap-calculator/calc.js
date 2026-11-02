"use strict";
/*
 * Client Acquisition and Census Gap Calculator
 * Pure math for the census model, shared by the page and the tests.
 * Every input is owner-entered. There are no outside statistics anywhere
 * in this tool: each output is arithmetic on the owner's own numbers.
 * The model structure and the reading of the results are Dr. Boswell's
 * professional judgment, labeled as such on the page.
 *
 * The core idea: at any census, clients leave at a steady drip. Clients
 * lost per month equals current clients divided by the average length of
 * stay in months. Before an agency grows by a single client, it must
 * first replace that drip. New clients needed per month is therefore the
 * replacement number (hold) plus the growth number, which is the census
 * gap divided by the months allowed to close it. Inquiries needed per
 * month is the new-client number divided by the owner's own close rate.
 * The revenue gap prices the census gap at the owner's own hours and
 * rate: gap clients x hours per week x rate x 52/12.
 */

function num(v) {
  var n = typeof v === "number" ? v : parseFloat(String(v).replace(/[^0-9.\-]/g, ""));
  return isFinite(n) && n > 0 ? n : 0;
}

function computeCensusGap(input) {
  var current = num(input.currentClients);
  var target = num(input.targetClients);
  var hoursPerWeek = num(input.hoursPerWeek);
  var rate = num(input.hourlyRate);
  var stayMonths = num(input.stayMonths);
  var closeRatePct = num(input.closeRatePct);
  var months = num(input.monthsToTarget);
  var spend = num(input.marketingSpend);

  /* The drip: clients lost per month at the current length of stay. */
  var stayKnown = stayMonths > 0;
  var lossesPerMonth = stayKnown ? current / stayMonths : 0;
  var holdPerMonth = lossesPerMonth;

  /* Growth: the census gap spread over the months allowed to close it.
   * A target below today's census prices no growth and no revenue gap;
   * the replacement number still applies while the census settles. */
  var gapClients = target - current;
  var targetBelowCurrent = gapClients < 0;
  var monthsKnown = months > 0;
  var growthPerMonth = monthsKnown && gapClients > 0 ? gapClients / months : 0;

  var totalNewPerMonth = holdPerMonth + growthPerMonth;
  var totalNewOverPeriod = monthsKnown ? totalNewPerMonth * months : 0;

  /* Inquiries: work backward from signed clients through the close rate. */
  var closeRate = closeRatePct / 100;
  var closeKnown = closeRate > 0;
  var inquiriesPerMonth = closeKnown ? totalNewPerMonth / closeRate : 0;
  var inquiriesOverPeriod = monthsKnown ? inquiriesPerMonth * months : 0;

  /* Revenue: one client at the owner's hours and rate, then the gap. */
  var monthlyRevenuePerClient = hoursPerWeek * rate * (52 / 12);
  var monthlyRevenueGap = (gapClients > 0 ? gapClients : 0) * monthlyRevenuePerClient;
  var annualRevenueGap = monthlyRevenueGap * 12;
  var revenuePerClientOverStay = monthlyRevenuePerClient * stayMonths;

  /* Optional marketing math: what each signed client costs at the pace
   * the target requires, and how fast billed revenue covers it. */
  var hasSpend = spend > 0;
  var costPerClient = hasSpend && totalNewPerMonth > 0 ? spend / totalNewPerMonth : 0;
  var paybackMonths = costPerClient > 0 && monthlyRevenuePerClient > 0
    ? costPerClient / monthlyRevenuePerClient : 0;

  var holdSharePct = totalNewPerMonth > 0 ? (holdPerMonth / totalNewPerMonth) * 100 : 0;

  var insight;
  if (current === 0 && target > 0) {
    insight = "Starting from zero, there is no drip to replace yet, so every new client is growth. That changes the month your first clients reach the end of their average stay. Build the replacement habit now, while the numbers are small.";
  } else if (totalNewPerMonth === 0) {
    insight = "With these numbers there is no replacement or growth load to price. If the census is meant to move, check the target, the months, and the length of stay you entered.";
  } else if (holdPerMonth > 0 && holdPerMonth >= growthPerMonth) {
    insight = "Most of the new clients you need each month are replacements, not growth. Filling the bucket faster works, but so does slowing the drip: a longer average stay cuts the replacement number every single month, and it compounds.";
  } else if (holdPerMonth > 0) {
    insight = "Growth carries most of this load, but the replacement number underneath it never stops. Hit the monthly target and miss the drip, and the census still stalls short of the goal.";
  } else {
    insight = "With no losses priced in, every new client reads as growth. Add your average length of stay to see the replacement load hiding under this plan.";
  }

  return {
    currentClients: current,
    targetClients: target,
    gapClients: gapClients,
    targetBelowCurrent: targetBelowCurrent,
    stayKnown: stayKnown,
    monthsKnown: monthsKnown,
    closeKnown: closeKnown,
    lossesPerMonth: lossesPerMonth,
    holdPerMonth: holdPerMonth,
    growthPerMonth: growthPerMonth,
    totalNewPerMonth: totalNewPerMonth,
    totalNewOverPeriod: totalNewOverPeriod,
    inquiriesPerMonth: inquiriesPerMonth,
    inquiriesOverPeriod: inquiriesOverPeriod,
    monthlyRevenuePerClient: monthlyRevenuePerClient,
    monthlyRevenueGap: monthlyRevenueGap,
    annualRevenueGap: annualRevenueGap,
    revenuePerClientOverStay: revenuePerClientOverStay,
    hasSpend: hasSpend,
    costPerClient: costPerClient,
    paybackMonths: paybackMonths,
    holdSharePct: holdSharePct,
    insight: insight
  };
}

var SAMPLE_INPUT = {
  currentClients: 50,
  targetClients: 65,
  hoursPerWeek: 20,
  hourlyRate: 32,
  stayMonths: 24,
  closeRatePct: 25,
  monthsToTarget: 6,
  marketingSpend: 0
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    computeCensusGap: computeCensusGap,
    SAMPLE_INPUT: SAMPLE_INPUT
  };
}
