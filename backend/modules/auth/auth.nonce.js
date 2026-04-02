const crypto = require("crypto");

const nonces = new Map(); // addressLower -> { nonce, issuedAt }

function issueNonce(address) {
  const key = String(address).toLowerCase();
  const nonce = crypto.randomBytes(16).toString("hex");
  nonces.set(key, { nonce, issuedAt: Date.now() });
  return nonce;
}

function consumeNonce(address, nonce) {
  const key = String(address).toLowerCase();
  const entry = nonces.get(key);
  if (!entry) return false;
  if (entry.nonce !== nonce) return false;
  nonces.delete(key);
  return true;
}

module.exports = { issueNonce, consumeNonce };

