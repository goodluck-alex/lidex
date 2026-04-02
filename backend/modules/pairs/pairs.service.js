const model = require("./pairs.model");

async function list() {
  return { ok: true, ...model.list() };
}

module.exports = { list };

