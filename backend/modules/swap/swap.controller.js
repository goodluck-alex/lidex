const swapService = require("./swap.service");

async function quote(req, res) {
  return swapService.quote({ body: req?.body });
}

async function execute(req, res) {
  return swapService.execute({ body: req?.body, user: req?.user });
}

module.exports = { quote, execute };

