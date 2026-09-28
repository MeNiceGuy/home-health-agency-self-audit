"use strict";
/*
 * Boundary tests and a sample-agency test for the Home Health Agency Self-Audit.
 * Run with: node tests/run-tests.js   (from the tool's root folder)
 * No dependencies.
 */
var fs = require("fs");
var path = require("path");
var assert = require("assert");
var audit = require("../audit.js");

var root = path.join(__dirname, "..");
var html = fs.readFileSync(path.join(root, "index.html"), "utf8");
var readme = fs.readFileSync(path.join(root, "README.md"), "utf8");
var jsSrc = fs.readFileSync(path.join(root, "audit.js"), "utf8");

var passed = 0;
function check(name, fn) {
  try { fn(); passed++; console.log("ok - " + name); }
  catch (e) { console.error("FAIL - " + name + ": " + e.message); process.exitCode = 1; }
}
function base(p) {
  return Object.assign({ star_rating: 5, readmission_rate: 0, patient_satisfaction: 100,
    oasis_timeliness: 100, turnover_rate: 5, soc_delay_days: 1,
    documentation_lag_hours: 12, referral_source: "online" }, p || {});
}

/* --- Scoring math: boundaries --- */
check("best possible inputs score 0 (Low)", function () {
  var r = audit.computeRiskModel(base());
  assert.strictEqual(r.risk_score, 0);
  assert.strictEqual(r.risk_tier, "Low");
});
check("worst possible inputs cap at 100 (High)", function () {
  var r = audit.computeRiskModel(base({ star_rating: 1, readmission_rate: 100,
    patient_satisfaction: 0, oasis_timeliness: 0 }));
  assert.strictEqual(r.risk_score, 100);
  assert.strictEqual(r.risk_tier, "High");
});
check("out-of-range inputs are clamped, not exploded", function () {
  var r = audit.computeRiskModel(base({ star_rating: 9, readmission_rate: -50,
    patient_satisfaction: 400, oasis_timeliness: 200 }));
  assert.strictEqual(r.inputs.star, 5);
  assert.strictEqual(r.inputs.readmit, 0);
  assert.strictEqual(r.inputs.satisfaction, 100);
  assert.strictEqual(r.inputs.oasis, 100);
  assert.strictEqual(r.risk_score, 0);
});
check("garbage strings fall back to defaults", function () {
  var r = audit.computeRiskModel({ star_rating: "abc", readmission_rate: "",
    patient_satisfaction: null, oasis_timeliness: undefined });
  assert.strictEqual(r.inputs.star, 3);
  assert.strictEqual(r.inputs.readmit, 15);
  assert.strictEqual(r.inputs.satisfaction, 85);
  assert.strictEqual(r.inputs.oasis, 90);
});
check("tier boundary 49/50", function () {
  assert.strictEqual(audit.computeRiskModel(base({ readmission_rate: 24.5 })).risk_tier, "Low");
  assert.strictEqual(audit.computeRiskModel(base({ readmission_rate: 25 })).risk_tier, "Moderate");
});
check("tier boundary 74/75", function () {
  assert.strictEqual(audit.computeRiskModel(base({ readmission_rate: 37 })).risk_tier, "Moderate");
  assert.strictEqual(audit.computeRiskModel(base({ readmission_rate: 37.5 })).risk_tier, "High");
});
check("weight math: one star below 5 adds exactly 15", function () {
  var r = audit.computeRiskModel(base({ star_rating: 4 }));
  assert.strictEqual(r.risk_score, 15);
});
check("half-star steps work (3.5 stars adds 22.5, rounds to 23)", function () {
  var r = audit.computeRiskModel(base({ star_rating: 3.5 }));
  assert.strictEqual(r.risk_score, 23);
});
check("drivers are sorted highest points first", function () {
  var r = audit.computeRiskModel(base({ star_rating: 4, readmission_rate: 10 }));
  assert.ok(r.drivers[0].points >= r.drivers[1].points);
  assert.strictEqual(r.drivers.length, 4);
});

/* --- Non-scored questions never change the score --- */
check("turnover, soc delay, doc lag, referral source do not change the score", function () {
  var a = audit.computeRiskModel(base());
  var b = audit.computeRiskModel(base({ turnover_rate: 200, soc_delay_days: 60,
    documentation_lag_hours: 720, referral_source: "few" }));
  assert.strictEqual(a.risk_score, b.risk_score);
  assert.strictEqual(a.risk_tier, b.risk_tier);
});

/* --- Reimbursement heuristic is gone --- */
check("no payment impact field on the model output", function () {
  var r = audit.computeRiskModel(base());
  assert.strictEqual("payment_impact_pct" in r, false);
});
check("summary text never mentions reimbursement", function () {
  var r = audit.computeRiskModel(audit.SAMPLE_AGENCY);
  var recs = audit.generateRecommendations(audit.SAMPLE_AGENCY, r,
    audit.operationalFlags(audit.SAMPLE_AGENCY));
  var s = audit.buildSummary(r, recs);
  assert.ok(s.indexOf("reimbursement") === -1, "summary mentions reimbursement");
  assert.ok(s.indexOf("questions 1-4 only") !== -1, "summary missing score-basis line");
});

