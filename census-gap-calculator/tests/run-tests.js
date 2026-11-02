"use strict";
/* Tests for the Client Acquisition and Census Gap Calculator. Run: node tests/run-tests.js */
const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const calc = require(path.join(root, "calc.js"));
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const readme = fs.readFileSync(path.join(root, "README.md"), "utf8");
const jsSrc = fs.readFileSync(path.join(root, "calc.js"), "utf8");

let passed = 0;
function check(name, fn) {
  fn();
  passed += 1;
  console.log("ok - " + name);
}
function near(a, b, tol) {
  assert.ok(Math.abs(a - b) <= (tol || 0.01), a + " not near " + b);
}

const REF = {
  currentClients: 50, targetClients: 65, hoursPerWeek: 20, hourlyRate: 32,
  stayMonths: 24, closeRatePct: 25, monthsToTarget: 6, marketingSpend: 0
};

/* --- Worked reference case from the brief --- */
check("reference losses are 50/24, about 2.1 a month", () => {
  const r = calc.computeCensusGap(REF);
  near(r.lossesPerMonth, 50 / 24, 0.001);
  near(r.lossesPerMonth, 2.1, 0.05);
});
check("reference hold equals the loss number", () => {
  const r = calc.computeCensusGap(REF);
  near(r.holdPerMonth, r.lossesPerMonth, 0.0001);
  near(r.holdPerMonth, 2.1, 0.05);
});
check("reference growth is (65-50)/6 = 2.5 a month", () => {
  const r = calc.computeCensusGap(REF);
  near(r.growthPerMonth, 2.5, 0.001);
});
check("reference total is about 4.6 new clients a month", () => {
  const r = calc.computeCensusGap(REF);
  near(r.totalNewPerMonth, 50 / 24 + 2.5, 0.001);
  near(r.totalNewPerMonth, 4.6, 0.05);
});
check("reference total over the 6 month period is 27.5", () => {
  const r = calc.computeCensusGap(REF);
  near(r.totalNewOverPeriod, 27.5, 0.01);
});
check("reference inquiries are about 18.3 a month at a 25 percent close rate", () => {
  const r = calc.computeCensusGap(REF);
  near(r.inquiriesPerMonth, (50 / 24 + 2.5) / 0.25, 0.01);
  near(r.inquiriesPerMonth, 18.3, 0.05);
});
check("reference inquiries over the period are 110", () => {
  const r = calc.computeCensusGap(REF);
  near(r.inquiriesOverPeriod, 110, 0.1);
});
check("reference monthly revenue gap follows the stated formula: 15 x 20 x 32 x 52/12 = 41600", () => {
  const r = calc.computeCensusGap(REF);
  near(r.monthlyRevenueGap, 15 * 20 * 32 * (52 / 12), 0.01);
  near(r.monthlyRevenueGap, 41600, 0.01);
});
check("reference annual revenue gap is 499200", () => {
  const r = calc.computeCensusGap(REF);
  near(r.annualRevenueGap, 499200, 0.01);
});
check("reference billed revenue per client is about 2773 a month", () => {
  const r = calc.computeCensusGap(REF);
  near(r.monthlyRevenuePerClient, 20 * 32 * (52 / 12), 0.01);
});
check("reference billed revenue per client across a 24 month stay is 66560", () => {
  const r = calc.computeCensusGap(REF);
  near(r.revenuePerClientOverStay, 66560, 0.01);
});
check("reference hold share is about 45 percent of the monthly load", () => {
  const r = calc.computeCensusGap(REF);
  near(r.holdSharePct, (50 / 24) / (50 / 24 + 2.5) * 100, 0.1);
});

/* --- Marketing math --- */
check("cost per acquired client at 1000 spend is spend over the needed pace", () => {
  const r = calc.computeCensusGap(Object.assign({}, REF, { marketingSpend: 1000 }));
  near(r.costPerClient, 1000 / (50 / 24 + 2.5), 0.01);
  near(r.costPerClient, 218.18, 0.05);
});
check("payback is cost per client over one month of billed revenue", () => {
  const r = calc.computeCensusGap(Object.assign({}, REF, { marketingSpend: 1000 }));
  near(r.paybackMonths, r.costPerClient / r.monthlyRevenuePerClient, 0.001);
  assert.ok(r.paybackMonths > 0 && r.paybackMonths < 0.1);
});
check("zero spend means no cost per client is priced", () => {
  const r = calc.computeCensusGap(REF);
  assert.strictEqual(r.hasSpend, false);
  near(r.costPerClient, 0);
});

/* --- Scaling and branches --- */
check("losses scale with census and stay: 48 clients at a 12 month stay lose 4 a month", () => {
  const r = calc.computeCensusGap(Object.assign({}, REF, { currentClients: 48, stayMonths: 12 }));
  near(r.lossesPerMonth, 4, 0.001);
});
check("pre-launch: zero current clients means no drip, all growth", () => {
  const r = calc.computeCensusGap(Object.assign({}, REF, { currentClients: 0, targetClients: 20, monthsToTarget: 5 }));
  near(r.lossesPerMonth, 0);
  near(r.growthPerMonth, 4, 0.001);
  near(r.totalNewPerMonth, 4, 0.001);
  assert.ok(r.insight.indexOf("Starting from zero") !== -1, r.insight);
});
check("replacement-led plan gets the replacement insight", () => {
  const r = calc.computeCensusGap(Object.assign({}, REF, { targetClients: 53 }));
  assert.ok(r.holdPerMonth >= r.growthPerMonth);
  assert.ok(r.insight.indexOf("replacements, not growth") !== -1, r.insight);
});
check("sample input reproduces the reference headline", () => {
  const r = calc.computeCensusGap(calc.SAMPLE_INPUT);
  near(r.totalNewPerMonth, 50 / 24 + 2.5, 0.001);
  near(r.monthlyRevenueGap, 41600, 0.01);
});

