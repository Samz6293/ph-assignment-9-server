// escapes characters that mean something in a regex (. * + ? and so on), so a search for "c++" finds "c++" literally
export const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
