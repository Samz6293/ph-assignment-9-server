// helpers for $group results like [{ _id: "pending", count: 2 }, { _id: "accepted", count: 5 }]

// one group's count, or 0 when nothing has that role/status yet
export const countOf = (groups, key) => groups.find((group) => group._id === key)?.count ?? 0;

// every group added together
export const total = (groups) => groups.reduce((sum, group) => sum + group.count, 0);
