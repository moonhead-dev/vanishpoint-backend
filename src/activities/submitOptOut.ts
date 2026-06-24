import { RemovalInput } from "../workflows/RemovalWorkflow";

export async function submitOptOut(input: RemovalInput): Promise<string> {
  console.log(
    `[STUB] submitOptOut: ${input.brokerId} for user ${input.userId}`,
  );
  // TODO: replace with real Playwright submission
  return `submission-${Date.now()}`;
}