/* --- Division guards and edge inputs --- */
check("zero length of stay prices no losses and does not divide by zero", () => {
  const r = calc.computeCensusGap(Object.assign({}, REF, { stayMonths: 0 }));
  assert.strictEqual(r.stayKnown, false);
  near(r.lossesPerMonth, 0);
  near(r.totalNewPerMonth, 2.5, 0.001);
  assert.ok(isFinite(r.totalNewPerMonth));
});
check("zero close rate prices no inquiries and does not divide by zero", () => {
  const r = calc.computeCensusGap(Object.assign({}, REF, { closeRatePct: 0 }));
  assert.strictEqual(r.closeKnown, false);
  near(r.inquiriesPerMonth, 0);
  assert.ok(isFinite(r.inquiriesPerMonth));
});
check("zero months prices no growth and no period totals", () => {
  const r = calc.computeCensusGap(Object.assign({}, REF, { monthsToTarget: 0 }));
  assert.strictEqual(r.monthsKnown, false);
  near(r.growthPerMonth, 0);
  near(r.totalNewOverPeriod, 0);
  near(r.totalNewPerMonth, 50 / 24, 0.001);
});
check("target below current prices no growth and no revenue gap, hold still applies", () => {
  const r = calc.computeCensusGap(Object.assign({}, REF, { targetClients: 40 }));
  assert.strictEqual(r.targetBelowCurrent, true);
  near(r.growthPerMonth, 0);
  near(r.monthlyRevenueGap, 0);
  near(r.annualRevenueGap, 0);
  near(r.holdPerMonth, 50 / 24, 0.001);
});
check("empty input object does not produce NaN", () => {
  const r = calc.computeCensusGap({});
  assert.ok(isFinite(r.totalNewPerMonth) && isFinite(r.monthlyRevenueGap) && isFinite(r.inquiriesPerMonth));
  near(r.totalNewPerMonth, 0);
});
check("garbage strings do not produce NaN", () => {
  const r = calc.computeCensusGap({ currentClients: "abc", targetClients: "", hoursPerWeek: "x", hourlyRate: null, stayMonths: undefined, closeRatePct: "%", monthsToTarget: "soon", marketingSpend: "free" });
  assert.ok(isFinite(r.totalNewPerMonth) && isFinite(r.monthlyRevenueGap));
  near(r.totalNewPerMonth, 0);
});

/* --- Page wiring and standards --- */
check("page wires the same FormSubmit inbox as the other tools", () =>
  assert.ok(html.indexOf("formsubmit.co/ajax/359af7a0ec42d917c26fedc684ecd01c") !== -1));
check("page carries the never-sold promise", () =>
  assert.ok(html.indexOf("never sold") !== -1));
check("page carries the not-financial-advice disclaimer", () =>
  assert.ok(html.indexOf("not financial advice") !== -1));
check("page labels the framing as professional judgment", () =>
  assert.ok(html.indexOf("professional judgment") !== -1));
check("page states every input is the owner's own number and outputs are arithmetic", () => {
  assert.ok(html.indexOf("Every number you enter is your own") !== -1);
  assert.ok(html.indexOf("arithmetic on those inputs") !== -1);
});
check("page carries all eight census inputs", () => {
  ["currentClients", "targetClients", "hoursPerWeek", "hourlyRate", "stayMonths", "closeRatePct", "monthsToTarget", "marketingSpend"].forEach(function (id) {
    assert.ok(html.indexOf('id="' + id + '"') !== -1, "missing " + id);
  });
});
check("results show before the capture form in page order", () => {
  assert.ok(html.indexOf('id="results"') !== -1 && html.indexOf('id="captureForm"') !== -1);
  assert.ok(html.indexOf('id="results"') < html.indexOf('id="captureForm"'), "results must precede the form");
});
check("results render from the calculate path, not the email submit", () => {
  assert.ok(html.indexOf('id="calcBtn"') !== -1);
  assert.ok(html.indexOf("computeCensusGap(input)") !== -1);
});
check("capture is labeled optional", () =>
  assert.ok(html.indexOf("Optional.") !== -1));
check("footer cross-links the self-audit and the turnover calculator", () => {
  assert.ok(html.indexOf('href="../"') !== -1, "self-audit link missing");
  assert.ok(html.indexOf('href="../caregiver-turnover-cost-calculator/"') !== -1, "turnover link missing");
});
check("no priced products are pitched anywhere in the tool", () => {
  assert.ok(html.toLowerCase().indexOf("gumroad") === -1, "store link in page");
  assert.ok(html.indexOf("Operations Audit Toolkit") === -1, "toolkit pitch in page");
  assert.ok(html.indexOf("Playbook") === -1, "playbook pitch in page");
});
check("no em dashes or en dashes in any shipped file", () => {
  [html, readme, jsSrc].forEach(function (src, i) {
    assert.ok(src.indexOf("—") === -1, "em dash in file " + i);
    assert.ok(src.indexOf("–") === -1, "en dash in file " + i);
  });
});
check("README documents the worked case and the formula", () => {
  assert.ok(readme.indexOf("$41,600") !== -1);
  assert.ok(readme.indexOf("27.5") !== -1);
  assert.ok(readme.indexOf("professional judgment") !== -1);
});

console.log("\n" + passed + " checks passed.");
