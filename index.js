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
// filled in later by the menu items and Stripe features; counting an empty collection gives 0
const menuItemsCollection = db.collection("menuItems");
const transactionsCollection = db.collection("transactions");

app.get("/", (req, res) => {
    res.send({message: "API Working"});
})

// Users
// the signed-in user's own account, straight from the database
app.get("/users/me", verifyToken, loadUser, (req, res) => {
    res.send(req.user);
});

// Admin: users
// every user except the admin asking, newest first; ?search= matches name or email, ?role= filters by role
app.get("/admin/users", verifyToken, loadUser, verifyRole("admin"), async (req, res) => {
    const { search, role } = req.query;
    // $ne: "not equal", so the signed-in admin is left out (the page shows them separately)
    const query = { _id: { $ne: req.user._id } };

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

// Menu items
// the six categories from the assignment; the client's dropdown uses the same list
const categories = ["Classic Pizzas", "Vegetarian Pizzas", "Meat Lovers", "Specialty / Gourmet Pizzas", "BBQ Pizza", "Italiano"];
const freePlanLimit = 3;

// Add a menu item (vendor): saved as pending until an admin approves it
app.post("/menu-items", verifyToken, loadUser, verifyRole("vendor"), async (req, res) => {
    const { itemName, category, description, price, location, images } = req.body ?? {};

    // the form checks these too, but anyone can call the API directly
    if (typeof itemName !== "string" || !itemName.trim()) return res.status(400).send({ message: "Enter the item's name" });
    if (!categories.includes(category)) return res.status(400).send({ message: "Choose a category from the list" });
    if (typeof description !== "string" || description.trim().length < 10) return res.status(400).send({ message: "Describe the item in at least 10 characters" });
    if (typeof price !== "number" || !(price > 0)) return res.status(400).send({ message: "Enter a price above 0" });
    if (typeof location !== "string" || !location.trim()) return res.status(400).send({ message: "Enter the area and city, e.g. Zindabazar, Sylhet" });

    const isValidImages = Array.isArray(images) && images.length >= 1 && images.length <= 4
        && images.every((url) => typeof url === "string" && url.startsWith("https://"));
    if (!isValidImages) return res.status(400).send({ message: "Upload between 1 and 4 images" });

    // Free plan: at most 3 active items; pending and approved count, rejected and inactive don't
    if (req.user.subscriptionPlan !== "premium") {
        const activeCount = await menuItemsCollection.countDocuments({ vendorId: req.user._id, status: { $in: ["pending", "approved"] } });
        if (activeCount >= freePlanLimit) return res.status(403).send({ message: "Free plan allows 3 active items. Upgrade to Premium for unlimited." });
    }

    const menuItem = {
        vendorId: req.user._id,
        itemName: itemName.trim(),
        category,
        description: description.trim(),
        price,
        location: location.trim(),
        images,
        status: "pending",
        createdAt: new Date(),
    };
    const result = await menuItemsCollection.insertOne(menuItem);
    res.status(201).send(result);
});

// Admin: menu items
// every item from every vendor, pending first so the review queue is on top; ?search= matches the name, ?status= filters
app.get("/admin/menu-items", verifyToken, loadUser, verifyRole("admin"), async (req, res) => {
    const { search, status } = req.query;
    const query = {};

    if (typeof search === "string" && search) {
        // escape regex symbols so the search is matched as plain text
        const safeSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        query.itemName = { $regex: safeSearch, $options: "i" };
    }
    if (["pending", "approved", "rejected", "inactive"].includes(status)) query.status = status;

    // aggregate runs the steps in order, like a pipeline
    const items = await menuItemsCollection.aggregate([
        { $match: query },
        // isPending: true/false per item, only used for sorting
        { $addFields: { isPending: { $eq: ["$status", "pending"] } } },
        { $sort: { isPending: -1, createdAt: -1 } },
        // $lookup: finds the vendor in users (vendorId = _id) and attaches them as an array called vendor
        { $lookup: { from: "users", localField: "vendorId", foreignField: "_id", as: "vendor" } },
        // $unwind: turns that one-item array into a plain object
        { $unwind: "$vendor" },
        // keep only what the page shows (no isPending, only safe vendor fields)
        { $project: { isPending: 0, vendor: { _id: 0, emailVerified: 0, createdAt: 0, updatedAt: 0, image: 0, isBlocked: 0, role: 0 } } },
    ]).toArray();

    res.send(items);
});

// Approve or reject a menu item: body { status: "approved" | "rejected" }
app.patch("/admin/menu-items/:id/status", verifyToken, loadUser, verifyRole("admin"), async (req, res) => {
    const id = req.params.id;
    const { status } = req.body ?? {};

    if (!ObjectId.isValid(id)) return res.status(404).send({ message: "This menu item doesn't exist" });
    if (!["approved", "rejected"].includes(status)) return res.status(400).send({ message: "Choose to approve or reject this item" });

    // verifying if item exists
    const item = await menuItemsCollection.findOne({ _id: new ObjectId(id) });
    if (!item) return res.status(404).send({ message: "This menu item doesn't exist" });

    // the vendor switched it off; approving it would put it back on the menu without them
    if (item.status === "inactive") return res.status(409).send({ message: "The vendor has made this item unavailable" });

    const result = await menuItemsCollection.updateOne({ _id: new ObjectId(id) }, { $set: { status } });
    res.send(result);
});

// Delete a menu item (admin): for items that break the rules
app.delete("/admin/menu-items/:id", verifyToken, loadUser, verifyRole("admin"), async (req, res) => {
    const id = req.params.id;
    if (!ObjectId.isValid(id)) return res.status(404).send({ message: "This menu item doesn't exist" });

    const result = await menuItemsCollection.deleteOne({ _id: new ObjectId(id) });
    // deletedCount 0: nothing had that id (already deleted, or never existed)
    if (result.deletedCount === 0) return res.status(404).send({ message: "This menu item doesn't exist" });

    res.send(result);
});

// Stats
// admin overview: numbers for the stat cards and the two charts
app.get("/stats/admin", verifyToken, loadUser, verifyRole("admin"), async (req, res) => {
    // $group puts documents with the same role together and counts them: [{ _id: "vendor", count: 2 }, ...]
    const usersByRole = await usersCollection.aggregate([
        { $group: { _id: "$role", count: { $sum: 1 } } },
    ]).toArray();
    const itemsByStatus = await menuItemsCollection.aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } },
    ]).toArray();
    const totalTransactions = await transactionsCollection.countDocuments();

    // reads one group's count, or 0 when nothing has that role/status yet
    const countOf = (groups, key) => groups.find((group) => group._id === key)?.count ?? 0;
    const total = (groups) => groups.reduce((sum, group) => sum + group.count, 0);

    res.send({
        totalUsers: total(usersByRole),
        customers: countOf(usersByRole, "customer"),
        vendors: countOf(usersByRole, "vendor"),
        admins: countOf(usersByRole, "admin"),
        totalMenuItems: total(itemsByStatus),
        pendingMenuItems: countOf(itemsByStatus, "pending"),
        approvedMenuItems: countOf(itemsByStatus, "approved"),
        rejectedMenuItems: countOf(itemsByStatus, "rejected"),
        totalTransactions,
    });
});

app.listen(PORT, ()=> {
    console.log(`Server running on: http://localhost:${PORT}`);
})