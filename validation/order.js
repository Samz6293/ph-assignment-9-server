import { ObjectId } from "mongodb";
import { isValidDate, todayInDhaka } from "../utils/date.js";

// checks the customer's order form; returns the error message, or null when everything is fine
export const validateOrder = ({ itemId, deliveryDate, deliveryAddress, message }) => {
    if (typeof itemId !== "string" || !ObjectId.isValid(itemId)) return "Choose a menu item to order";
    if (!isValidDate(deliveryDate)) return "Choose a delivery date";
    if (deliveryDate < todayInDhaka()) return "Choose today or a later date";
    if (typeof deliveryAddress !== "string" || deliveryAddress.trim().length < 10) return "Enter the full delivery address";
    // message is optional, but if it's sent it must be text
    if (message !== undefined && typeof message !== "string") return "The message must be text";
    if (typeof message === "string" && message.trim().length > 300) return "Keep the message under 300 characters";

    return null;
};
