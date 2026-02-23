import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { JobQueue } from "../target/types/job_queue";
import { assert } from "chai";

describe("job_queue", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.JobQueue as Program<JobQueue>;
  const admin = provider.wallet;
  const worker = anchor.web3.Keypair.generate();
  const creator = anchor.web3.Keypair.generate();

  let queuePda: anchor.web3.PublicKey;
  let queueBump: number;
  let jobPda: anchor.web3.PublicKey;
  let jobBump: number;

  before(async () => {
    // Airdrop SOL to worker and creator
    const sig1 = await provider.connection.requestAirdrop(worker.publicKey, 1000000000);
    const sig2 = await provider.connection.requestAirdrop(creator.publicKey, 1000000000);
    await provider.connection.confirmTransaction(sig1);
    await provider.connection.confirmTransaction(sig2);

    [queuePda, queueBump] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("queue"), admin.publicKey.toBuffer()],
      program.programId
    );
  });

  it("Initializes the queue", async () => {
    await program.methods
      .initializeQueue()
      .accounts({
        queue: queuePda,
        admin: admin.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const queueAccount = await program.account.queue.fetch(queuePda);
    assert.ok(queueAccount.admin.equals(admin.publicKey));
    assert.equal(queueAccount.jobCount.toNumber(), 0);
  });

  it("Creates a job", async () => {
    const queueAccountBefore = await program.account.queue.fetch(queuePda);
    const jobCount = queueAccountBefore.jobCount;

    [jobPda, jobBump] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("job"), queuePda.toBuffer(), jobCount.toArrayLike(Buffer, "le", 8)],
      program.programId
    );

    const payload = "test payload: fetch data";

    await program.methods
      .createJob(payload)
      .accounts({
        queue: queuePda,
        job: jobPda,
        creator: creator.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([creator])
      .rpc();

    const jobAccount = await program.account.job.fetch(jobPda);
    assert.ok(jobAccount.creator.equals(creator.publicKey));
    assert.equal(jobAccount.payload, payload);
    assert.deepEqual(jobAccount.status, { pending: {} });

    const queueAccountAfter = await program.account.queue.fetch(queuePda);
    assert.equal(queueAccountAfter.jobCount.toNumber(), 1);
  });

  it("Assigns a job to a worker", async () => {
    await program.methods
      .assignJob()
      .accounts({
        job: jobPda,
        worker: worker.publicKey,
      })
      .signers([worker])
      .rpc();

    const jobAccount = await program.account.job.fetch(jobPda);
    assert.deepEqual(jobAccount.status, { assigned: {} });
    assert.ok(jobAccount.worker.equals(worker.publicKey));
  });

  it("Completes a job", async () => {
    await program.methods
      .completeJob()
      .accounts({
        job: jobPda,
        worker: worker.publicKey,
      })
      .signers([worker])
      .rpc();

    const jobAccount = await program.account.job.fetch(jobPda);
    assert.deepEqual(jobAccount.status, { completed: {} });
  });
});
