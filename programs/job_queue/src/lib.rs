use anchor_lang::prelude::*;

declare_id!("HAUSpRwSCmmDH66xs4sVaTx5u4uiqTdvjcG2notGa4Gy");

#[program]
pub mod job_queue {
    use super::*;

    pub fn initialize_queue(ctx: Context<InitializeQueue>) -> Result<()> {
        let queue = &mut ctx.accounts.queue;
        queue.admin = ctx.accounts.admin.key();
        queue.job_count = 0;
        msg!("Queue initialized by {}", queue.admin);
        Ok(())
    }

    pub fn create_job(ctx: Context<CreateJob>, payload: String) -> Result<()> {
        let queue = &mut ctx.accounts.queue;
        let job = &mut ctx.accounts.job;

        job.id = queue.job_count;
        job.creator = ctx.accounts.creator.key();
        job.payload = payload;
        job.status = JobStatus::Pending;
        job.worker = None;

        queue.job_count = queue.job_count.checked_add(1).unwrap();
        
        msg!("Job {} created by {}", job.id, job.creator);
        Ok(())
    }

    pub fn assign_job(ctx: Context<AssignJob>) -> Result<()> {
        let job = &mut ctx.accounts.job;
        
        require!(job.status == JobStatus::Pending, JobError::NotPending);
        
        job.status = JobStatus::Assigned;
        job.worker = Some(ctx.accounts.worker.key());
        
        msg!("Job {} assigned to {}", job.id, ctx.accounts.worker.key());
        Ok(())
    }

    pub fn complete_job(ctx: Context<CompleteJob>) -> Result<()> {
        let job = &mut ctx.accounts.job;
        
        require!(job.status == JobStatus::Assigned, JobError::NotAssigned);
        require!(job.worker == Some(ctx.accounts.worker.key()), JobError::UnauthorizedWorker);
        
        job.status = JobStatus::Completed;
        
        msg!("Job {} completed by {}", job.id, ctx.accounts.worker.key());
        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeQueue<'info> {
    #[account(
        init,
        payer = admin,
        space = 8 + 32 + 8, // discriminator + admin pubkey + job_count
        seeds = [b"queue", admin.key().as_ref()],
        bump
    )]
    pub queue: Account<'info, Queue>,
    #[account(mut)]
    pub admin: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CreateJob<'info> {
    #[account(mut)]
    pub queue: Account<'info, Queue>,
    #[account(
        init,
        payer = creator,
        space = 8 + 8 + 32 + 256 + 1 + 33, // discriminator + id + creator + payload + status + worker
        seeds = [b"job", queue.key().as_ref(), queue.job_count.to_le_bytes().as_ref()],
        bump
    )]
    pub job: Account<'info, Job>,
    #[account(mut)]
    pub creator: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AssignJob<'info> {
    #[account(mut)]
    pub job: Account<'info, Job>,
    pub worker: Signer<'info>,
}

#[derive(Accounts)]
pub struct CompleteJob<'info> {
    #[account(mut)]
    pub job: Account<'info, Job>,
    pub worker: Signer<'info>,
}

#[account]
pub struct Queue {
    pub admin: Pubkey,
    pub job_count: u64,
}

#[account]
pub struct Job {
    pub id: u64,
    pub creator: Pubkey,
    pub payload: String,
    pub status: JobStatus,
    pub worker: Option<Pubkey>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum JobStatus {
    Pending,
    Assigned,
    Completed,
    Failed,
}

#[error_code]
pub enum JobError {
    #[msg("Job is not in pending state")]
    NotPending,
    #[msg("Job is not assigned")]
    NotAssigned,
    #[msg("Worker is not authorized for this job")]
    UnauthorizedWorker,
}
