const model = require("./pairs.model");

async function list() {
  return { ok: true, ...(await model.list()) };
}

module.exports = { list };

