"use strict";
/* Tests for the Ohio Medicaid Payer Enrollment and Contracting Tracker. Run: node tests/run-tests.js */
const assert = require("assert");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const tracker = require(path.join(root, "tracker.js"));
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const readme = fs.readFileSync(path.join(root, "README.md"), "utf8");
const jsSrc = fs.readFileSync(path.join(root, "tracker.js"), "utf8");

let passed = 0;
function check(name, fn) {
  fn();
  passed += 1;
  console.log("ok - " + name);
}

function fakeStorage() {
  const m = {};
  return {
    getItem: function (k) { return Object.prototype.hasOwnProperty.call(m, k) ? m[k] : null; },
    setItem: function (k, v) { m[k] = String(v); },
    _map: m
  };
}

/* --- Checklist model --- */
check("tracker defines 21 items: 2 prep, 3 door 1, 14 plan, 2 ohiorise", () => {
  assert.strictEqual(tracker.ITEMS.length, 21);
  const by = {};
  tracker.ITEMS.forEach(function (it) { by[it.group] = (by[it.group] || 0) + 1; });
  assert.strictEqual(by.prep, 2);
  assert.strictEqual(by.door1, 3);
  assert.strictEqual(by.plan, 14);
  assert.strictEqual(by.ohiorise, 2);
});
check("item ids are unique", () => {
  const ids = tracker.itemIds();
  assert.strictEqual(new Set(ids).size, ids.length);
});
check("default state is all unchecked and progress is 0 of 21", () => {
  const p = tracker.progressOf(tracker.defaultState());
  assert.strictEqual(p.done, 0);
  assert.strictEqual(p.total, 21);
  assert.strictEqual(p.pct, 0);
});
check("toggle flips one item and progress follows", () => {
  let s = tracker.toggleItem(tracker.defaultState(), "pnm-submitted");
  assert.strictEqual(s["pnm-submitted"], true);
  assert.strictEqual(tracker.progressOf(s).done, 1);
  s = tracker.toggleItem(s, "pnm-submitted");
  assert.strictEqual(s["pnm-submitted"], false);
  assert.strictEqual(tracker.progressOf(s).done, 0);
});
check("toggle on an unknown id changes nothing and does not throw", () => {
  const s = tracker.toggleItem(tracker.defaultState(), "nope-not-real");
  assert.strictEqual(tracker.progressOf(s).done, 0);
  assert.ok(!("nope-not-real" in s));
});
check("setItem honors explicit values", () => {
  let s = tracker.setItem(tracker.defaultState(), "ac-request", true);
  assert.strictEqual(s["ac-request"], true);
  s = tracker.setItem(s, "ac-request", false);
  assert.strictEqual(s["ac-request"], false);
});
check("full completion reads 21 of 21 and 100 percent", () => {
  const s = tracker.defaultState();
  tracker.itemIds().forEach(function (id) { s[id] = true; });
  const p = tracker.progressOf(s);
  assert.strictEqual(p.done, 21);
  assert.strictEqual(p.pct, 100);
});
check("sanitize drops unknown ids and non-true values", () => {
  const s = tracker.sanitizeState({ "pnm-submitted": true, bogus: true, "ac-request": "yes", "ac-done": 1 });
  assert.strictEqual(s["pnm-submitted"], true);
  assert.strictEqual(s["ac-request"], false);
  assert.strictEqual(s["ac-done"], false);
  assert.ok(!("bogus" in s));
});
check("sanitize of garbage returns a clean default state", () => {
  [null, undefined, 42, "x", []].forEach(function (g) {
    const s = tracker.sanitizeState(g);
    assert.strictEqual(tracker.progressOf(s).done, 0);
  });
});

