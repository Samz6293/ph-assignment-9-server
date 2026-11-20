import { menuItemsCollection } from "../database/collections.js";

// Free plan: at most 3 active items; pending and approved count, rejected and inactive don't
export const freePlanLimit = 3;
export const freePlanMessage = "Free plan allows 3 active items. Upgrade to Premium for unlimited.";

export const isAtFreeLimit = async (user) => {
    if (user.subscriptionPlan === "premium") return false;
    const activeCount = await menuItemsCollection.countDocuments({ vendorId: user._id, status: { $in: ["pending", "approved"] } });
    return activeCount >= freePlanLimit;
};
