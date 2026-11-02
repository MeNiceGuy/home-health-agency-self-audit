"use strict";
/* Tests for the Held-Paycheck Exposure Calculator. Run: node tests/run-tests.js */
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

const REF = { hourlyRate: 15, hoursWorked: 40, paydaysLate: 1, caregiversAffected: 1, weeksUntilFixed: 0 };

/* --- Worked reference case: 40 hours at $15 is $600 owed --- */
check("reference wages are 600", () => {
  near(calc.computeExposure(Object.assign({}, REF, { state: "federal" })).wagesPerCaregiver, 600);
});
check("reference federal exposure is 1200", () => {
  const r = calc.computeExposure(Object.assign({}, REF, { state: "federal" }));
  near(r.federalPerCaregiver, 1200);
  near(r.headlineTotal, 1200);
});
check("reference SC maximum is 1900 (1800 treble plus 100 penalty)", () => {
  const r = calc.computeExposure(Object.assign({}, REF, { state: "sc" }));
  near(r.scTreblePerCaregiver, 1800);
  near(r.scPenaltyPerCaregiver, 100);
  near(r.headlineTotal, 1900);
});
check("reference NY exposure at zero weeks is 1200", () => {
  const r = calc.computeExposure(Object.assign({}, REF, { state: "ny" }));
  near(r.nyInterestPerCaregiver, 0);
  near(r.headlineTotal, 1200);
});

/* --- Branch math --- */
check("SC penalty scales with failed paydays", () => {
  const r = calc.computeExposure(Object.assign({}, REF, { state: "sc", paydaysLate: 3 }));
  near(r.scPenaltyPerCaregiver, 300);
  near(r.headlineTotal, 2100);
});
check("SC drag projection adds 100 per unfixed week on a weekly cycle", () => {
  const r = calc.computeExposure(Object.assign({}, REF, { state: "sc", weeksUntilFixed: 2 }));
  near(r.scTotal, 1900);
  near(r.scDragTotal, 2100);
});
check("NY interest at 52 weeks is 9 percent of wages", () => {
  const r = calc.computeExposure(Object.assign({}, REF, { state: "ny", weeksUntilFixed: 52 }));
  near(r.nyInterestPerCaregiver, 54);
  near(r.headlineTotal, 1254);
});
check("NY interest at 26 weeks is half a year", () => {
  const r = calc.computeExposure(Object.assign({}, REF, { state: "ny", weeksUntilFixed: 26 }));
  near(r.nyInterestPerCaregiver, 27, 0.01);
});
check("collective multiplier: five caregivers under federal law is 6000", () => {
  const r = calc.computeExposure(Object.assign({}, REF, { state: "federal", caregiversAffected: 5 }));
  near(r.federalTotal, 6000);
  near(r.headlineTotal, 6000);
});
check("collective multiplier: five caregivers under SC maximum is 9500", () => {
  const r = calc.computeExposure(Object.assign({}, REF, { state: "sc", caregiversAffected: 5 }));
  near(r.scTotal, 9500);
});
check("federal floor is reported alongside state branches", () => {
  const r = calc.computeExposure(Object.assign({}, REF, { state: "sc", caregiversAffected: 2 }));
  near(r.federalTotal, 2400);
  near(r.headlineTotal, 3800);
});
check("unknown state value falls back to federal", () => {
  const r = calc.computeExposure(Object.assign({}, REF, { state: "tx" }));
  assert.strictEqual(r.state, "federal");
  near(r.headlineTotal, 1200);
});
check("sample input reproduces the SC reference total", () => {
  const r = calc.computeExposure(calc.SAMPLE_INPUT);
  near(r.headlineTotal, 1900);
  near(r.wagesPerCaregiver, 600);
});

