export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    try {
      const parsed = JSON.parse(error.message);
      if (parsed && typeof parsed === 'object' && parsed.message) {
        return String(parsed.message);
      }
    } catch {
      // Not JSON — use message as-is
    }
    return error.message;
  }
  return fallback;
}