export async function pollEmailConfirm(input: {
  submissionId: string;
  userId: string;
  brokerId: string;
}): Promise<void> {
  console.log(`[STUB] pollEmailConfirm: ${input.submissionId}`);
  // TODO: replace with real alias inbox polling
}
