// the six categories from the assignment; the client's dropdown uses the same list (lib/menu.ts)
export const categories = ["Classic Pizzas", "Vegetarian Pizzas", "Meat Lovers", "Specialty / Gourmet Pizzas", "Sides & Appetizers", "Beverages & Desserts"];

// checks a vendor's item form; returns the error message, or null when everything is fine
// shared by create and edit so both always follow the same rules
export const validateMenuItem = ({ itemName, category, description, price, location, images }) => {
    if (typeof itemName !== "string" || !itemName.trim()) return "Enter the item's name";
    if (!categories.includes(category)) return "Choose a category from the list";
    if (typeof description !== "string" || description.trim().length < 10) return "Describe the item in at least 10 characters";
    if (typeof price !== "number" || !(price > 0)) return "Enter a price above 0";
    if (typeof location !== "string" || !location.trim()) return "Enter the area and city, e.g. Zindabazar, Sylhet";

    const isValidImages = Array.isArray(images) && images.length >= 1 && images.length <= 4
        && images.every((url) => typeof url === "string" && url.startsWith("https://"));
    if (!isValidImages) return "Upload between 1 and 4 images";

    return null;
};
