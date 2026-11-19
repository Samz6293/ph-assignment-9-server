import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { ObjectId } from 'mongodb';
import { connectToMongoDB, db } from './database/connect.js';
import { verifyToken } from './middleware/verifyToken.js';
import { loadUser } from './middleware/loadUser.js';
import { verifyRole } from './middleware/verifyRole.js';

const app = express();
const PORT = 8080;
app.use(cors());
app.use(express.json());

// Database connect;
const mongoClient = await connectToMongoDB();
const usersCollection = db.collection("users");

app.get("/", (req, res) => {
    res.send({message: "API Working"});
})

// Users
// the signed-in user's own account, straight from the database
app.get("/users/me", verifyToken, loadUser, (req, res) => {
    res.send(req.user);
});

// Admin: users
// every user, newest first; ?search= matches name or email, ?role= filters by role
app.get("/admin/users", verifyToken, loadUser, verifyRole("admin"), async (req, res) => {
    const { search, role } = req.query;
    const query = {};

    if (typeof search === "string" && search) {
        // escape regex symbols so a search like "a.b" matches the text "a.b" literally
        const safeSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        query.$or = [
            { name: { $regex: safeSearch, $options: "i" } },
            { email: { $regex: safeSearch, $options: "i" } },
        ];
    }
    if (["customer", "vendor", "admin"].includes(role)) query.role = role;

    const users = await usersCollection.find(query).sort({ createdAt: -1 }).toArray();
    res.send(users);
});

// Block or unblock a user: body { isBlocked: true | false }
app.patch("/admin/users/:id/block", verifyToken, loadUser, verifyRole("admin"), async (req, res) => {
    const id = req.params.id;
    const { isBlocked } = req.body ?? {};

    if (!ObjectId.isValid(id)) return res.status(404).send({ message: "This user doesn't exist" });
    if (typeof isBlocked !== "boolean") return res.status(400).send({ message: "Choose to block or unblock this user" });

    // verifying if user exists
    const user = await usersCollection.findOne({ _id: new ObjectId(id) });
    if (!user) return res.status(404).send({ message: "This user doesn't exist" });

    // admins (including yourself) can't be blocked
    if (user.role === "admin") return res.status(403).send({ message: "Admins can't be blocked" });

    const result = await usersCollection.updateOne({ _id: new ObjectId(id) }, { $set: { isBlocked } });
    res.send(result);
});

app.listen(PORT, ()=> {
    console.log(`Server runnig on: http://localhost:${PORT}`);
})