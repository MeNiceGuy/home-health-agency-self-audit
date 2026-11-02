"use strict";
/* Tests for the Caregiver Turnover Cost Calculator. Run: node tests/run-tests.js */
const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const calc = require(path.join(root, "calc.js"));
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const readme = fs.readFileSync(path.join(root, "README.md"), "utf8");

let passed = 0;
function check(name, fn) {
  fn();
  passed += 1;
  console.log("ok - " + name);
}
function near(a, b, tol) {
  assert.ok(Math.abs(a - b) <= (tol || 0.01), a + " not near " + b);
}

const s = calc.computeTurnoverCost(calc.SAMPLE_INPUT);
check("sample turnover rate is 55 percent", () => near(s.turnoverRate, 55, 0.001));
check("sample training cost is 180", () => near(s.trainingCost, 180));
check("sample admin cost is 132", () => near(s.adminCost, 132));
check("sample replacement cost is 562", () => near(s.replacementCost, 562));
check("sample margin per hour is 15", () => near(s.marginPerHour, 15));
check("sample lost margin per leaver is 1350", () => near(s.lostMarginPerLeaver, 1350));
check("sample cost per leaver is 1912", () => near(s.perLeaver, 1912));
check("sample annual cost is 21032", () => near(s.annual, 21032));
check("sample monthly cost is annual over 12", () => near(s.monthly, 21032 / 12, 0.01));
check("sample annual billings are 936000", () => near(s.annualBillings, 936000));
check("sample share of billings is about 2.25 percent", () => near(s.sharePct, 2.247, 0.01));
check("sample verdict uses the below-average branch", () =>
  assert.ok(s.verdict.indexOf("below the industry average") !== -1, s.verdict));

check("zero leavers costs zero and says so", () => {
  const r = calc.computeTurnoverCost(Object.assign({}, calc.SAMPLE_INPUT, { leftLastYear: 0 }));
  near(r.annual, 0);
  assert.ok(r.verdict.indexOf("cost you nothing") !== -1, r.verdict);
});
check("80 percent turnover uses the at-or-above branch", () => {
  const r = calc.computeTurnoverCost(Object.assign({}, calc.SAMPLE_INPUT, { leftLastYear: 16 }));
  near(r.turnoverRate, 80, 0.001);
  assert.ok(r.verdict.indexOf("at or above the industry average") !== -1, r.verdict);
});
check("65 percent turnover uses the closing-on branch", () => {
  const r = calc.computeTurnoverCost(Object.assign({}, calc.SAMPLE_INPUT, { leftLastYear: 13 }));
  assert.ok(r.verdict.indexOf("closing on the industry average") !== -1, r.verdict);
});
check("bill rate below wage floors lost margin at zero", () => {
  const r = calc.computeTurnoverCost(Object.assign({}, calc.SAMPLE_INPUT, { billRate: 10 }));
  near(r.lostMarginPerLeaver, 0);
  near(r.perLeaver, r.replacementCost);
});
check("empty inputs do not produce NaN", () => {
  const r = calc.computeTurnoverCost({});
  assert.ok(isFinite(r.annual) && isFinite(r.turnoverRate) && isFinite(r.sharePct));
});

check("page wires the same FormSubmit inbox as the self-audit", () =>
  assert.ok(html.indexOf("formsubmit.co/ajax/359af7a0ec42d917c26fedc684ecd01c") !== -1));
check("page carries the never-sold promise", () =>
  assert.ok(html.indexOf("never sold") !== -1));
check("page cites the Activated Insights benchmark", () =>
  assert.ok(html.indexOf("Activated Insights") !== -1));
check("page labels the model as professional judgment", () =>
  assert.ok(html.indexOf("professional judgment") !== -1));
check("page carries all ten input fields", () => {
  ["caregivers", "leftLastYear", "wage", "billRate", "weeklyHours", "vacancyWeeks",
   "trainingHours", "recruitCost", "adminHours", "adminPay"].forEach(function (id) {
    assert.ok(html.indexOf('id="' + id + '"') !== -1, "missing " + id);
  });
});
check("page gives a where-to-find-it line for the count inputs", () => {
  assert.ok(html.indexOf("Where to find this") !== -1);
  assert.ok((html.match(/Where to find this/g) || []).length >= 8);
});
check("no priced products are pitched anywhere in the tool", () => {
  assert.ok(html.indexOf("gumroad") === -1, "store link in page");
  assert.ok(html.indexOf("Operations Audit Toolkit") === -1, "toolkit pitch in page");
  assert.ok(html.indexOf("Playbook") === -1, "playbook pitch in page");
});
check("results render immediately, with no form in front of the cost", () => {
  assert.ok(html.indexOf('id="results"') !== -1);
  assert.ok(html.indexOf('id="calcBtn"') !== -1, "calculate button missing");
  assert.ok(html.indexOf("See my turnover cost") !== -1);
  // The calculate path renders without any fetch or form submit.
  const showBody = html.slice(html.indexOf("function showResults"), html.indexOf('getElementById("calcBtn")'));
  assert.ok(showBody.indexOf("computeTurnoverCost(input)") !== -1);
  assert.ok(showBody.indexOf("render(r, input)") !== -1);
  assert.ok(showBody.indexOf('getElementById("results")') !== -1);
  assert.ok(showBody.indexOf("fetch(") === -1, "reveal path must not send anything");
  // Gate-era copy is gone.
  assert.ok(html.indexOf("unlocks") === -1, "gated copy left in page");
  assert.ok(html.indexOf("Your cost is ready") === -1, "gate heading left in page");
  assert.ok(html.indexOf("Show my turnover cost") === -1, "gate button label left in page");
});
check("capture is optional, sits after the results, and only confirms the send", () => {
  assert.ok(html.indexOf('id="captureForm"') !== -1);
  assert.ok(html.indexOf('id="fHoney"') !== -1);
  assert.ok(html.indexOf('id="results"') < html.indexOf('id="gate"'),
    "results card must come before the optional capture card");
  assert.ok(html.indexOf("This step is optional") !== -1);
  assert.ok(html.indexOf("#gate { display: none; }") !== -1,
    "capture card stays hidden until results exist");
  assert.ok(html.indexOf('id="gateSent"') !== -1);
  const handler = html.slice(html.indexOf('getElementById("captureForm").addEventListener("submit"'));
  assert.ok(handler.indexOf('getElementById("gateSent")') !== -1, "capture success must confirm the send");
  assert.ok(handler.indexOf('getElementById("results")') === -1,
    "capture submit must not reveal or scroll the results");
});
check("README documents the model and the benchmark source", () => {
  assert.ok(readme.indexOf("Activated Insights") !== -1);
  assert.ok(readme.indexOf("professional judgment") !== -1);
});

console.log("\n" + passed + " checks passed.");
