import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { ObjectId } from 'mongodb';
import { connectToMongoDB } from './database/connect.js';
import { usersCollection, menuItemsCollection, transactionsCollection, ordersCollection } from './database/collections.js';
import { withItemAndCustomer, withItemAndVendor, withPublicVendor } from './database/pipelines.js';
import { verifyToken } from './middleware/verifyToken.js';
import { loadUser } from './middleware/loadUser.js';
import { verifyRole } from './middleware/verifyRole.js';
import { categories, validateMenuItem } from './validation/menuItem.js';
import { validateOrder } from './validation/order.js';
import { formatDate } from './utils/date.js';
import { freePlanMessage, isAtFreeLimit } from './utils/freePlan.js';
import { escapeRegex } from './utils/regex.js';
import { countOf, total } from './utils/stats.js';
import { stripe } from './utils/stripe.js';
import { endPremium, fulfillCheckout } from './utils/subscription.js';

const app = express();
const PORT = 8080;
app.use(cors());

// Stripe webhook: Stripe tells us a payment went through; the only place Premium is switched on
app.post("/webhook", express.raw({ type: "application/json" }), async (req, res) => {
    const signature = req.headers["stripe-signature"];

    // fails unless Stripe signed this request with our STRIPE_WEBHOOK_SECRET, so a fake "paid" message is rejected
    let event;
    try {
        event = stripe.webhooks.constructEvent(req.body, signature, process.env.STRIPE_WEBHOOK_SECRET);
    }
    catch (err) {
        return res.status(400).send({ message: `Webhook Error: ${err.message}` });
    }

    if (event.type === "checkout.session.completed") await fulfillCheckout(event.data.object.id);
    if (event.type === "customer.subscription.deleted") await endPremium(event.data.object);

    // a 2xx tells Stripe we got it; anything else makes Stripe try again later
    res.send({ received: true });
});

app.use(express.json());

// Database connect;
const mongoClient = await connectToMongoDB();

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
        const safeSearch = escapeRegex(search);
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
// Add a menu item (vendor): saved as pending until an admin approves it
app.post("/menu-items", verifyToken, loadUser, verifyRole("vendor"), async (req, res) => {
    const body = req.body ?? {};

    // the form checks these too, but anyone can call the API directly
    const error = validateMenuItem(body);
    if (error) return res.status(400).send({ message: error });
    if (await isAtFreeLimit(req.user)) return res.status(403).send({ message: freePlanMessage });

    const menuItem = {
        vendorId: req.user._id,
        itemName: body.itemName.trim(),
        category: body.category,
        description: body.description.trim(),
        price: body.price,
        location: body.location.trim(),
        images: body.images,
        status: "pending",
        createdAt: new Date(),
    };
    const result = await menuItemsCollection.insertOne(menuItem);
    res.status(201).send(result);
});

// The vendor's own items, newest first, every status (rejected ones included, so they know)
app.get("/menu-items/mine", verifyToken, loadUser, verifyRole("vendor"), async (req, res) => {
    const items = await menuItemsCollection.find({ vendorId: req.user._id }).sort({ createdAt: -1 }).toArray();
    res.send(items);
});

// Edit an item (owner): any edit goes back to pending, so an admin checks the new content
app.patch("/menu-items/:id", verifyToken, loadUser, verifyRole("vendor"), async (req, res) => {
    const id = req.params.id;
    const body = req.body ?? {};
    if (!ObjectId.isValid(id)) return res.status(404).send({ message: "This menu item doesn't exist" });

    // verifying if item exists and belongs to this vendor
    const item = await menuItemsCollection.findOne({ _id: new ObjectId(id) });
    if (!item) return res.status(404).send({ message: "This menu item doesn't exist" });
    // .equals: ObjectIds are objects, so === would compare two different objects and always be false
    if (!item.vendorId.equals(req.user._id)) return res.status(403).send({ message: "You can only edit your own items" });

    const error = validateMenuItem(body);
    if (error) return res.status(400).send({ message: error });

    // a rejected or inactive item becomes pending (active) again, so the Free plan limit applies
    const isActive = ["pending", "approved"].includes(item.status);
    if (!isActive && await isAtFreeLimit(req.user)) return res.status(403).send({ message: freePlanMessage });

    const result = await menuItemsCollection.updateOne({ _id: item._id }, {
        $set: {
            itemName: body.itemName.trim(),
            category: body.category,
            description: body.description.trim(),
            price: body.price,
            location: body.location.trim(),
            images: body.images,
            status: "pending",
            updatedAt: new Date(),
        },
    });
    res.send(result);
});