/* --- localStorage persistence logic --- */
check("save then load round-trips checked items through storage", () => {
  const store = fakeStorage();
  let s = tracker.defaultState();
  s = tracker.setItem(s, "pnm-approved", true);
  s = tracker.setItem(s, "caresource-request", true);
  assert.strictEqual(tracker.saveState(store, s), true);
  const back = tracker.loadState(store);
  assert.strictEqual(back["pnm-approved"], true);
  assert.strictEqual(back["caresource-request"], true);
  assert.strictEqual(tracker.progressOf(back).done, 2);
});
check("load uses the documented storage key", () => {
  assert.strictEqual(tracker.STORAGE_KEY, "ohioPayerTracker.v1");
  const store = fakeStorage();
  tracker.saveState(store, tracker.setItem(tracker.defaultState(), "molina-done", true));
  assert.ok(store._map["ohioPayerTracker.v1"].indexOf("molina-done") !== -1);
});
check("load with empty storage returns the default state", () => {
  const back = tracker.loadState(fakeStorage());
  assert.strictEqual(tracker.progressOf(back).done, 0);
});
check("load with corrupt JSON returns the default state instead of throwing", () => {
  const store = fakeStorage();
  store.setItem(tracker.STORAGE_KEY, "{not json");
  const back = tracker.loadState(store);
  assert.strictEqual(tracker.progressOf(back).done, 0);
});
check("load with stored unknown ids ignores them", () => {
  const store = fakeStorage();
  store.setItem(tracker.STORAGE_KEY, JSON.stringify({ "uhc-done": true, "mystery": true }));
  const back = tracker.loadState(store);
  assert.strictEqual(back["uhc-done"], true);
  assert.ok(!("mystery" in back));
});
check("save against a throwing storage returns false instead of throwing", () => {
  const bad = { getItem: function () { return null; }, setItem: function () { throw new Error("quota"); } };
  assert.strictEqual(tracker.saveState(bad, tracker.defaultState()), false);
});

/* --- Status rollups used by the capture summary --- */
check("door1 status walks not started, submitted, credentialing, approved", () => {
  let s = tracker.defaultState();
  assert.strictEqual(tracker.door1Status(s), "not started");
  s = tracker.setItem(s, "pnm-submitted", true);
  assert.strictEqual(tracker.door1Status(s), "application submitted");
  s = tracker.setItem(s, "pnm-credentialing", true);
  assert.ok(tracker.door1Status(s).indexOf("credentialing") !== -1);
  s = tracker.setItem(s, "pnm-approved", true);
  assert.strictEqual(tracker.door1Status(s), "approved");
});
check("plan status distinguishes not started, request sent, finished", () => {
  let s = tracker.defaultState();
  assert.strictEqual(tracker.planStatus(s)["CareSource"], "not started");
  s = tracker.setItem(s, "caresource-request", true);
  assert.strictEqual(tracker.planStatus(s)["CareSource"], "request sent");
  s = tracker.setItem(s, "caresource-done", true);
  assert.strictEqual(tracker.planStatus(s)["CareSource"], "contracting finished");
  assert.strictEqual(tracker.planStatus(s)["Molina Healthcare of Ohio"], "not started");
});
check("plan status covers all seven plans plus OhioRISE", () => {
  const names = Object.keys(tracker.planStatus(tracker.defaultState()));
  ["AmeriHealth Caritas Ohio", "Anthem Blue Cross and Blue Shield", "Buckeye Health Plan",
   "CareSource", "Humana Healthy Horizons", "Molina Healthcare of Ohio",
   "UnitedHealthcare Community Plan", "OhioRISE (Aetna Better Health of Ohio)"].forEach(function (n) {
    assert.ok(names.indexOf(n) !== -1, "missing " + n);
  });
  assert.strictEqual(names.length, 8);
});
check("summary text carries progress, door 1 status, plan lines, and checkbox marks", () => {
  let s = tracker.defaultState();
  s = tracker.setItem(s, "pnm-submitted", true);
  s = tracker.setItem(s, "buckeye-request", true);
  const t = tracker.summaryText(s);
  assert.ok(t.indexOf("Steps checked: 2 of 21") !== -1, t);
  assert.ok(t.indexOf("Door 1, ODM enrollment in PNM: application submitted") !== -1);
  assert.ok(t.indexOf("Buckeye Health Plan: request sent") !== -1);
  assert.ok(t.indexOf("[x] Enrollment application submitted in PNM") !== -1);
  assert.ok(t.indexOf("[ ] CareSource: New Health Partner Contract Form submitted") !== -1);
});

