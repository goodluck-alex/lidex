const usersByAddress = new Map(); // addressLower -> user

function normalizeAddress(address) {
  return String(address).toLowerCase();
}

function getOrCreateUserByAddress(address) {
  const key = normalizeAddress(address);
  let user = usersByAddress.get(key);
  if (!user) {
    user = {
      id: `user_${key}`,
      address: key,
      createdAt: Date.now(),
      referralParent: null,
      preferences: {}
    };
    usersByAddress.set(key, user);
  }
  return user;
}

function getUserByAddress(address) {
  return usersByAddress.get(normalizeAddress(address)) || null;
}

module.exports = { getOrCreateUserByAddress, getUserByAddress };

