import Fastify from "fastify";
import { Connection, WorkflowClient } from "@temporalio/client";
import { RemovalWorkflow } from "./workflows/RemovalWorkflow";
import { db } from "./db";

const app = Fastify({ logger: true });

// ── Temporal client (shared across requests) ──────────────────────────────
let temporalClient: WorkflowClient;

async function buildTemporalClient() {
  const cert = Buffer.from(process.env.TEMPORAL_TLS_CERT!, "base64");
  const key = Buffer.from(process.env.TEMPORAL_TLS_KEY!, "base64");

  const connection = await Connection.connect({
    address: process.env.TEMPORAL_ADDRESS!,
    tls: { clientCertPair: { crt: cert, key } },
  });

  return new WorkflowClient({
    connection,
    namespace: process.env.TEMPORAL_NAMESPACE!,
  });
}

// ── Routes ────────────────────────────────────────────────────────────────

// Health check — Railway uses this to confirm the service is up
app.get("/health", async () => ({ status: "ok" }));

// Start removal workflows for a user (called from Next.js after subscription)
app.post("/api/users/:userId/removals", async (req, reply) => {
  const { userId } = req.params as { userId: string };
  const { brokerIds, userData } = req.body as {
    brokerIds: string[];
    userData: { name: string; address: string; email: string };
  };

  const workflows = await Promise.all(
    brokerIds.map((brokerId) =>
      temporalClient.start(RemovalWorkflow, {
        args: [{ userId, brokerId, userData }],
        taskQueue: "broker-removal",
        workflowId: `removal-${userId}-${brokerId}`,
      }),
    ),
  );

  return reply.code(201).send({
    started: workflows.map((w) => w.workflowId),
  });
});

// Get removal status for a user's dashboard
app.get("/api/users/:userId/removals", async (req) => {
  const { userId } = req.params as { userId: string };

  const rows = await db
    .selectFrom("removal_requests")
    .where("user_id", "=", userId)
    .selectAll()
    .execute();

  return { removals: rows };
});

// Stripe webhook — subscription created/cancelled/payment failed
app.post(
  "/webhooks/stripe",
  { config: { rawBody: true } },
  async (req, reply) => {
    const sig = req.headers["stripe-signature"] as string;
    // TODO: verify sig with stripe.webhooks.constructEvent()
    // then handle subscription.created, subscription.deleted, invoice.payment_failed
    return reply.code(200).send({ received: true });
  },
);

// ── TEST ONLY — remove before launch ─────────────────────────────────────
app.get("/test-workflow", async () => {
  const handle = await temporalClient.start(RemovalWorkflow, {
    args: [
      {
        userId: "test-user-1",
        brokerId: "thatsthem",
        userData: {
          name: "Test User",
          address: "123 Main St",
          email: "test@vanishpoint.co",
        },
      },
    ],
    taskQueue: "broker-removal",
    workflowId: `test-${Date.now()}`,
  });
  return { workflowId: handle.workflowId };
});

// ── Boot ──────────────────────────────────────────────────────────────────
async function start() {
  temporalClient = await buildTemporalClient();
  await app.listen({
    port: Number(process.env.PORT ?? "3001"),
    host: "0.0.0.0",
  });
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
