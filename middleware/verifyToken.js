import { createRemoteJWKSet, jwtVerify } from "jose";
import "dotenv/config";

// Better Auth's public keys; jose downloads them once and caches them
const JWKS = createRemoteJWKSet(new URL(process.env.JWKS_URL));

// checks the Bearer token and puts the signed-in user's id on req.userId
export async function verifyToken(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) return res.status(401).send({ message: "Please sign in to continue" });

    const token = authHeader.split(" ")[1];

    try {
        // fails if the signature is wrong, the token expired, or it came from another site
        const { payload } = await jwtVerify(token, JWKS, {
            issuer: process.env.CLIENT_URL,
            audience: process.env.CLIENT_URL,
        });

        // only the id: loadUser reads the real role and isBlocked from the database
        req.userId = payload.sub;
        next();
    }
    catch {
        return res.status(401).send({ message: "Your session has expired. Please sign in again" });
    }
}