/* --- Page structure and wiring --- */
check("every tracker item id appears as a checkbox in the page", () => {
  tracker.itemIds().forEach(function (id) {
    assert.ok(html.indexOf('data-item="' + id + '"') !== -1, "missing checkbox " + id);
  });
});
check("tracker content shows before the capture form in page order", () => {
  assert.ok(html.indexOf('id="tracker"') !== -1 && html.indexOf('id="captureForm"') !== -1);
  assert.ok(html.indexOf('id="tracker"') < html.indexOf('id="captureForm"'), "tracker must precede the form");
  assert.ok(html.indexOf("Door 1") < html.indexOf('id="captureForm"'), "door 1 must precede the form");
  assert.ok(html.indexOf("OhioRISE") < html.indexOf('id="captureForm"'), "plan content must precede the form");
});
check("page persists progress with localStorage under the tracker key", () => {
  assert.ok(html.indexOf("window.localStorage") !== -1);
  assert.ok(jsSrc.indexOf("ohioPayerTracker.v1") !== -1);
  assert.ok(html.indexOf("loadState(window.localStorage)") !== -1);
  assert.ok(html.indexOf("saveState(window.localStorage, state)") !== -1);
});
check("page offers a progress reset", () =>
  assert.ok(html.indexOf('id="resetBtn"') !== -1));
check("page wires the same FormSubmit inbox as the other tools", () =>
  assert.ok(html.indexOf("formsubmit.co/ajax/359af7a0ec42d917c26fedc684ecd01c") !== -1));
check("capture payload carries the checklist summary and door 1 status", () => {
  assert.ok(html.indexOf("summaryText(state)") !== -1);
  assert.ok(html.indexOf("door1Status(state)") !== -1);
});
check("page carries the never-sold promise", () =>
  assert.ok(html.indexOf("never sold") !== -1));
check("capture is labeled optional", () =>
  assert.ok(html.indexOf("Optional.") !== -1));
check("page carries the not-legal-advice disclaimer", () =>
  assert.ok(html.indexOf("not legal advice") !== -1));
check("judgment framing is labeled professional judgment", () =>
  assert.ok(html.indexOf("professional judgment") !== -1));

/* --- Verified facts on the page --- */
check("page states the two-door rule: enrollment is not network participation", () =>
  assert.ok(html.indexOf("Enrollment is not network participation") !== -1));
check("page carries the PNM door and IHD support contacts", () => {
  assert.ok(html.indexOf("1-800-686-1516") !== -1);
  assert.ok(html.indexOf("IHD@medicaid.ohio.gov") !== -1);
  assert.ok(html.indexOf("ohpnm.omes.maximus.com") !== -1);
});
check("page carries the moratorium dates, rule, and all eight provider types", () => {
  assert.ok(html.indexOf("May 14, 2026 through November 14, 2026") !== -1);
  assert.ok(html.indexOf("42 CFR 455.470") !== -1);
  ["16 (Other Accredited Home Health Agency)", "25 (Non-Agency Personal Care Aide)",
   "26 (Non-Agency Home Care Attendant)", "38 (Private Duty Nurse)", "44 (Hospice)",
   "45 (Waivered Services Organization)", "55 (Waivered Services Individual)",
   "60 (Medicare Certified Home Health Agency)"].forEach(function (t) {
    assert.ok(html.indexOf(t) !== -1, "missing moratorium type " + t);
  });
});
check("page states behavioral health is not frozen by the moratorium", () =>
  assert.ok(html.indexOf("Behavioral health provider types are not on ODM's list") !== -1));
