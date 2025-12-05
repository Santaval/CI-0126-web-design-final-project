// Middleware to check if user is authenticated
function isAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
    });
}

// Middleware to check if user is not authenticated (for login/register pages)
function isNotAuthenticated(req, res, next) {
    if (!req.isAuthenticated()) {
        return next();
    }
    res.redirect('/');
}

module.exports = {
    isAuthenticated,
    isNotAuthenticated
};
