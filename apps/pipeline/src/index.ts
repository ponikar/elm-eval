import { runPipelineJob } from './run-job.js';

const jobId = process.argv[2];
if (!jobId) {
  console.error('Usage: pnpm --filter pipeline start -- <pipeline-job-id>');
  process.exit(2);
}
runPipelineJob(jobId).catch((error: unknown) => {
  console.error('Pipeline failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
