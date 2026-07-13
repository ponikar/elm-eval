PRAGMA defer_foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `case_comparison` (
	`id` text PRIMARY KEY NOT NULL,
	`comparison_id` text NOT NULL,
	`eval_case_id` text NOT NULL,
	`baseline_execution_id` text NOT NULL,
	`candidate_execution_id` text NOT NULL,
	`classification` text NOT NULL,
	`is_critical` integer NOT NULL,
	`metric_delta_json` text,
	FOREIGN KEY (`comparison_id`) REFERENCES `run_comparison`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`eval_case_id`) REFERENCES `eval_case`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`baseline_execution_id`) REFERENCES `test_execution`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`candidate_execution_id`) REFERENCES `test_execution`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "case_comparison_distinct_executions" CHECK("case_comparison"."baseline_execution_id" <> "case_comparison"."candidate_execution_id")
);
--> statement-breakpoint
CREATE UNIQUE INDEX `case_comparison_case_unique` ON `case_comparison` (`comparison_id`,`eval_case_id`);--> statement-breakpoint
CREATE TABLE `eval_suite` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`version` integer NOT NULL,
	`description` text,
	`status` text DEFAULT 'DRAFT' NOT NULL,
	`content_hash` text NOT NULL,
	`created_at` text NOT NULL,
	`frozen_at` text,
	CONSTRAINT "eval_suite_positive_version" CHECK("eval_suite"."version" > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `eval_suite_name_version_unique` ON `eval_suite` (`name`,`version`);--> statement-breakpoint
CREATE UNIQUE INDEX `eval_suite_content_hash_unique` ON `eval_suite` (`content_hash`);--> statement-breakpoint
CREATE TABLE `eval_suite_case` (
	`suite_id` text NOT NULL,
	`eval_case_id` text NOT NULL,
	`ordinal` integer NOT NULL,
	`case_content_hash` text NOT NULL,
	`case_snapshot_json` text NOT NULL,
	`added_at` text NOT NULL,
	PRIMARY KEY(`suite_id`, `eval_case_id`),
	FOREIGN KEY (`suite_id`) REFERENCES `eval_suite`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`eval_case_id`) REFERENCES `eval_case`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "eval_suite_case_nonnegative_ordinal" CHECK("eval_suite_case"."ordinal" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `eval_suite_case_ordinal_unique` ON `eval_suite_case` (`suite_id`,`ordinal`);--> statement-breakpoint
CREATE TABLE `grader_result` (
	`id` text PRIMARY KEY NOT NULL,
	`execution_id` text NOT NULL,
	`grader_version` text NOT NULL,
	`passed` integer NOT NULL,
	`deterministic_passed` integer NOT NULL,
	`finding_recall` real,
	`critical_finding_recall` real,
	`finding_precision` real,
	`category_accuracy` real,
	`severity_accuracy` real,
	`critical_underclassification_count` integer DEFAULT 0 NOT NULL,
	`audit_citation_precision` real,
	`rule_reference_accuracy` real,
	`hallucinated_finding_rate` real,
	`corrective_action_completeness` real,
	`schema_validity` real,
	`failure_types_json` text NOT NULL,
	`details_json` text NOT NULL,
	`judge_model` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`execution_id`) REFERENCES `test_execution`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "grader_result_nonnegative_underclassification" CHECK("grader_result"."critical_underclassification_count" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `grader_result_execution_unique` ON `grader_result` (`execution_id`);--> statement-breakpoint
CREATE TABLE `quality_gate` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`version` integer NOT NULL,
	`status` text DEFAULT 'ACTIVE' NOT NULL,
	`minimum_critical_finding_recall` real DEFAULT 0.95 NOT NULL,
	`minimum_finding_precision` real DEFAULT 0.9 NOT NULL,
	`minimum_audit_citation_precision` real DEFAULT 0.98 NOT NULL,
	`minimum_rule_reference_accuracy` real DEFAULT 0.98 NOT NULL,
	`minimum_schema_validity` real DEFAULT 1 NOT NULL,
	`minimum_cap_completeness` real DEFAULT 0.95 NOT NULL,
	`maximum_critical_regressions` integer DEFAULT 0 NOT NULL,
	`maximum_hallucinated_finding_rate` real DEFAULT 0.02 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	CONSTRAINT "quality_gate_positive_version" CHECK("quality_gate"."version" > 0),
	CONSTRAINT "quality_gate_nonnegative_regressions" CHECK("quality_gate"."maximum_critical_regressions" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `quality_gate_name_version_unique` ON `quality_gate` (`name`,`version`);--> statement-breakpoint
CREATE TABLE `quality_gate_evaluation` (
	`id` text PRIMARY KEY NOT NULL,
	`quality_gate_id` text NOT NULL,
	`comparison_id` text NOT NULL,
	`decision` text NOT NULL,
	`reasons_json` text NOT NULL,
	`quality_gate_snapshot_json` text NOT NULL,
	`metrics_snapshot_json` text NOT NULL,
	`evaluated_at` text NOT NULL,
	FOREIGN KEY (`quality_gate_id`) REFERENCES `quality_gate`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`comparison_id`) REFERENCES `run_comparison`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `quality_gate_evaluation_unique` ON `quality_gate_evaluation` (`quality_gate_id`,`comparison_id`);--> statement-breakpoint
CREATE TABLE `run_comparison` (
	`id` text PRIMARY KEY NOT NULL,
	`baseline_run_id` text NOT NULL,
	`candidate_run_id` text NOT NULL,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`stable_pass_count` integer DEFAULT 0 NOT NULL,
	`improvement_count` integer DEFAULT 0 NOT NULL,
	`regression_count` integer DEFAULT 0 NOT NULL,
	`stable_failure_count` integer DEFAULT 0 NOT NULL,
	`critical_regression_count` integer DEFAULT 0 NOT NULL,
	`metric_delta_json` text,
	`cost_delta_usd` real,
	`latency_delta_ms` integer,
	`error_code` text,
	`error_message` text,
	`created_at` text NOT NULL,
	`completed_at` text,
	FOREIGN KEY (`baseline_run_id`) REFERENCES `evaluation_run`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`candidate_run_id`) REFERENCES `evaluation_run`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "run_comparison_distinct_runs" CHECK("run_comparison"."baseline_run_id" <> "run_comparison"."candidate_run_id"),
	CONSTRAINT "run_comparison_nonnegative_counts" CHECK("run_comparison"."stable_pass_count" >= 0 and "run_comparison"."improvement_count" >= 0 and "run_comparison"."regression_count" >= 0 and "run_comparison"."stable_failure_count" >= 0 and "run_comparison"."critical_regression_count" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `run_comparison_pair_unique` ON `run_comparison` (`baseline_run_id`,`candidate_run_id`);--> statement-breakpoint
CREATE TABLE `__new_test_execution` (
	`id` text PRIMARY KEY NOT NULL,
	`run_id` text NOT NULL,
	`eval_case_id` text NOT NULL,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`agent_output` text,
	`passed` integer,
	`agent_cost_usd` real DEFAULT 0 NOT NULL,
	`evaluator_cost_usd` real DEFAULT 0 NOT NULL,
	`token_input` integer DEFAULT 0 NOT NULL,
	`token_output` integer DEFAULT 0 NOT NULL,
	`latency_ms` integer DEFAULT 0 NOT NULL,
	`error_code` text,
	`error_message` text,
	`created_at` text NOT NULL,
	`started_at` text,
	`completed_at` text,
	FOREIGN KEY (`run_id`) REFERENCES `evaluation_run`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`eval_case_id`) REFERENCES `eval_case`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "test_execution_nonnegative_usage" CHECK("__new_test_execution"."agent_cost_usd" >= 0 and "__new_test_execution"."evaluator_cost_usd" >= 0 and "__new_test_execution"."token_input" >= 0 and "__new_test_execution"."token_output" >= 0 and "__new_test_execution"."latency_ms" >= 0)
);
--> statement-breakpoint
INSERT INTO `__new_test_execution`("id", "run_id", "eval_case_id", "status", "agent_output", "passed", "agent_cost_usd", "evaluator_cost_usd", "token_input", "token_output", "latency_ms", "error_code", "error_message", "created_at", "started_at", "completed_at") SELECT "id", "run_id", "eval_case_id", "status", "agent_output", "passed", "cost_usd", 0, 0, 0, "latency_ms", NULL, NULL, "started_at", "started_at", "completed_at" FROM `test_execution`;--> statement-breakpoint
DROP TABLE `test_execution`;--> statement-breakpoint
ALTER TABLE `__new_test_execution` RENAME TO `test_execution`;--> statement-breakpoint
CREATE UNIQUE INDEX `test_execution_run_case_unique` ON `test_execution` (`run_id`,`eval_case_id`);--> statement-breakpoint
CREATE INDEX `test_execution_run_status_idx` ON `test_execution` (`run_id`,`status`);--> statement-breakpoint
CREATE TABLE `__new_audit_finding` (
	`id` text PRIMARY KEY NOT NULL,
	`audit_id` text NOT NULL,
	`agent_version_id` text NOT NULL,
	`pipeline_job_id` text,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`category` text NOT NULL,
	`severity` text NOT NULL,
	`evidence_page` integer NOT NULL,
	`evidence_quote` text NOT NULL,
	`rule_id` text NOT NULL,
	`rulebook_version` text NOT NULL,
	`confidence` real NOT NULL,
	`corrective_action` text NOT NULL,
	`review_status` text DEFAULT 'PENDING' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`audit_id`) REFERENCES `supplier_audit`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`agent_version_id`) REFERENCES `agent_version`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`pipeline_job_id`) REFERENCES `pipeline_job`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_audit_finding`("id", "audit_id", "agent_version_id", "pipeline_job_id", "title", "description", "category", "severity", "evidence_page", "evidence_quote", "rule_id", "rulebook_version", "confidence", "corrective_action", "review_status", "created_at", "updated_at") SELECT "id", "audit_id", "agent_version_id", "pipeline_job_id", "title", "description", "category", "severity", "evidence_page", "evidence_quote", "rule_id", "rulebook_version", "confidence", "corrective_action", "review_status", "created_at", "updated_at" FROM `audit_finding`;--> statement-breakpoint
DROP TABLE `audit_finding`;--> statement-breakpoint
ALTER TABLE `__new_audit_finding` RENAME TO `audit_finding`;--> statement-breakpoint
CREATE INDEX `audit_finding_job_idx` ON `audit_finding` (`pipeline_job_id`);--> statement-breakpoint
CREATE TABLE `__new_human_correction` (
	`id` text PRIMARY KEY NOT NULL,
	`finding_id` text NOT NULL,
	`audit_id` text NOT NULL,
	`agent_version_id` text NOT NULL,
	`rulebook_version_id` text NOT NULL,
	`failure_type` text NOT NULL,
	`reason` text NOT NULL,
	`original_finding_json` text NOT NULL,
	`corrected_finding_json` text NOT NULL,
	`regression_eval_case_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`finding_id`) REFERENCES `audit_finding`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`audit_id`) REFERENCES `supplier_audit`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`agent_version_id`) REFERENCES `agent_version`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`rulebook_version_id`) REFERENCES `rulebook`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`regression_eval_case_id`) REFERENCES `eval_case`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_human_correction`("id", "finding_id", "audit_id", "agent_version_id", "rulebook_version_id", "failure_type", "reason", "original_finding_json", "corrected_finding_json", "regression_eval_case_id", "created_at", "updated_at") SELECT "id", "finding_id", "audit_id", "agent_version_id", (SELECT "rulebook_version_id" FROM "agent_version" WHERE "agent_version"."id" = "human_correction"."agent_version_id"), "failure_type", "reason", "original_finding_json", "corrected_finding_json", "regression_eval_case_id", "created_at", "updated_at" FROM `human_correction`;--> statement-breakpoint
DROP TABLE `human_correction`;--> statement-breakpoint
ALTER TABLE `__new_human_correction` RENAME TO `human_correction`;--> statement-breakpoint
CREATE INDEX `human_correction_finding_idx` ON `human_correction` (`finding_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `human_correction_regression_case_unique` ON `human_correction` (`regression_eval_case_id`);--> statement-breakpoint
DROP INDEX `trace_event_job_sequence_idx`;--> statement-breakpoint
DROP INDEX `trace_event_execution_sequence_idx`;--> statement-breakpoint
CREATE UNIQUE INDEX `trace_event_job_sequence_unique` ON `trace_event` (`pipeline_job_id`,`sequence`);--> statement-breakpoint
CREATE UNIQUE INDEX `trace_event_execution_sequence_unique` ON `trace_event` (`execution_id`,`sequence`);--> statement-breakpoint
INSERT INTO `eval_suite`("id", "name", "version", "description", "status", "content_hash", "created_at", "frozen_at") SELECT "suite_id", 'Legacy suite ' || "suite_id", 1, 'Migrated from the pre-versioned suite reference', 'FROZEN', 'legacy:' || "suite_id", min("started_at"), min("started_at") FROM `evaluation_run` GROUP BY "suite_id" ON CONFLICT("id") DO NOTHING;--> statement-breakpoint
CREATE TABLE `__new_evaluation_run` (
	`id` text PRIMARY KEY NOT NULL,
	`agent_version_id` text NOT NULL,
	`suite_id` text NOT NULL,
	`rulebook_version_id` text NOT NULL,
	`idempotency_key` text NOT NULL,
	`suite_content_hash` text NOT NULL,
	`suite_snapshot_json` text NOT NULL,
	`agent_version_snapshot_json` text NOT NULL,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`error_code` text,
	`error_message` text,
	`created_at` text NOT NULL,
	`started_at` text,
	`completed_at` text,
	FOREIGN KEY (`agent_version_id`) REFERENCES `agent_version`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`suite_id`) REFERENCES `eval_suite`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`rulebook_version_id`) REFERENCES `rulebook`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_evaluation_run`("id", "agent_version_id", "suite_id", "rulebook_version_id", "idempotency_key", "suite_content_hash", "suite_snapshot_json", "agent_version_snapshot_json", "status", "error_code", "error_message", "created_at", "started_at", "completed_at") SELECT "id", "agent_version_id", "suite_id", (SELECT "rulebook_version_id" FROM "agent_version" WHERE "agent_version"."id" = "evaluation_run"."agent_version_id"), 'legacy:' || "id", 'legacy:' || "suite_id", '{"legacy":true}', '{"legacy":true}', "status", NULL, NULL, "started_at", "started_at", "completed_at" FROM `evaluation_run`;--> statement-breakpoint
DROP TABLE `evaluation_run`;--> statement-breakpoint
ALTER TABLE `__new_evaluation_run` RENAME TO `evaluation_run`;--> statement-breakpoint
CREATE UNIQUE INDEX `evaluation_run_idempotency_unique` ON `evaluation_run` (`idempotency_key`);--> statement-breakpoint
CREATE INDEX `evaluation_run_suite_status_idx` ON `evaluation_run` (`suite_id`,`status`);--> statement-breakpoint
CREATE TABLE `__new_eval_case` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`criticality` text DEFAULT 'NORMAL' NOT NULL,
	`input_audit_pages` text NOT NULL,
	`input_rulebook_version_id` text NOT NULL,
	`expected_json` text NOT NULL,
	`source` text DEFAULT 'HUMAN_CREATED' NOT NULL,
	`status` text DEFAULT 'DRAFT' NOT NULL,
	`parent_case_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`input_rulebook_version_id`) REFERENCES `rulebook`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`parent_case_id`) REFERENCES `eval_case`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_eval_case`("id", "name", "category", "criticality", "input_audit_pages", "input_rulebook_version_id", "expected_json", "source", "status", "parent_case_id", "created_at", "updated_at") SELECT "id", "name", "category", "criticality", "input_audit_pages", "input_rulebook_version_id", "expected_json", "source", "status", "parent_case_id", "created_at", "updated_at" FROM `eval_case`;--> statement-breakpoint
DROP TABLE `eval_case`;--> statement-breakpoint
ALTER TABLE `__new_eval_case` RENAME TO `eval_case`;--> statement-breakpoint
CREATE INDEX `eval_case_parent_idx` ON `eval_case` (`parent_case_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `rulebook_standard_version_unique` ON `rulebook` (`standard`,`version`);--> statement-breakpoint
CREATE TABLE `__new_agent_version` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`model` text NOT NULL,
	`prompt_version` text NOT NULL,
	`system_prompt` text NOT NULL,
	`temperature` real NOT NULL,
	`rulebook_version_id` text NOT NULL,
	`retrieval_top_k` integer NOT NULL,
	`extraction_schema_version` text NOT NULL,
	`corrective_action_prompt_version` text NOT NULL,
	`timeout_ms` integer NOT NULL,
	`max_retries` integer NOT NULL,
	`type` text DEFAULT 'candidate' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`rulebook_version_id`) REFERENCES `rulebook`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_agent_version`("id", "name", "model", "prompt_version", "system_prompt", "temperature", "rulebook_version_id", "retrieval_top_k", "extraction_schema_version", "corrective_action_prompt_version", "timeout_ms", "max_retries", "type", "created_at") SELECT "id", "name", "model", "prompt_version", "system_prompt", "temperature", "rulebook_version_id", "retrieval_top_k", "extraction_schema_version", "corrective_action_prompt_version", "timeout_ms", "max_retries", "type", "created_at" FROM `agent_version`;--> statement-breakpoint
DROP TABLE `agent_version`;--> statement-breakpoint
ALTER TABLE `__new_agent_version` RENAME TO `agent_version`;
--> statement-breakpoint
PRAGMA foreign_keys=ON;
