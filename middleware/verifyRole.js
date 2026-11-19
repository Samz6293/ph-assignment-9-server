// verifyRole("admin") builds a middleware that only lets admins through
// runs after loadUser, so req.user.role comes from the database
export function verifyRole(role) {
    return (req, res, next) => {
        if (req.user.role !== role) return res.status(403).send({ message: `Only ${role}s are allowed to do this` });
        next();
    };
}
