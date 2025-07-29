// access/authRole.js

// 1 role
function requireRole(role) {
    return (req, res, next) => {
      if (!req.session || !req.session.userId) {
        req.flash('error', 'You must be logged in.');
        return res.redirect('/login');
      }
  
      if (req.session.role !== role) {
        req.flash('error', 'Access denied.');
        return res.redirect('/home');
      }
  
      next();
    };
  }
  
  // Multiple roles
  function requireAnyRole(roles) {
    return (req, res, next) => {
      if (!req.session || !req.session.userId) {
        req.flash('error', 'You must be logged in.');
        return res.redirect('/login');
      }
  
      if (!roles.includes(req.session.role)) {
        req.flash('error', 'Access denied.');
        return res.redirect('/home');
      }
  
      next();
    };
  }
  
  module.exports = {
    requireRole,
    requireAnyRole
  };
  