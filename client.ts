import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { JobQueue } from "./target/types/job_queue";

async function main() {
  // Set up the provider
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  // Load the program
  const program = anchor.workspace.JobQueue as Program<JobQueue>;

  console.log("Program ID:", program.programId.toBase58());
  console.log("Wallet:", provider.wallet.publicKey.toBase58());

  // Derive PDAs
  const admin = provider.wallet;
  const [queuePda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("queue"), admin.publicKey.toBuffer()],
    program.programId
  );

  console.log("Queue PDA:", queuePda.toBase58());

  try {
    const queueAccount = await program.account.queue.fetch(queuePda);
    console.log("Queue already initialized. Job count:", queueAccount.jobCount.toNumber());
  } catch (err) {
    console.log("Queue not initialized. Initializing...");
    const tx = await program.methods
      .initializeQueue()
      .accountsPartial({
        queue: queuePda,
        admin: admin.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();
    console.log("Initialized Queue! TX:", tx);
  }

  // Create a job
  const queueAccountBefore = await program.account.queue.fetch(queuePda);
  const jobCount = queueAccountBefore.jobCount;

  const [jobPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("job"), queuePda.toBuffer(), jobCount.toArrayLike(Buffer, "le", 8)],
    program.programId
  );

  console.log("Creating job at PDA:", jobPda.toBase58());
  
  const payload = "Hello from the client script";
  const tx2 = await program.methods
    .createJob(payload)
    .accountsPartial({
      queue: queuePda,
      job: jobPda,
      creator: admin.publicKey,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .rpc();
    
  console.log("Created Job! TX:", tx2);

  // Assign job
  console.log("Assigning job...");
  const tx3 = await program.methods
    .assignJob()
    .accountsPartial({
      job: jobPda,
      worker: admin.publicKey,
    })
    .rpc();
  console.log("Assigned Job! TX:", tx3);

  // Complete job
  console.log("Completing job...");
  const tx4 = await program.methods
    .completeJob()
    .accountsPartial({
      job: jobPda,
      worker: admin.publicKey,
    })
    .rpc();
  console.log("Completed Job! TX:", tx4);

  // Fetch final state
  const jobAccount = await program.account.job.fetch(jobPda);
  console.log("Final Job Status:", jobAccount.status);
}

main().catch(console.error);