/* --- Edge and garbage inputs --- */
check("zero rate means zero wage-based exposure under federal law", () => {
  const r = calc.computeExposure(Object.assign({}, REF, { state: "federal", hourlyRate: 0 }));
  near(r.headlineTotal, 0);
  near(r.wagesPerCaregiver, 0);
});
check("zero rate in SC leaves only the per-payday penalty", () => {
  const r = calc.computeExposure(Object.assign({}, REF, { state: "sc", hourlyRate: 0 }));
  near(r.scTreblePerCaregiver, 0);
  near(r.headlineTotal, 100);
});
check("zero hours means zero wages but SC penalty input still counts zero paydays of wages", () => {
  const r = calc.computeExposure(Object.assign({}, REF, { state: "sc", hoursWorked: 0 }));
  near(r.wagesPerCaregiver, 0);
  near(r.scPenaltyPerCaregiver, 100);
});
check("zero caregivers is treated as one caregiver", () => {
  const r = calc.computeExposure(Object.assign({}, REF, { state: "federal", caregiversAffected: 0 }));
  assert.strictEqual(r.caregivers, 1);
  near(r.headlineTotal, 1200);
});
check("empty input object does not produce NaN", () => {
  const r = calc.computeExposure({});
  assert.ok(isFinite(r.headlineTotal) && isFinite(r.federalTotal) && isFinite(r.nyTotal));
  near(r.headlineTotal, 0);
});
check("garbage strings do not produce NaN", () => {
  const r = calc.computeExposure({ hourlyRate: "abc", hoursWorked: "", paydaysLate: "x", caregiversAffected: null, state: "sc", weeksUntilFixed: undefined });
  assert.ok(isFinite(r.headlineTotal));
  near(r.wagesPerCaregiver, 0);
});
check("fractional paydays are floored to whole paydays", () => {
  const r = calc.computeExposure(Object.assign({}, REF, { state: "sc", paydaysLate: 2.9 }));
  assert.strictEqual(r.paydaysLate, 2);
  near(r.scPenaltyPerCaregiver, 200);
});
check("branch notes carry the honest labels", () => {
  const sc = calc.computeExposure(Object.assign({}, REF, { state: "sc" }));
  assert.ok(sc.branchNote.indexOf("discretionary") !== -1, sc.branchNote);
  const ny = calc.computeExposure(Object.assign({}, REF, { state: "ny" }));
  assert.ok(ny.branchNote.indexOf("2025 amendment") !== -1, ny.branchNote);
  const fed = calc.computeExposure(Object.assign({}, REF, { state: "federal" }));
  assert.ok(fed.branchNote.indexOf("216(b)") !== -1, fed.branchNote);
});

/* --- Page wiring and standards --- */
check("page wires the same FormSubmit inbox as the other tools", () =>
  assert.ok(html.indexOf("formsubmit.co/ajax/359af7a0ec42d917c26fedc684ecd01c") !== -1));
check("page carries the never-sold promise", () =>
  assert.ok(html.indexOf("never sold") !== -1));
check("page carries the not-legal-advice disclaimer", () =>
  assert.ok(html.indexOf("not legal advice") !== -1));
check("page labels practice recommendations as professional judgment", () =>
  assert.ok(html.indexOf("professional judgment") !== -1));
check("reserve is framed as practice, never a requirement", () => {
  assert.ok(html.indexOf("sound practice") !== -1);
  assert.ok(html.indexOf("not a legal requirement") !== -1);
});
check("page cites every primary source with a link", () => {
  ["law.cornell.edu/uscode/text/29/216", "law.cornell.edu/cfr/text/29/part-516",
   "scstatehouse.gov/code/t41c010.php", "nysenate.gov/legislation/laws/LAB/198",
   "nysenate.gov/legislation/laws/LAB/191", "nysenate.gov/legislation/laws/LAB/193",
   "nysenate.gov/legislation/laws/CVP/5004"].forEach(function (s) {
    assert.ok(html.indexOf(s) !== -1, "missing citation " + s);
  });
});
check("page carries all six scenario inputs", () => {
  ["hourlyRate", "hoursWorked", "paydaysLate", "caregiversAffected", "lawSelect", "weeksUntilFixed"].forEach(function (id) {
    assert.ok(html.indexOf('id="' + id + '"') !== -1, "missing " + id);
  });
});
check("results show before the capture form in page order", () => {
  assert.ok(html.indexOf('id="results"') !== -1 && html.indexOf('id="captureForm"') !== -1);
  assert.ok(html.indexOf('id="results"') < html.indexOf('id="captureForm"'), "results must precede the form");
});
check("results render from the calculate path, not the email submit", () => {
  assert.ok(html.indexOf('id="calcBtn"') !== -1);
  assert.ok(html.indexOf("computeExposure(input)") !== -1);
  const submitStart = html.indexOf('addEventListener("submit"');
  const calcCall = html.indexOf("calculate();", html.indexOf('id="calcBtn"'));
  assert.ok(calcCall !== -1 && submitStart !== -1);
});
check("capture is labeled optional", () =>
  assert.ok(html.indexOf("Optional.") !== -1));
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
check("README documents the reference case and sources", () => {
  assert.ok(readme.indexOf("$1,900") !== -1);
  assert.ok(readme.indexOf("41-10-80") !== -1);
  assert.ok(readme.indexOf("professional judgment") !== -1);
});

console.log("\n" + passed + " checks passed.");
