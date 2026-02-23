# Job Queue on Solana

This project is a decentralized Job Queue built on Solana using the Anchor framework, functioning as an alternative to traditional Web2 backend job queues.

## Architecture Comparison: Web2 vs Solana

### Web2 Architecture
In a traditional Web2 backend (like Celery, BullMQ, or AWS SQS):
- **Storage:** Jobs are stored in a centralized database or in-memory store like Redis or PostgreSQL.
- **Queue Management:** A central server process manages the queue, handling job insertion, fetching, and completion.
- **Workers:** Distributed worker nodes poll the central queue for available jobs, execute them, and report back the status.
- **State:** The entire state is mutated by trusted worker nodes with direct access to the database.

### Solana Architecture
In our Web3 implementation on Solana:
- **Storage:** Jobs are stored on-chain as individual accounts using Program Derived Addresses (PDAs). The state is public, immutable, and verifiable.
- **Queue Management:** The Solana program (smart contract) contains the logic for creating, assigning, and completing jobs. It acts as the immutable queue manager.
- **Workers (Crankers):** Off-chain workers (clients) query the RPC nodes for pending job accounts, execute the necessary off-chain logic (if any), and submit a transaction to the program to mark the job as completed.
- **State:** State transitions are enforced by the on-chain program. Only the assigned worker or the program logic can update the job status, ensuring cryptographic security and transparency.

## Program Flow
1. **Create Job:** A user submits a transaction to create a new job. A PDA is allocated to store the job data (payload, status, creator).
2. **Assign Job:** A worker claims an available job. The program updates the job account to reflect the assigned worker.
3. **Complete Job:** The worker finishes the task and submits a transaction to mark the job as completed. The program verifies the worker and updates the status.

## Development Setup
Built with Anchor.

```bash
anchor build
anchor test
```

## Devnet Deployment

The Job Queue program is successfully deployed and running on the Solana Devnet.

- **Program ID:** `HAUSpRwSCmmDH66xs4sVaTx5u4uiqTdvjcG2notGa4Gy`
- **Network:** Devnet

### Example Transactions
You can verify the end-to-end functionality of the Job Queue on the Solana Explorer (Devnet):

- **Create Job:** [YhUpa361u1R91TKKuNTLMCTfC5WTYCGNGwy338Eh7hEBzD5skxxaQNu5BuwSszUikQfSL9MNPCBQWfcHnKBpS5k](https://explorer.solana.com/tx/YhUpa361u1R91TKKuNTLMCTfC5WTYCGNGwy338Eh7hEBzD5skxxaQNu5BuwSszUikQfSL9MNPCBQWfcHnKBpS5k?cluster=devnet)
- **Assign Job:** [2bdtFz3UgY1ZgUphRpD854vW7wxQR1VJm8imtqT1qbPYeC5touXiscP3nmGmi1VhpYfQRn4mnRwu2T9umdBCyne](https://explorer.solana.com/tx/2bdtFz3UgY1ZgUphRpD854vW7wxQR1VJm8imtqT1qbPYeC5touXiscP3nmGmi1VhpYfQRn4mnRwu2T9umdBCyne?cluster=devnet)
- **Complete Job:** [4MZetKmgs6it1qYjjCX9PWmru11ypgRMMt26nHJDyq8xT4Pqs2pNNuwGJEUGmMe3mQtEHaxbueSEWPDDNnHug5ZX](https://explorer.solana.com/tx/4MZetKmgs6it1qYjjCX9PWmru11ypgRMMt26nHJDyq8xT4Pqs2pNNuwGJEUGmMe3mQtEHaxbueSEWPDDNnHug5ZX?cluster=devnet)

## How to Test on Devnet
1. Set your Anchor provider URL to `https://api.devnet.solana.com`.
2. Run the client script:
```bash
yarn run ts-node client.ts
```
