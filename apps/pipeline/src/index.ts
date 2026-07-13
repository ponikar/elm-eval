import { runEvaluationJob } from './run-evaluation.js';
import { runPipelineJob } from './run-job.js';

const command = process.argv[2];
const id = process.argv[3];
if (!command) {
  console.error(
    'Usage: pnpm --filter pipeline start -- <pipeline-job-id> | eval <evaluation-run-id>',
  );
  process.exit(2);
}
const operation =
  command === 'eval' ? (id ? runEvaluationJob(id) : undefined) : runPipelineJob(command);
if (!operation) {
  console.error('Usage: pnpm --filter pipeline start -- eval <evaluation-run-id>');
  process.exit(2);
}
operation.catch((error: unknown) => {
  console.error('Pipeline failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