// Switch an approved item off or back on (owner): body { isAvailable: true | false }
app.patch("/menu-items/:id/availability", verifyToken, loadUser, verifyRole("vendor"), async (req, res) => {
    const id = req.params.id;
    const { isAvailable } = req.body ?? {};
    if (!ObjectId.isValid(id)) return res.status(404).send({ message: "This menu item doesn't exist" });
    if (typeof isAvailable !== "boolean") return res.status(400).send({ message: "Choose to show or hide this item" });

    // verifying if item exists and belongs to this vendor
    const item = await menuItemsCollection.findOne({ _id: new ObjectId(id) });
    if (!item) return res.status(404).send({ message: "This menu item doesn't exist" });
    if (!item.vendorId.equals(req.user._id)) return res.status(403).send({ message: "You can only change your own items" });

    // only approved items go off (approved → inactive) and back on (inactive → approved), so nothing skips review
    if (!isAvailable && item.status !== "approved") return res.status(409).send({ message: "Only approved items can be switched off" });
    if (isAvailable && item.status !== "inactive") return res.status(409).send({ message: "This item isn't switched off" });

    // switching on makes it active again, so the Free plan limit applies
    if (isAvailable && await isAtFreeLimit(req.user)) return res.status(403).send({ message: freePlanMessage });

    const result = await menuItemsCollection.updateOne({ _id: item._id }, { $set: { status: isAvailable ? "approved" : "inactive" } });
    res.send(result);
});

// Delete an item (owner)
app.delete("/menu-items/:id", verifyToken, loadUser, verifyRole("vendor"), async (req, res) => {
    const id = req.params.id;
    if (!ObjectId.isValid(id)) return res.status(404).send({ message: "This menu item doesn't exist" });

    // verifying if item exists and belongs to this vendor
    const item = await menuItemsCollection.findOne({ _id: new ObjectId(id) });
    if (!item) return res.status(404).send({ message: "This menu item doesn't exist" });
    if (!item.vendorId.equals(req.user._id)) return res.status(403).send({ message: "You can only delete your own items" });

    const result = await menuItemsCollection.deleteOne({ _id: item._id });
    res.send(result);
});

// Public: the menu
// Browse Menu + Featured: only approved items; ?search= ?category= ?location= ?sort=price_asc|price_desc|featured ?limit=
app.get("/menu-items", async (req, res) => {
    const { search, category, location, sort, limit } = req.query;
    // inactive items are approved items the vendor switched off, so "approved" alone means live
    const query = { status: "approved" };

    if (typeof search === "string" && search) {
        const safeSearch = escapeRegex(search);
        // matches the item name or its category, so "dessert" finds Brownie as well as "Chocolate Dessert Pizza"
        query.$or = [
            { itemName: { $regex: safeSearch, $options: "i" } },
            { category: { $regex: safeSearch, $options: "i" } },
        ];
    }
    if (categories.includes(category)) query.category = category;
    if (typeof location === "string" && location) {
        // the area is typed by vendors, so "zindabazar" should match "Zindabazar, Sylhet"
        const safeLocation = escapeRegex(location);
        query.location = { $regex: safeLocation, $options: "i" };
    }

    // newest first unless a price sort is asked for; _id breaks ties so the order never jumps around
    // featured (home page): "premium" sorts after "free" A–Z, so -1 puts Premium vendors' items first
    const sortBy = sort === "price_asc" ? { price: 1, _id: 1 }
        : sort === "price_desc" ? { price: -1, _id: 1 }
        : sort === "featured" ? { "vendor.subscriptionPlan": -1, createdAt: -1, _id: 1 }
        : { createdAt: -1, _id: 1 };

    // ?limit= between 1 and 50; anything else gets the full cap of 50
    const limitNumber = Number(limit);
    const safeLimit = Number.isInteger(limitNumber) && limitNumber >= 1 && limitNumber <= 50 ? limitNumber : 50;

    const items = await menuItemsCollection.aggregate([
        { $match: query },
        // vendor is attached before sorting, so the featured sort can read their plan
        ...withPublicVendor,
        { $sort: sortBy },
        { $limit: safeLimit },
    ]).toArray();

    res.send(items);
});

// every area that has a live item, A–Z, for the location filter
app.get("/menu-items/locations", async (req, res) => {
    // distinct: each different value once
    const locations = await menuItemsCollection.distinct("location", { status: "approved" });
    res.send(locations.sort());
});

