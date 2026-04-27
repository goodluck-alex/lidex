function listProviders() {
  const raw = String(process.env.DEX_SWAP_PROVIDERS || "0x").trim();
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

module.exports = { listProviders };

