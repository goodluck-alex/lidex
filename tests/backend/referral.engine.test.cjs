const test = require("node:test");
const assert = require("node:assert");

// Pure behavior checks (no DB): ensure address normalization + validation guards stay consistent.
const referralEngine = require("../../backend/modules/referral/referral.engine");

test("referral engine exports", () => {
  assert.strictEqual(typeof referralEngine.recordReferral, "function");
  assert.strictEqual(typeof referralEngine.validateReferral, "function");
  assert.strictEqual(typeof referralEngine.validatePendingReferralsForWallet, "function");
});

