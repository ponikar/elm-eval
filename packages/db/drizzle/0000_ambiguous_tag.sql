CREATE TABLE `agent_version` (
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
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `audit_finding` (
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
	FOREIGN KEY (`pipeline_job_id`) REFERENCES `pipeline_job`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `audit_finding_job_idx` ON `audit_finding` (`pipeline_job_id`);--> statement-breakpoint
CREATE TABLE `audit_page` (
	`id` text PRIMARY KEY NOT NULL,
	`audit_id` text NOT NULL,
	`page_number` integer NOT NULL,
	`text` text NOT NULL,
	`normalized_text` text,
	`extraction_status` text DEFAULT 'PENDING' NOT NULL,
	`parser_version` text,
	FOREIGN KEY (`audit_id`) REFERENCES `supplier_audit`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `audit_page_audit_number_unique` ON `audit_page` (`audit_id`,`page_number`);--> statement-breakpoint
CREATE TABLE `compliance_rule` (
	`id` text PRIMARY KEY NOT NULL,
	`rulebook_id` text NOT NULL,
	`rulebook_version` text NOT NULL,
	`section_id` text NOT NULL,
	`section_title` text NOT NULL,
	`category` text NOT NULL,
	`requirement_text` text NOT NULL,
	`source_page` integer NOT NULL,
	`severity_guidance` text,
	`corrective_action_guidance` text,
	FOREIGN KEY (`rulebook_id`) REFERENCES `rulebook`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `eval_case` (
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
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `evaluation_run` (
	`id` text PRIMARY KEY NOT NULL,
	`agent_version_id` text NOT NULL,
	`suite_id` text NOT NULL,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`started_at` text NOT NULL,
	`completed_at` text,
	FOREIGN KEY (`agent_version_id`) REFERENCES `agent_version`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `pipeline_job` (
	`id` text PRIMARY KEY NOT NULL,
	`audit_id` text NOT NULL,
	`agent_version_id` text NOT NULL,
	`rulebook_version` text NOT NULL,
	`idempotency_key` text NOT NULL,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`attempt_count` integer DEFAULT 0 NOT NULL,
	`error_code` text,
	`error_message` text,
	`created_at` text NOT NULL,
	`started_at` text,
	`completed_at` text,
	FOREIGN KEY (`audit_id`) REFERENCES `supplier_audit`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`agent_version_id`) REFERENCES `agent_version`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `pipeline_job_idempotency_key_unique` ON `pipeline_job` (`idempotency_key`);--> statement-breakpoint
CREATE INDEX `pipeline_job_status_idx` ON `pipeline_job` (`status`);--> statement-breakpoint
CREATE TABLE `rule_chunk` (
	`id` text PRIMARY KEY NOT NULL,
	`rule_id` text NOT NULL,
	`rulebook_id` text NOT NULL,
	`rulebook_version` text NOT NULL,
	`text` text NOT NULL,
	`page_number` integer NOT NULL,
	`section_id` text NOT NULL,
	`section_title` text NOT NULL,
	`category` text NOT NULL,
	`embedding` text,
	`embedding_model` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`rule_id`) REFERENCES `compliance_rule`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`rulebook_id`) REFERENCES `rulebook`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `rulebook` (
	`id` text PRIMARY KEY NOT NULL,
	`source_document_id` text,
	`name` text NOT NULL,
	`version` text NOT NULL,
	`standard` text NOT NULL,
	`effective_from` text NOT NULL,
	`effective_to` text,
	`language` text DEFAULT 'en' NOT NULL,
	`index_status` text DEFAULT 'PENDING' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`source_document_id`) REFERENCES `source_document`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `source_document` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`version` text,
	`language` text DEFAULT 'en' NOT NULL,
	`file_path` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `supplier_audit` (
	`id` text PRIMARY KEY NOT NULL,
	`supplier_name` text NOT NULL,
	`factory_name` text NOT NULL,
	`audit_standard` text NOT NULL,
	`audit_date` text NOT NULL,
	`document_name` text NOT NULL,
	`status` text DEFAULT 'uploaded' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `test_execution` (
	`id` text PRIMARY KEY NOT NULL,
	`run_id` text NOT NULL,
	`eval_case_id` text NOT NULL,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`agent_output` text NOT NULL,
	`grader_result` text NOT NULL,
	`passed` integer DEFAULT false NOT NULL,
	`cost_usd` real DEFAULT 0 NOT NULL,
	`latency_ms` integer DEFAULT 0 NOT NULL,
	`started_at` text NOT NULL,
	`completed_at` text,
	FOREIGN KEY (`run_id`) REFERENCES `evaluation_run`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`eval_case_id`) REFERENCES `eval_case`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `trace_event` (
	`id` text PRIMARY KEY NOT NULL,
	`execution_id` text,
	`pipeline_job_id` text,
	`stage` text NOT NULL,
	`event_type` text NOT NULL,
	`sequence` integer NOT NULL,
	`attempt` integer,
	`started_at` text NOT NULL,
	`completed_at` text,
	`duration_ms` integer,
	`input_summary` text,
	`output_summary` text,
	`error_code` text,
	`token_input` integer,
	`token_output` integer,
	`cost_usd` real,
	FOREIGN KEY (`execution_id`) REFERENCES `test_execution`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`pipeline_job_id`) REFERENCES `pipeline_job`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "trace_event_exactly_one_owner" CHECK(("trace_event"."execution_id" is not null and "trace_event"."pipeline_job_id" is null) or ("trace_event"."execution_id" is null and "trace_event"."pipeline_job_id" is not null))
);
--> statement-breakpoint
CREATE INDEX `trace_event_job_sequence_idx` ON `trace_event` (`pipeline_job_id`,`sequence`);--> statement-breakpoint
CREATE INDEX `trace_event_execution_sequence_idx` ON `trace_event` (`execution_id`,`sequence`);