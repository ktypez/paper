const pairs = [
  { dot: "bg-amber-500 dark:bg-amber-400", text: "text-amber-800 dark:text-amber-300" },
  { dot: "bg-blue-500 dark:bg-blue-400", text: "text-blue-700 dark:text-blue-300" },
  { dot: "bg-green-500 dark:bg-green-400", text: "text-green-700 dark:text-green-300" },
  { dot: "bg-purple-500 dark:bg-purple-400", text: "text-purple-700 dark:text-purple-300" },
  { dot: "bg-rose-500 dark:bg-rose-400", text: "text-rose-700 dark:text-rose-300" },
  { dot: "bg-teal-500 dark:bg-teal-400", text: "text-teal-700 dark:text-teal-300" },
  { dot: "bg-indigo-500 dark:bg-indigo-400", text: "text-indigo-700 dark:text-indigo-300" },
  { dot: "bg-pink-500 dark:bg-pink-400", text: "text-pink-700 dark:text-pink-300" },
];

function hashKey(key: string): number {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return hash;
}

// Deterministic color per category so a category keeps its color regardless
// of sort, filter, pagination, or position.
export function categoryDot(key: string): string {
  return pairs[hashKey(key) % pairs.length].dot;
}

// Readable text color for a category's name label (AA on light & dark).
export function categoryText(key: string): string {
  return pairs[hashKey(key) % pairs.length].text;
}
