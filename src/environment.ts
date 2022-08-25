export function getEnvironment<T extends readonly string[]>(keys: T) {
  type VariableName = T[number];

  const variables = keys.reduce<Record<VariableName, string | null>>(
    (acc, name: VariableName) => {
      acc[name] = process.env[name] ?? null;
      return acc;
    },
    {} as Record<VariableName, string>
  );

  const missing = Object.entries(variables)
    .filter(([key, value]) => value === null)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(`Missing environment variables ${missing.join(", ")}`);
  }

  return variables as Record<VariableName, string>;
}

export const env = getEnvironment([
  "NOTION_TOKEN",
  "NOTION_DATABASE_ID",
  "TODOIST_TOKEN",
  "TODOIST_PROJECT_ID",
  "SYNC_INTERVAL_MINUTES",
] as const);
