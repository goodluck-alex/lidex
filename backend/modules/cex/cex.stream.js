/**
 * Server-Sent Events for CEX order book + stats (browser EventSource cannot send X-Lidex-Mode).
 * Clients should use: GET /v1/cex/stream?lidex_mode=cex (and cookies if same-site).
 *
 * @param {import('express').Application} app
 * @param {{ matcherService: { getOrderbook: Function, getStats: Function, listRecentTrades: Function } }} deps
 */
function attachCexSseRoute(app, { matcherService }) {
  function requireCexForSse(req, res, next) {
    const q = String(req.query?.lidex_mode || "").trim().toLowerCase();
    if (q === "cex") {
      req.lidexMode = "cex";
      return next();
    }
    if (!req.lidexMode) {
      return res.status(400).json({
        ok: false,
        error: "CEX stream: set lidex_mode cookie / X-Lidex-Mode, or pass ?lidex_mode=cex (EventSource)",
      });
    }
    if (req.lidexMode !== "cex") {
      return res.status(403).json({ ok: false, error: "this stream is CEX mode only" });
    }
    next();
  }

  app.get("/v1/cex/stream", requireCexForSse, (req, res) => {
    res.status(200);
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    if (typeof res.flushHeaders === "function") res.flushHeaders();

    let closed = false;
    req.on("close", () => {
      closed = true;
    });

    async function push() {
      if (closed) return;
      try {
        const [orderbook, stats, tradesPack] = await Promise.all([
          matcherService.getOrderbook(),
          matcherService.getStats(),
          matcherService.listRecentTrades({ limit: 40 }),
        ]);
        const payload = JSON.stringify({
          ok: true,
          orderbook,
          stats,
          trades: tradesPack.trades,
          tradesNextCursor: tradesPack.nextCursor ?? null,
          tradesHasMore: !!tradesPack.hasMore,
        });
        res.write(`data: ${payload}\n\n`);
      } catch (e) {
        if (!closed) {
          res.write(`data: ${JSON.stringify({ ok: false, error: e?.message || "stream tick failed" })}\n\n`);
        }
      }
    }

    void push();
    const tick = setInterval(() => void push(), 1200);
    const heartbeat = setInterval(() => {
      if (!closed) res.write(": ping\n\n");
    }, 20000);

    req.on("close", () => {
      clearInterval(tick);
      clearInterval(heartbeat);
    });
  });
}

module.exports = { attachCexSseRoute };
