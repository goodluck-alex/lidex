const events = []; // newest last

function add(event) {
  events.push(event);
  return event;
}

function list({ limit = 50 } = {}) {
  const n = Math.max(1, Math.min(500, Number(limit) || 50));
  return events.slice(-n);
}

function summary() {
  const totalEvents = events.length;
  const totalsByToken = {};
  for (const e of events) {
    const token = String(e.feeToken || "unknown").toLowerCase();
    const amt = BigInt(String(e.feeAmount || "0"));
    totalsByToken[token] = (totalsByToken[token] || 0n) + amt;
  }
  return {
    totalEvents,
    totalsByToken: Object.fromEntries(Object.entries(totalsByToken).map(([k, v]) => [k, v.toString()]))
  };
}

module.exports = { add, list, summary };

