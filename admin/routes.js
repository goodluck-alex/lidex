const { adminApiKeyConfigured } = require("./middleware");
const { createAdminMutationAuditMiddleware } = require("./auditMiddleware");

/**
 * `/v1/admin/*` — mounted from `backend/server.js` via `registerAdminRoutes(app, deps)`.
 *
 * @param {import("express").Express} app
 * @param {object} deps — `requireAdminApiKey`, optional `prisma` (for status DB ping), `adminOpsService`, plus listing/dex/launchpad/liq mining/gov services from `backend/modules/*`.
 */
function registerAdminRoutes(app, deps) {
  const {
    requireAdminApiKey,
    prisma,
    adminOpsService,
    listingsService,
    dexPairActivationService,
    launchpadService,
    liqMiningService,
    govSignalService,
  } = deps;

  app.use(createAdminMutationAuditMiddleware({ prisma }));

  app.get("/v1/admin/system/status", async (req, res) => {
    const adminEnabled = adminApiKeyConfigured();
    let database = "unknown";
    if (prisma) {
      try {
        await prisma.$queryRaw`SELECT 1`;
        database = "ok";
      } catch {
        database = "error";
      }
    }
    const prismaMigrateHint =
      "After schema changes, run `npx prisma migrate deploy` from `lidex/backend` (see Prisma deploy docs).";
    res.json({
      ok: database === "ok",
      adminEnabled,
      database,
      prismaMigrateHint,
      nodeEnv: process.env.NODE_ENV || undefined,
      gitRevision:
        process.env.GIT_REVISION ||
        process.env.VERCEL_GIT_COMMIT_SHA ||
        process.env.RAILWAY_GIT_COMMIT_SHA ||
        undefined,
    });
  });

  // Phase D — read-only ops (user investigation, CEX snapshot)
  app.get("/v1/admin/users/by-address/:address", requireAdminApiKey, async (req, res) => {
    try {
      const result = await adminOpsService.adminResolveUserByAddress(req.params.address);
      if (result.ok === false) return res.status(404).json(result);
      res.json(result);
    } catch (e) {
      res.status(500).json({ ok: false, error: e?.message || "admin user resolve failed" });
    }
  });

  app.get("/v1/admin/users/:id", requireAdminApiKey, async (req, res) => {
    try {
      const result = await adminOpsService.adminGetUserById(req.params.id, {
        limit: req.query?.limit,
        cursor: req.query?.cursor,
      });
      if (result.ok === false) {
        const st = result.code === "NOT_FOUND" ? 404 : 400;
        return res.status(st).json(result);
      }
      res.json(result);
    } catch (e) {
      res.status(500).json({ ok: false, error: e?.message || "admin user get failed" });
    }
  });

  app.get("/v1/admin/cex/overview", requireAdminApiKey, async (req, res) => {
    try {
      const result = await adminOpsService.adminCexOverview();
      res.json(result);
    } catch (e) {
      res.status(500).json({ ok: false, error: e?.message || "admin cex overview failed" });
    }
  });

  app.get("/v1/admin/audit-logs", requireAdminApiKey, async (req, res) => {
    try {
      const result = await adminOpsService.adminListAuditLogs({
        limit: req.query?.limit,
        cursor: req.query?.cursor,
        resource: req.query?.resource,
        method: req.query?.method,
      });
      res.json(result);
    } catch (e) {
      res.status(500).json({ ok: false, error: e?.message || "admin audit logs failed" });
    }
  });

  app.post("/v1/admin/cex/ledger/manual-adjust", requireAdminApiKey, async (req, res) => {
    try {
      const result = await adminOpsService.adminManualCexLedgerAdjust(req.body || {}, {
        approverKeyFingerprint: req.approverKeyFingerprint,
        headers: req.headers,
      });
      if (result.ok === false) {
        let st = 400;
        if (result.code === "NOT_FOUND") st = 404;
        else if (result.code === "DISABLED" || result.code === "DUAL_CONTROL_REQUIRED") st = 403;
        else if (result.code === "INSUFFICIENT_FUNDS") st = 409;
        else if (result.code === "BAD_ASSET") st = 400;
        return res.status(st).json(result);
      }
      res.json(result);
    } catch (e) {
      res.status(500).json({ ok: false, error: e?.message || "manual ledger adjust failed" });
    }
  });

  // Phase 7 — listings + token registry (ADMIN_API_KEY). Optional: LISTING_ADMIN_WEBHOOK_URL on apply.
  app.get("/v1/admin/listings/applications", requireAdminApiKey, async (req, res) => {
    try {
      const result = await listingsService.listApplicationsAdmin({
        status: req.query?.status,
        limit: req.query?.limit,
        cursor: req.query?.cursor,
      });
      res.json(result);
    } catch (e) {
      res.status(500).json({ ok: false, error: e?.message || "admin listings failed" });
    }
  });

  app.get("/v1/admin/listings/applications/:id", requireAdminApiKey, async (req, res) => {
    try {
      const result = await listingsService.getApplicationAdmin(req.params?.id);
      if (result.ok === false) {
        const code = result.code;
        const st = code === "NOT_FOUND" ? 404 : code === "BAD_REQUEST" ? 400 : 400;
        return res.status(st).json(result);
      }
      res.json(result);
    } catch (e) {
      res.status(500).json({ ok: false, error: e?.message || "admin listing get failed" });
    }
  });

  app.patch("/v1/admin/listings/applications/:id", requireAdminApiKey, async (req, res) => {
    try {
      const result = await listingsService.patchListingApplicationAdmin(req.params?.id, req.body || {});
      if (result.ok === false) {
        const code = result.code;
        let st = 400;
        if (code === "NOT_FOUND") st = 404;
        else if (code === "CONFLICT") st = 409;
        return res.status(st).json(result);
      }
      res.json(result);
    } catch (e) {
      res.status(500).json({ ok: false, error: e?.message || "admin listing patch failed" });
    }
  });

  app.get("/v1/admin/listings/tokens", requireAdminApiKey, async (req, res) => {
    try {
      const result = await listingsService.listListedTokensAdmin({
        chainId: req.query?.chainId,
        limit: req.query?.limit,
        cursor: req.query?.cursor,
      });
      res.json(result);
    } catch (e) {
      res.status(500).json({ ok: false, error: e?.message || "admin listed tokens failed" });
    }
  });

  app.get("/v1/admin/dex-pairs/activations", requireAdminApiKey, async (req, res) => {
    try {
      const result = await dexPairActivationService.listActivations();
      res.json(result);
    } catch (e) {
      res.status(500).json({ ok: false, error: e?.message || "dex pair activations list failed" });
    }
  });

  app.post("/v1/admin/dex-pairs/activations", requireAdminApiKey, async (req, res) => {
    try {
      const result = await dexPairActivationService.upsertActivation(req.body || {});
      if (result.ok === false) return res.status(400).json(result);
      res.json(result);
    } catch (e) {
      res.status(500).json({ ok: false, error: e?.message || "dex pair activation upsert failed" });
    }
  });

  app.delete("/v1/admin/dex-pairs/activations", requireAdminApiKey, async (req, res) => {
    try {
      const result = await dexPairActivationService.deleteActivation(req.query?.symbol);
      if (result.ok === false) return res.status(400).json(result);
      res.json(result);
    } catch (e) {
      res.status(500).json({ ok: false, error: e?.message || "dex pair activation delete failed" });
    }
  });

  app.get("/v1/admin/launchpad/sales", requireAdminApiKey, async (req, res) => {
    try {
      const result = await launchpadService.adminListSales();
      res.json(result);
    } catch (e) {
      res.status(500).json({ ok: false, error: e?.message || "admin launchpad list failed" });
    }
  });

  app.post("/v1/admin/launchpad/sales", requireAdminApiKey, async (req, res) => {
    try {
      const result = await launchpadService.adminCreateSale(req.body || {});
      if (result.ok === false) {
        const st = result.code === "CONFLICT" ? 409 : 400;
        return res.status(st).json(result);
      }
      res.json(result);
    } catch (e) {
      res.status(500).json({ ok: false, error: e?.message || "admin launchpad create failed" });
    }
  });

  app.patch("/v1/admin/launchpad/sales/:id", requireAdminApiKey, async (req, res) => {
    try {
      const result = await launchpadService.adminPatchSale(req.params.id, req.body || {});
      if (result.ok === false) {
        const st = result.code === "NOT_FOUND" ? 404 : 400;
        return res.status(st).json(result);
      }
      res.json(result);
    } catch (e) {
      res.status(500).json({ ok: false, error: e?.message || "admin launchpad patch failed" });
    }
  });

  app.get("/v1/admin/liq-mining/campaigns", requireAdminApiKey, async (req, res) => {
    try {
      const result = await liqMiningService.adminListCampaigns();
      res.json(result);
    } catch (e) {
      res.status(500).json({ ok: false, error: e?.message || "admin liq mining list failed" });
    }
  });

  app.post("/v1/admin/liq-mining/campaigns", requireAdminApiKey, async (req, res) => {
    try {
      const result = await liqMiningService.adminCreateCampaign(req.body || {});
      if (result.ok === false) {
        const st = result.code === "DISABLED" ? 403 : 400;
        return res.status(st).json(result);
      }
      res.json(result);
    } catch (e) {
      res.status(500).json({ ok: false, error: e?.message || "admin liq mining create failed" });
    }
  });

  app.patch("/v1/admin/liq-mining/campaigns/:id", requireAdminApiKey, async (req, res) => {
    try {
      const result = await liqMiningService.adminPatchCampaign(req.params.id, req.body || {});
      if (result.ok === false) {
        let st = 400;
        if (result.code === "NOT_FOUND") st = 404;
        else if (result.code === "DISABLED") st = 403;
        return res.status(st).json(result);
      }
      res.json(result);
    } catch (e) {
      res.status(500).json({ ok: false, error: e?.message || "admin liq mining patch failed" });
    }
  });

  app.get("/v1/admin/governance/signals", requireAdminApiKey, async (req, res) => {
    try {
      const result = await govSignalService.adminList();
      res.json(result);
    } catch (e) {
      res.status(500).json({ ok: false, error: e?.message || "admin governance signals list failed" });
    }
  });

  app.post("/v1/admin/governance/signals", requireAdminApiKey, async (req, res) => {
    try {
      const result = await govSignalService.adminCreate(req.body || {});
      if (result.ok === false) {
        const st = result.code === "DISABLED" ? 403 : result.code === "CONFLICT" ? 409 : 400;
        return res.status(st).json(result);
      }
      res.json(result);
    } catch (e) {
      res.status(500).json({ ok: false, error: e?.message || "admin governance signal create failed" });
    }
  });

  app.patch("/v1/admin/governance/signals/:id", requireAdminApiKey, async (req, res) => {
    try {
      const result = await govSignalService.adminPatch(req.params.id, req.body || {});
      if (result.ok === false) {
        let st = 400;
        if (result.code === "NOT_FOUND") st = 404;
        else if (result.code === "DISABLED") st = 403;
        return res.status(st).json(result);
      }
      res.json(result);
    } catch (e) {
      res.status(500).json({ ok: false, error: e?.message || "admin governance signal patch failed" });
    }
  });
}

module.exports = { registerAdminRoutes };
