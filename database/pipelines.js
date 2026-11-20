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
