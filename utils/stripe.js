import Stripe from "stripe";
import "dotenv/config";

// one Stripe client for the whole server; the secret key never leaves it
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
