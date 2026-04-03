/**
 * `lidex/admin` — operator surface wired into the single shared backend.
 * Backend imports this package; frontend never imports it (only calls public + /v1/admin/* with a key).
 */

const middleware = require("./middleware");
const { registerAdminRoutes } = require("./routes");

module.exports = {
  requireAdminApiKey: middleware.requireAdminApiKey,
  adminApiKeyConfigured: middleware.adminApiKeyConfigured,
  registerAdminRoutes,
};
