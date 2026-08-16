const dots = [
  { light: "bg-amber-500", dark: "dark:bg-amber-400" },
  { light: "bg-blue-500", dark: "dark:bg-blue-400" },
  { light: "bg-green-500", dark: "dark:bg-green-400" },
  { light: "bg-purple-500", dark: "dark:bg-purple-400" },
  { light: "bg-rose-500", dark: "dark:bg-rose-400" },
  { light: "bg-teal-500", dark: "dark:bg-teal-400" },
  { light: "bg-indigo-500", dark: "dark:bg-indigo-400" },
  { light: "bg-pink-500", dark: "dark:bg-pink-400" },
];

// Deterministic color per category so a category keeps its dot color
// regardless of sort, filter, pagination, or position.
export function categoryDot(key: string): string {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  const c = dots[hash % dots.length];
  return `${c.light} ${c.dark}`;
}
