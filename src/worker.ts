import { Worker, NativeConnection } from "@temporalio/worker";
import * as activities from "./activities";

async function run() {
  const cert = Buffer.from(process.env.TEMPORAL_TLS_CERT!, "base64");
  const key = Buffer.from(process.env.TEMPORAL_TLS_KEY!, "base64");

  const connection = await NativeConnection.connect({
    address: process.env.TEMPORAL_ADDRESS!,
    tls: { clientCertPair: { crt: cert, key } },
  });

  const worker = await Worker.create({
    connection,
    namespace: process.env.TEMPORAL_NAMESPACE!,
    taskQueue: "broker-removal",
    workflowsPath: require.resolve("./workflows/RemovalWorkflow"),
    activities,
  });

  console.log("Worker started. Polling for tasks...");
  await worker.run(); // blocks indefinitely
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