/* --- Flag thresholds --- */
check("flag thresholds: at vs just over the line", function () {
  assert.deepStrictEqual(audit.operationalFlags(base({ turnover_rate: 25 })), []);
  assert.deepStrictEqual(audit.operationalFlags(base({ turnover_rate: 25.1 })), ["turnover"]);
  assert.deepStrictEqual(audit.operationalFlags(base({ soc_delay_days: 2 })), []);
  assert.deepStrictEqual(audit.operationalFlags(base({ soc_delay_days: 2.1 })), ["soc_delay"]);
  assert.deepStrictEqual(audit.operationalFlags(base({ documentation_lag_hours: 24 })), []);
  assert.deepStrictEqual(audit.operationalFlags(base({ documentation_lag_hours: 24.1 })), ["doc_lag"]);
});

/* --- Sample agency --- */
check("sample agency: score 87, High tier, 3 flags, 7 recommendations", function () {
  var r = audit.computeRiskModel(audit.SAMPLE_AGENCY);
  assert.strictEqual(r.risk_score, 87);
  assert.strictEqual(r.risk_tier, "High");
  var flags = audit.operationalFlags(audit.SAMPLE_AGENCY);
  assert.deepStrictEqual(flags.sort(), ["doc_lag", "soc_delay", "turnover"]);
  var recs = audit.generateRecommendations(audit.SAMPLE_AGENCY, r, flags);
  assert.strictEqual(recs.length, 7);
  assert.strictEqual(r.drivers[0].label, "Hospital readmissions");
  assert.strictEqual(r.drivers[1].label, "Quality star rating gap");
  assert.strictEqual(r.drivers[2].label, "Patient satisfaction gap");
});
check("clean agency gets the single no-red-flags recommendation", function () {
  var r = audit.computeRiskModel(base());
  var recs = audit.generateRecommendations(base(), r, audit.operationalFlags(base()));
  assert.strictEqual(recs.length, 1);
  assert.strictEqual(recs[0].kit, null);
});
check("documentation recommendation no longer prescribes a 24-hour rule", function () {
  var r = audit.computeRiskModel(base({ oasis_timeliness: 80 }));
  var recs = audit.generateRecommendations(base({ oasis_timeliness: 80 }), r,
    audit.operationalFlags(base({ oasis_timeliness: 80 })));
  var doc = recs.filter(function (x) { return x.text.indexOf("Documentation is lagging") === 0; });
  assert.strictEqual(doc.length, 1);
  assert.ok(doc[0].text.indexOf("24-hour documentation rule") === -1);
  assert.ok(doc[0].text.indexOf("your agency's own policy") !== -1);
});
check("kits all carry a scope label", function () {
  Object.keys(audit.KITS).forEach(function (k) {
    assert.ok(audit.KITS[k].scope && audit.KITS[k].scope.length > 10, k + " missing scope");
  });
});

/* --- Static page checks --- */
check("no em dashes or en dashes anywhere in html/js/readme", function () {
  [html, jsSrc, readme].forEach(function (src, i) {
    assert.ok(src.indexOf("\u2014") === -1, "em dash in file " + i);
    assert.ok(src.indexOf("\u2013") === -1, "en dash in file " + i);
  });
});
check("no reimbursement-impact heuristic in the page", function () {
  assert.ok(html.indexOf("reimbursement impact") === -1);
  assert.ok(html.indexOf("pay-impact") === -1);
  assert.ok(html.indexOf("payment_impact") === -1);
});
check("no universal 24-hour documentation rule in the page", function () {
  assert.ok(html.indexOf("24-hour documentation rule") === -1);
});
check("no unsourced national-average readmission claim in the page", function () {
  assert.ok(html.indexOf("National average is roughly") === -1);
});
check("methodology section is present in the page", function () {
  assert.ok(html.indexOf('id="methodology"') !== -1);
  assert.ok(html.indexOf("Methodology and Sources") !== -1);
  assert.ok(html.indexOf("questions 1 to 4 only") !== -1);
  assert.ok(html.indexOf("42 CFR 484.45") !== -1);
});
check("Medicare-certified vs home care scope is labeled in the page", function () {
  assert.ok(html.indexOf("Medicare-certified home health measures") !== -1);
  assert.ok(html.indexOf("non-medical home care") !== -1);
});
check("email capture block is intact and working-shape", function () {
  assert.ok(html.indexOf('id="email-form"') !== -1);
  assert.ok(html.indexOf('id="results-email"') !== -1);
  assert.ok(html.indexOf('id="email-error"') !== -1);
  assert.ok(html.indexOf("Want your results by email?") !== -1);
  assert.ok(html.indexOf("https://drboswell.substack.com/subscribe") !== -1);
  assert.ok(html.indexOf("validEmail") !== -1);
});
check("privacy language is explicit in the page", function () {
  assert.ok(html.indexOf("The only exception is the optional") !== -1 ||
            html.indexOf("The only thing that ever leaves your browser is the optional email signup") !== -1);
  assert.ok(html.indexOf("does not send, store, or see your email address") !== -1);
});
check("README carries methodology, sources, and the professional-observation framing", function () {
  assert.ok(readme.indexOf("## Methodology and Sources") !== -1);
  assert.ok(readme.indexOf("In the author's professional observation") !== -1);
  assert.ok(readme.indexOf("professional judgment") !== -1);
  assert.ok(readme.indexOf("42 CFR 484.45") !== -1);
  assert.ok(readme.indexOf("LICENSE") !== -1);
});

console.log("\n" + passed + " checks passed." + (process.exitCode ? " (with failures)" : ""));
