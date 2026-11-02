"use strict";
/*
 * Ohio Medicaid Payer Enrollment and Contracting Tracker
 * Checklist model, shared by the page and the tests. Progress lives
 * only in the visitor's own browser (localStorage). Nothing about a
 * visitor's progress is sent anywhere unless the visitor fills in the
 * optional email form at the bottom of the page.
 *
 * The structure is the Ohio rule that drives the whole tool: Door 1 is
 * Ohio Department of Medicaid enrollment in the Provider Network
 * Management (PNM) module. Door 2 is credentialing and contracting
 * with each managed care plan separately. Enrollment is not network
 * participation, and finishing one plan's door does nothing to the
 * other six. Every plan fact on the page is sourced on the page.
 */

var STORAGE_KEY = "ohioPayerTracker.v1";

/* Ordered checklist items. group: prep, door1, plan, ohiorise. */
var ITEMS = [
  { id: "prep-ohid", group: "prep", label: "OH|ID account created (needed to sign in to PNM)" },
  { id: "prep-docs", group: "prep", label: "Documents gathered: NPI, W-9, licenses or certifications, specialty codes" },

  { id: "pnm-submitted", group: "door1", label: "Enrollment application submitted in PNM" },
  { id: "pnm-credentialing", group: "door1", label: "ODM centralized credentialing finished or confirmed in PNM" },
  { id: "pnm-approved", group: "door1", label: "Ohio Medicaid enrollment approved, Medicaid ID in hand" },

  { id: "ac-request", group: "plan", plan: "AmeriHealth Caritas Ohio", label: "AmeriHealth Caritas Ohio: contract inquiry sent" },
  { id: "ac-done", group: "plan", plan: "AmeriHealth Caritas Ohio", label: "AmeriHealth Caritas Ohio: contract executed, effective date in hand" },
  { id: "anthem-request", group: "plan", plan: "Anthem Blue Cross and Blue Shield", label: "Anthem: contracting started through Our Network" },
  { id: "anthem-done", group: "plan", plan: "Anthem Blue Cross and Blue Shield", label: "Anthem: contract executed, effective date in hand" },
  { id: "buckeye-request", group: "plan", plan: "Buckeye Health Plan", label: "Buckeye Health Plan: join our network form submitted" },
  { id: "buckeye-done", group: "plan", plan: "Buckeye Health Plan", label: "Buckeye Health Plan: contract executed, effective date in hand" },
  { id: "caresource-request", group: "plan", plan: "CareSource", label: "CareSource: New Health Partner Contract Form submitted" },
  { id: "caresource-done", group: "plan", plan: "CareSource", label: "CareSource: welcome letter with CareSource ID received" },
  { id: "humana-request", group: "plan", plan: "Humana Healthy Horizons", label: "Humana Healthy Horizons: participation request sent" },
  { id: "humana-done", group: "plan", plan: "Humana Healthy Horizons", label: "Humana Healthy Horizons: contract executed, effective date in hand" },
  { id: "molina-request", group: "plan", plan: "Molina Healthcare of Ohio", label: "Molina: Ohio Provider Contract Request Form sent" },
  { id: "molina-done", group: "plan", plan: "Molina Healthcare of Ohio", label: "Molina: contract countersigned, welcome letter received" },
  { id: "uhc-request", group: "plan", plan: "UnitedHealthcare Community Plan", label: "UnitedHealthcare Community Plan: network application started" },
  { id: "uhc-done", group: "plan", plan: "UnitedHealthcare Community Plan", label: "UnitedHealthcare Community Plan: contract executed, effective date in hand" },

  { id: "ohiorise-request", group: "ohiorise", label: "OhioRISE (Aetna): contract package requested or sent" },
  { id: "ohiorise-done", group: "ohiorise", label: "OhioRISE (Aetna): contract executed, effective date in hand" }
];

function itemIds() {
  return ITEMS.map(function (it) { return it.id; });
}

function defaultState() {
  var s = {};
  ITEMS.forEach(function (it) { s[it.id] = false; });
  return s;
}

/* Keep only known ids, coerce to booleans. Unknown or corrupt input
 * falls back to a clean state rather than throwing. */
function sanitizeState(raw) {
  var s = defaultState();
  if (!raw || typeof raw !== "object") { return s; }
  ITEMS.forEach(function (it) {
    if (raw[it.id] === true) { s[it.id] = true; }
  });
  return s;
}

function loadState(storage) {
  try {
    var raw = storage.getItem(STORAGE_KEY);
    if (!raw) { return defaultState(); }
    return sanitizeState(JSON.parse(raw));
  } catch (e) {
    return defaultState();
  }
}

function saveState(storage, state) {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(sanitizeState(state)));
    return true;
  } catch (e) {
    return false;
  }
}

function toggleItem(state, id) {
  var s = sanitizeState(state);
  if (Object.prototype.hasOwnProperty.call(s, id)) {
    s[id] = !s[id];
  }
  return s;
}

function setItem(state, id, value) {
  var s = sanitizeState(state);
  if (Object.prototype.hasOwnProperty.call(s, id)) {
    s[id] = !!value;
  }
  return s;
}

function progressOf(state) {
  var s = sanitizeState(state);
  var total = ITEMS.length;
  var done = 0;
  ITEMS.forEach(function (it) { if (s[it.id]) { done += 1; } });
  return {
    done: done,
    total: total,
    pct: total > 0 ? Math.round((done / total) * 100) : 0
  };
}

/* Per-plan status for the capture summary: not started, request sent,
 * or contracting finished. OhioRISE reports the same way. */
function planStatus(state) {
  var s = sanitizeState(state);
  var out = {};
  ITEMS.forEach(function (it) {
    if (it.group !== "plan" && it.group !== "ohiorise") { return; }
    var name = it.plan || "OhioRISE (Aetna Better Health of Ohio)";
    if (!out[name]) { out[name] = "not started"; }
    if (it.id.slice(-5) === "quest" && s[it.id]) { out[name] = "request sent"; }
    if (it.id.slice(-4) === "done" && s[it.id]) { out[name] = "contracting finished"; }
  });
  return out;
}

function door1Status(state) {
  var s = sanitizeState(state);
  if (s["pnm-approved"]) { return "approved"; }
  if (s["pnm-credentialing"]) { return "credentialing confirmed, approval pending"; }
  if (s["pnm-submitted"]) { return "application submitted"; }
  return "not started";
}

function summaryText(state) {
  var s = sanitizeState(state);
  var p = progressOf(s);
  var lines = [];
  lines.push("Ohio Medicaid Payer Enrollment and Contracting Tracker progress");
  lines.push("Steps checked: " + p.done + " of " + p.total + " (" + p.pct + " percent)");
  lines.push("Door 1, ODM enrollment in PNM: " + door1Status(s));
  var plans = planStatus(s);
  Object.keys(plans).forEach(function (name) {
    lines.push(name + ": " + plans[name]);
  });
  lines.push("Checked items:");
  ITEMS.forEach(function (it) {
    lines.push((s[it.id] ? "[x] " : "[ ] ") + it.label);
  });
  return lines.join("\n");
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    STORAGE_KEY: STORAGE_KEY,
    ITEMS: ITEMS,
    itemIds: itemIds,
    defaultState: defaultState,
    sanitizeState: sanitizeState,
    loadState: loadState,
    saveState: saveState,
    toggleItem: toggleItem,
    setItem: setItem,
    progressOf: progressOf,
    planStatus: planStatus,
    door1Status: door1Status,
    summaryText: summaryText
  };
}
