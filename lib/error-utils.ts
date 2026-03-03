export function getErrorMessage(error: unknown): string {
  if (error instanceof AggregateError) {
    const inner = error.errors
      .map((item) => (item instanceof Error ? item.message : String(item)))
      .filter(Boolean)
      .join(" | ");

    return inner || error.message || "Unknown aggregate error";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}
