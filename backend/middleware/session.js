const cookieParser = require("cookie-parser");
const { COOKIE_NAME, getSession } = require("../modules/auth/auth.session");
const { getUserByAddress } = require("../modules/users/users.model");

function sessionMiddleware() {
  const parse = cookieParser();
  return (req, res, next) => {
    parse(req, res, () => {
      const sid = req.cookies?.[COOKIE_NAME];
      const session = getSession(sid);
      if (session) {
        req.user = getUserByAddress(session.userAddress) || { address: session.userAddress };
      }
      next();
    });
  };
}

module.exports = { sessionMiddleware };