check("page carries all seven plan doors with their entry points", () => {
  assert.ok(html.indexOf("ProviderRecruitmentOH@amerihealthcaritas.com") !== -1);
  assert.ok(html.indexOf("1-833-296-2259") !== -1);
  assert.ok(html.indexOf("OhioMedicaidProvider@anthem.com") !== -1);
  assert.ok(html.indexOf("buckeyehealthplan.com/providers/become-a-provider.html") !== -1);
  assert.ok(html.indexOf("New Health Partner Contract Form") !== -1);
  assert.ok(html.indexOf("1-800-488-0134") !== -1);
  assert.ok(html.indexOf("OhioNetworkSpecialist@humana.com") !== -1);
  assert.ok(html.indexOf("OHBHMedicaid@humana.com") !== -1);
  assert.ok(html.indexOf("OHContractRequests@MolinaHealthcare.com") !== -1);
  assert.ok(html.indexOf("UHCprovider.com") !== -1);
});
check("page carries the CareSource behavioral health specifics: specialties 84 and 95, W-9, roster", () => {
  assert.ok(html.indexOf("specialty 84") !== -1);
  assert.ok(html.indexOf("specialty 95") !== -1);
  assert.ok(html.indexOf("roster of rendering providers") !== -1);
});
check("page carries the honest panel framing for AmeriHealth and Buckeye", () => {
  assert.ok(html.indexOf("panel is closed except for behavioral health providers who are CANS providers") !== -1);
  assert.ok(html.indexOf("provider type, specialty, and geographic need") !== -1);
});
check("page carries OhioRISE as a separate Aetna door", () => {
  assert.ok(html.indexOf("Aetna Better Health of Ohio") !== -1);
  assert.ok(html.indexOf("OHRISE-Network@aetna.com") !== -1);
});
check("page advises getting a denial reason in writing by specialty, county, and scope", () => {
  assert.ok(html.indexOf("get the reason in writing, specified by specialty, county, and scope") !== -1);
});
check("every plan section carries a source line with a checked date", () => {
  const matches = html.match(/checked November 1, 2026/g) || [];
  assert.ok(matches.length >= 8, "only " + matches.length + " dated source lines");
});
check("footer cross-links the self-audit, turnover calculator, and census gap calculator", () => {
  assert.ok(html.indexOf('href="../"') !== -1, "self-audit link missing");
  assert.ok(html.indexOf('href="../caregiver-turnover-cost-calculator/"') !== -1, "turnover link missing");
  assert.ok(html.indexOf('href="../census-gap-calculator/"') !== -1, "census gap link missing");
});
check("no priced products are pitched anywhere in the tool", () => {
  assert.ok(html.toLowerCase().indexOf("gumroad") === -1, "store link in page");
  assert.ok(html.indexOf("Operations Audit Toolkit") === -1, "toolkit pitch in page");
  assert.ok(html.indexOf("Playbook") === -1, "playbook pitch in page");
  assert.ok(html.indexOf("muse.ai") === -1, "muse link in page");
});
check("no em dashes or en dashes in any shipped file", () => {
  [html, readme, jsSrc].forEach(function (src, i) {
    assert.ok(src.indexOf("—") === -1, "em dash in file " + i);
    assert.ok(src.indexOf("–") === -1, "en dash in file " + i);
  });
});
check("README documents the two doors, the moratorium list, and the unverified capture", () => {
  assert.ok(readme.indexOf("16, 25, 26, 38, 44, 45, 55, and 60") !== -1);
  assert.ok(readme.indexOf("OHContractRequests@MolinaHealthcare.com") !== -1);
  assert.ok(readme.indexOf("has not been test-submitted") !== -1);
  assert.ok(readme.indexOf("professional judgment") !== -1);
});

console.log("\n" + passed + " checks passed.");
