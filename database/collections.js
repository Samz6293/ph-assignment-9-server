import { db } from "./connect.js";

// every collection the routes use; Better Auth writes users, the routes write the rest
export const usersCollection = db.collection("users");
// counting an empty collection gives 0, so the stats work before any data exists
export const menuItemsCollection = db.collection("menuItems");
export const transactionsCollection = db.collection("transactions");
export const ordersCollection = db.collection("orders");
