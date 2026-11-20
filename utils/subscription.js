import { ObjectId } from "mongodb";
import { stripe } from "./stripe.js";
import { transactionsCollection, usersCollection } from "../database/collections.js";

// Premium after a paid checkout; the docs' fulfill_checkout (docs.stripe.com/checkout/fulfillment)
// safe to run twice for the same session: Stripe may send an event more than once
export async function fulfillCheckout(sessionId) {
    // fetch the session from Stripe itself instead of trusting the event's copy
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status === "unpaid") return;

    // already saved: this event was delivered before
    const existing = await transactionsCollection.findOne({ stripeSessionId: session.id });
    if (existing) return;

    // client_reference_id: the vendor's id, set by /create-checkout-session; a checkout without one isn't ours
    if (session.mode !== "subscription" || !ObjectId.isValid(session.client_reference_id)) return;
    const vendorId = new ObjectId(session.client_reference_id);

    // the paid-up-to date lives on the subscription's item (Stripe gives seconds, Date wants milliseconds)
    const subscription = await stripe.subscriptions.retrieve(session.subscription);
    const expiresAt = new Date(subscription.items.data[0].current_period_end * 1000);

    await transactionsCollection.insertOne({
        vendorId,
        plan: "premium",
        // Stripe counts in cents: 1299 → 12.99
        amount: session.amount_total / 100,
        currency: session.currency,
        stripeSessionId: session.id,
        stripeSubscriptionId: session.subscription,
        status: session.payment_status,
        createdAt: new Date(),
    });
    // cancelAtPeriodEnd: false, a fresh subscription renews every month
    await usersCollection.updateOne({ _id: vendorId }, { $set: { subscriptionPlan: "premium", subscriptionExpiresAt: expiresAt, cancelAtPeriodEnd: false } });
}

// back to Free when a subscription ends (cancelled, or a renewal payment failed for good)
export async function endPremium(subscription) {
    // metadata.vendorId: set through subscription_data in /create-checkout-session
    const vendorId = subscription.metadata?.vendorId;
    if (!vendorId || !ObjectId.isValid(vendorId)) return;

    await usersCollection.updateOne({ _id: new ObjectId(vendorId) }, { $set: { subscriptionPlan: "free", subscriptionExpiresAt: null, cancelAtPeriodEnd: false } });
}

// the vendor's current Stripe subscription id, from their newest payment; null if they never paid
export async function getSubscriptionId(vendorId) {
    const [transaction] = await transactionsCollection.find({ vendorId }).sort({ createdAt: -1 }).limit(1).toArray();
    return transaction?.stripeSubscriptionId ?? null;
}
