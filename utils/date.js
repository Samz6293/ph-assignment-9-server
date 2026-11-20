// Delivery dates are plain "YYYY-MM-DD" strings: they compare correctly with < and ===, and never shift with time zones

// today in Dhaka time, e.g. "2026-11-20" (the server runs in UTC on Vercel, 6 hours behind)
export const todayInDhaka = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Dhaka" });

// "2026-11-21" → "Sat 21 Nov", for messages a customer reads
export const formatDate = (date) => new Date(`${date}T00:00:00Z`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

// true for a real calendar date in "YYYY-MM-DD" form; the shape check first, then rejects dates like "2026-02-30"
export const isValidDate = (date) => typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date)
    && new Date(`${date}T00:00:00Z`).toISOString().startsWith(date);
