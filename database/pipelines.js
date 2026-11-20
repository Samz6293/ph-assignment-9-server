// steps shared by the public menu list and details: attach the vendor, but only their public fields
export const withPublicVendor = [
    {
        $lookup: {
            from: "users", localField: "vendorId", foreignField: "_id", as: "vendor",
            // pipeline runs on the matched user: keep only public fields (no email, role or block status)
            // subscriptionPlan: Premium vendors get a badge on their cards
            pipeline: [{ $project: { _id: 0, name: 1, businessName: 1, subscriptionPlan: 1 } }],
        },
    },
    { $unwind: "$vendor" },
];

// steps for a customer's orders: attach the item and the vendor who sells it, public fields only
export const withItemAndVendor = [
    {
        $lookup: {
            from: "menuItems", localField: "itemId", foreignField: "_id", as: "item",
            pipeline: [{ $project: { _id: 1, itemName: 1, images: 1, price: 1, category: 1 } }],
        },
    },
    // preserveNullAndEmptyArrays: an order stays in the list even if the vendor later deleted the item
    { $unwind: { path: "$item", preserveNullAndEmptyArrays: true } },
    {
        $lookup: {
            from: "users", localField: "vendorId", foreignField: "_id", as: "vendor",
            pipeline: [{ $project: { _id: 0, name: 1, businessName: 1 } }],
        },
    },
    { $unwind: { path: "$vendor", preserveNullAndEmptyArrays: true } },
];

// steps for a vendor's incoming orders: attach the item and the customer who ordered it
export const withItemAndCustomer = [
    {
        $lookup: {
            from: "menuItems", localField: "itemId", foreignField: "_id", as: "item",
            pipeline: [{ $project: { _id: 1, itemName: 1, images: 1, price: 1, category: 1 } }],
        },
    },
    { $unwind: { path: "$item", preserveNullAndEmptyArrays: true } },
    {
        $lookup: {
            from: "users", localField: "customerId", foreignField: "_id", as: "customer",
            // email so the vendor can reach the customer about the order
            pipeline: [{ $project: { _id: 0, name: 1, email: 1, image: 1 } }],
        },
    },
    { $unwind: { path: "$customer", preserveNullAndEmptyArrays: true } },
];

// steps for the admin's transactions list: attach the vendor who paid
export const withTransactionVendor = [
    {
        $lookup: {
            from: "users", localField: "vendorId", foreignField: "_id", as: "vendor",
            pipeline: [{ $project: { _id: 0, name: 1, email: 1, businessName: 1 } }],
        },
    },
    // a deleted vendor's payment still shows; transactions are a money record and never drop out
    { $unwind: { path: "$vendor", preserveNullAndEmptyArrays: true } },
];
