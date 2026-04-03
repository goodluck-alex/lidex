const cookieParser = require("cookie-parser");
const { COOKIE_NAME, getSession } = require("../modules/auth/auth.session");
const { getUserByAddress } = require("../modules/users/users.model");

function sessionMiddleware() {
  const parse = cookieParser();
  return (req, res, next) => {
    parse(req, res, () => {
      const sid = req.cookies?.[COOKIE_NAME];
      Promise.resolve()
        .then(async () => {
          const session = await getSession(sid);
          if (session) {
            const fullUser = await getUserByAddress(session.userAddress);
            req.user = fullUser || { address: session.userAddress };
          }
        })
        .then(() => next())
        .catch(next);
    });
  };
}

module.exports = { sessionMiddleware };
