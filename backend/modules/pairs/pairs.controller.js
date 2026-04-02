const pairsService = require("./pairs.service");

async function list(req, res) {
  return pairsService.list();
}

module.exports = { list };