// Item Details: approved items, and switched-off ones (shown as "Not available to order"); never pending or rejected
app.get("/menu-items/:id", async (req, res) => {
    const id = req.params.id;
    if (!ObjectId.isValid(id)) return res.status(404).send({ message: "This menu item doesn't exist" });

    const [item] = await menuItemsCollection.aggregate([
        { $match: { _id: new ObjectId(id), status: { $in: ["approved", "inactive"] } } },
        ...withPublicVendor,
    ]).toArray();
    if (!item) return res.status(404).send({ message: "This menu item doesn't exist" });

    res.send(item);
});

// Admin: menu items
// every item from every vendor, pending first so the review queue is on top; ?search= matches the name, ?status= filters
app.get("/admin/menu-items", verifyToken, loadUser, verifyRole("admin"), async (req, res) => {
    const { search, status } = req.query;
    const query = {};

    if (typeof search === "string" && search) {
        // escape regex symbols so the search is matched as plain text
        const safeSearch = escapeRegex(search);
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

// Orders
// Place an order (customer): saved as pending until the vendor accepts or rejects it
app.post("/orders", verifyToken, loadUser, verifyRole("customer"), async (req, res) => {
    const body = req.body ?? {};

    const error = validateOrder(body);
    if (error) return res.status(400).send({ message: error });

    // pending and rejected items don't exist for customers; switched-off ones exist but can't be ordered
    const item = await menuItemsCollection.findOne({ _id: new ObjectId(body.itemId) });
    if (!item || !["approved", "inactive"].includes(item.status)) return res.status(404).send({ message: "This menu item doesn't exist" });
    if (item.status === "inactive") return res.status(400).send({ message: "This item isn't available to order right now" });

    // verifyRole already keeps vendors out; this guards the rule itself in case roles ever overlap
    if (item.vendorId.equals(req.user._id)) return res.status(403).send({ message: "You can't order your own item" });

    // one active order per item per day; a cancelled or rejected one doesn't block a new order
    const duplicate = await ordersCollection.findOne({
        itemId: item._id,
        customerId: req.user._id,
        deliveryDate: body.deliveryDate,
        status: { $in: ["pending", "accepted"] },
    });
    if (duplicate) return res.status(409).send({ message: `You already ordered this for ${formatDate(body.deliveryDate)}` });

    const order = {
        itemId: item._id,
        vendorId: item.vendorId,
        customerId: req.user._id,
        deliveryDate: body.deliveryDate,
        deliveryAddress: body.deliveryAddress.trim(),
        message: body.message?.trim() ?? "",
        status: "pending",
        createdAt: new Date(),
    };
    const result = await ordersCollection.insertOne(order);
    res.status(201).send(result);
});

// The customer's own orders, newest first, with the item and vendor attached
app.get("/orders/mine", verifyToken, loadUser, verifyRole("customer"), async (req, res) => {
    const orders = await ordersCollection.aggregate([
        { $match: { customerId: req.user._id } },
        { $sort: { createdAt: -1, _id: 1 } },
        ...withItemAndVendor,
    ]).toArray();
    res.send(orders);
});

// Cancel an order (owner): only while it's still pending
app.patch("/orders/:id/cancel", verifyToken, loadUser, verifyRole("customer"), async (req, res) => {
    const id = req.params.id;
    if (!ObjectId.isValid(id)) return res.status(404).send({ message: "This order doesn't exist" });

    const order = await ordersCollection.findOne({ _id: new ObjectId(id) });
    if (!order) return res.status(404).send({ message: "This order doesn't exist" });
    if (!order.customerId.equals(req.user._id)) return res.status(403).send({ message: "You can only cancel your own orders" });
    // accepted, rejected and cancelled are final
    if (order.status !== "pending") return res.status(400).send({ message: `Only pending orders can be cancelled. This one is ${order.status}` });

    const result = await ordersCollection.updateOne({ _id: order._id }, { $set: { status: "cancelled" } });
    res.send(result);
});

// Orders for the vendor's items, newest first, with the item and customer attached
app.get("/orders/vendor", verifyToken, loadUser, verifyRole("vendor"), async (req, res) => {
    const orders = await ordersCollection.aggregate([
        { $match: { vendorId: req.user._id } },
        { $sort: { createdAt: -1, _id: 1 } },
        ...withItemAndCustomer,
    ]).toArray();
    res.send(orders);
});

// Accept or reject an order (the item's vendor): body { status: "accepted" | "rejected" }, pending orders only, once
app.patch("/orders/:id/status", verifyToken, loadUser, verifyRole("vendor"), async (req, res) => {
    const id = req.params.id;
    const status = req.body?.status;
    if (!["accepted", "rejected"].includes(status)) return res.status(400).send({ message: "Choose accept or reject" });
    if (!ObjectId.isValid(id)) return res.status(404).send({ message: "This order doesn't exist" });

    const order = await ordersCollection.findOne({ _id: new ObjectId(id) });
    if (!order) return res.status(404).send({ message: "This order doesn't exist" });
    if (!order.vendorId.equals(req.user._id)) return res.status(403).send({ message: "You can only manage orders for your own items" });
    if (order.status !== "pending") return res.status(400).send({ message: `This order is already ${order.status}` });

    // status: "pending" in the filter too: if two clicks arrive together, only the first one changes anything
    const result = await ordersCollection.updateOne({ _id: order._id, status: "pending" }, { $set: { status } });
    if (result.modifiedCount === 0) return res.status(400).send({ message: "This order was already answered" });

    res.send(result);
});

// Subscriptions
// Upgrade to Premium (vendor): creates a Stripe-hosted Checkout page and sends back its link
// follows Stripe's "Build a Stripe-hosted checkout page" quickstart (docs.stripe.com/payments/checkout)
// Premium is NOT switched on here; only the webhook does that, after Stripe confirms the payment
app.post("/create-checkout-session", verifyToken, loadUser, verifyRole("vendor"), async (req, res) => {
    if (req.user.subscriptionPlan === "premium") return res.status(400).send({ message: "You're already on Premium" });

    const vendorId = req.user._id.toString();
    const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        line_items: [
            {
                // Provide the exact Price ID (for example, price_1234) of the product you want to sell
                price: process.env.STRIPE_PREMIUM_PRICE_ID,
                quantity: 1,
            },
        ],
        customer_email: req.user.email,
        // who paid: the webhook reads this to know which vendor to upgrade
        client_reference_id: vendorId,
        // stored on the subscription too, so its "deleted" event months later still says whose it was
        subscription_data: { metadata: { vendorId } },
        // Stripe swaps {CHECKOUT_SESSION_ID} for the real id, so the success page can check on it
        success_url: `${process.env.CLIENT_URL}/dashboard/vendor/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.CLIENT_URL}/dashboard/vendor/subscription/cancel`,
    });

    // the docs answer with res.redirect(303, session.url) to a plain form; our client calls this with fetch
    // (it has to send the Bearer token), and fetch can't open stripe.com as a page, so the client redirects itself
    res.send({ url: session.url });
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

// vendor overview: their items and the orders for them, plus their plan
app.get("/stats/vendor", verifyToken, loadUser, verifyRole("vendor"), async (req, res) => {
    const itemsByStatus = await menuItemsCollection.aggregate([
        { $match: { vendorId: req.user._id } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
    ]).toArray();
    const ordersByStatus = await ordersCollection.aggregate([
        { $match: { vendorId: req.user._id } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
    ]).toArray();

    res.send({
        totalMenuItems: total(itemsByStatus),
        // active: the same meaning as the Free plan limit (pending + approved)
        activeMenuItems: countOf(itemsByStatus, "pending") + countOf(itemsByStatus, "approved"),
        pendingMenuItems: countOf(itemsByStatus, "pending"),
        approvedMenuItems: countOf(itemsByStatus, "approved"),
        rejectedMenuItems: countOf(itemsByStatus, "rejected"),
        inactiveMenuItems: countOf(itemsByStatus, "inactive"),
        pendingOrders: countOf(ordersByStatus, "pending"),
        acceptedOrders: countOf(ordersByStatus, "accepted"),
        rejectedOrders: countOf(ordersByStatus, "rejected"),
        cancelledOrders: countOf(ordersByStatus, "cancelled"),
        subscriptionPlan: req.user.subscriptionPlan === "premium" ? "premium" : "free",
    });
});

// customer overview: their orders by status
app.get("/stats/customer", verifyToken, loadUser, verifyRole("customer"), async (req, res) => {
    const ordersByStatus = await ordersCollection.aggregate([
        { $match: { customerId: req.user._id } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
    ]).toArray();

    res.send({
        totalOrders: total(ordersByStatus),
        pendingOrders: countOf(ordersByStatus, "pending"),
        acceptedOrders: countOf(ordersByStatus, "accepted"),
        rejectedOrders: countOf(ordersByStatus, "rejected"),
        cancelledOrders: countOf(ordersByStatus, "cancelled"),
    });
});

// Errors
// any error a route didn't handle (bad JSON, a database failure): JSON for the toast, details only in the server log
// Express knows this is the error handler because it takes 4 arguments, so next has to stay even though it's unused
app.use((err, req, res, next) => {
    console.error(err);
    res.status(err.status || 500).send({ message: err.status === 400 ? "The request was badly formed" : "Something went wrong on our side" });
});

app.listen(PORT, ()=> {
    console.log(`Server running on: http://localhost:${PORT}`);
})