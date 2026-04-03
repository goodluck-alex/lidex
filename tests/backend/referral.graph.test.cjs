const test = require("node:test");
const assert = require("node:assert");
const { levelFromDirectCount } = require("../../backend/modules/referral/referral.levels");

test("levelFromDirectCount", () => {
  assert.strictEqual(levelFromDirectCount(0), 1);
  assert.strictEqual(levelFromDirectCount(2), 1);
  assert.strictEqual(levelFromDirectCount(3), 2);
  assert.strictEqual(levelFromDirectCount(9), 2);
  assert.strictEqual(levelFromDirectCount(10), 3);
});
