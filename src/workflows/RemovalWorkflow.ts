// src/workflows/RemovalWorkflow.ts
import { proxyActivities, sleep } from "@temporalio/workflow";
import type * as activities from "../activities";

const { submitOptOut, pollEmailConfirm } = proxyActivities<typeof activities>({
  startToCloseTimeout: "10 minutes",
  retry: { maximumAttempts: 3 },
});

export interface RemovalInput {
  userId: string;
  brokerId: string;
  userData: { name: string; address: string; email: string };
}

export async function RemovalWorkflow(input: RemovalInput): Promise<void> {
  // Step 1: submit the opt-out form
  const submissionId = await submitOptOut(input);

  // Step 2: wait for email confirmation (48h timeout handled in activity)
  await pollEmailConfirm({ submissionId, ...input });

  // Step 3: sleep until re-submission window (75 days)
  // Temporal Cloud holds this sleep durably - the worker can restart freely
  await sleep("75 days");

  // Step 4: re-submit (recursive - workflow loops indefinitely per subscriber)
  await RemovalWorkflow(input);
}
