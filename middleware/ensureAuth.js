// middleware/ensureAuth.js
function ensureAuth(req, res, next) {
  if (req.session && req.session.student) return next();
  return res.redirect('/pages/login.html');
}

module.exports = ensureAuth;
