import { ObjectId } from "mongodb";
import { db } from "../database/connect.js";

const usersCollection = db.collection("users");

// reads the real user from the database; the token only proves who they are, not their role
export async function loadUser(req, res, next) {
    const user = await usersCollection.findOne({ _id: new ObjectId(req.userId) });
    if (!user) return res.status(401).send({ message: "This account no longer exists. Please sign up again" });

    // a block takes effect on the very next request, even with a valid token
    if (user.isBlocked) return res.status(403).send({ message: "Your account is blocked. Contact support" });

    req.user = user;
    next();
}
