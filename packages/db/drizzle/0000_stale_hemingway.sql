CREATE TABLE "agent_version" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"model" text NOT NULL,
	"prompt_version" text NOT NULL,
	"system_prompt" text NOT NULL,
	"temperature" numeric NOT NULL,
	"rulebook_version_id" text NOT NULL,
	"retrieval_top_k" integer NOT NULL,
	"extraction_schema_version" text NOT NULL,
	"corrective_action_prompt_version" text NOT NULL,
	"timeout_ms" integer NOT NULL,
	"max_retries" integer NOT NULL,
	"type" text DEFAULT 'candidate' NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_finding" (
	"id" text PRIMARY KEY NOT NULL,
	"audit_id" text NOT NULL,
	"agent_version_id" text NOT NULL,
	"pipeline_job_id" text,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"category" text NOT NULL,
	"severity" text NOT NULL,
	"evidence_page" integer NOT NULL,
	"evidence_quote" text NOT NULL,
	"rule_id" text NOT NULL,
	"rulebook_version" text NOT NULL,
	"confidence" numeric NOT NULL,
	"corrective_action" text NOT NULL,
	"review_status" text DEFAULT 'PENDING' NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_page" (
	"id" text PRIMARY KEY NOT NULL,
	"audit_id" text NOT NULL,
	"page_number" integer NOT NULL,
	"text" text NOT NULL,
	"normalized_text" text,
	"extraction_status" text DEFAULT 'PENDING' NOT NULL,
	"parser_version" text
);
--> statement-breakpoint
CREATE TABLE "case_comparison" (
	"id" text PRIMARY KEY NOT NULL,
	"comparison_id" text NOT NULL,
	"eval_case_id" text NOT NULL,
	"baseline_execution_id" text NOT NULL,
	"candidate_execution_id" text NOT NULL,
	"classification" text NOT NULL,
	"is_critical" boolean NOT NULL,
	"metric_delta_json" jsonb,
	CONSTRAINT "case_comparison_distinct_executions" CHECK ("case_comparison"."baseline_execution_id" <> "case_comparison"."candidate_execution_id")
);
--> statement-breakpoint
CREATE TABLE "compliance_rule" (
	"id" text PRIMARY KEY NOT NULL,
	"rulebook_id" text NOT NULL,
	"rulebook_version" text NOT NULL,
	"section_id" text NOT NULL,
	"section_title" text NOT NULL,
	"category" text NOT NULL,
	"requirement_text" text NOT NULL,
	"source_page" integer NOT NULL,
	"severity_guidance" jsonb,
	"corrective_action_guidance" jsonb
);
--> statement-breakpoint
CREATE TABLE "eval_case" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"criticality" text DEFAULT 'NORMAL' NOT NULL,
	"input_audit_pages" text NOT NULL,
	"input_rulebook_version_id" text NOT NULL,
	"expected_json" text NOT NULL,
	"source" text DEFAULT 'HUMAN_CREATED' NOT NULL,
	"status" text DEFAULT 'DRAFT' NOT NULL,
	"parent_case_id" text,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "eval_suite" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"version" integer NOT NULL,
	"description" text,
	"status" text DEFAULT 'DRAFT' NOT NULL,
	"content_hash" text NOT NULL,
	"created_at" text NOT NULL,
	"frozen_at" text,
	CONSTRAINT "eval_suite_positive_version" CHECK ("eval_suite"."version" > 0)
);
--> statement-breakpoint
CREATE TABLE "eval_suite_case" (
	"suite_id" text NOT NULL,
	"eval_case_id" text NOT NULL,
	"ordinal" integer NOT NULL,
	"case_content_hash" text NOT NULL,
	"case_snapshot_json" text NOT NULL,
	"added_at" text NOT NULL,
	CONSTRAINT "eval_suite_case_suite_id_eval_case_id_pk" PRIMARY KEY("suite_id","eval_case_id"),
	CONSTRAINT "eval_suite_case_nonnegative_ordinal" CHECK ("eval_suite_case"."ordinal" >= 0)
);
--> statement-breakpoint
CREATE TABLE "evaluation_run" (
	"id" text PRIMARY KEY NOT NULL,
	"agent_version_id" text NOT NULL,
	"suite_id" text NOT NULL,
	"rulebook_version_id" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"suite_content_hash" text NOT NULL,
	"suite_snapshot_json" text NOT NULL,
	"agent_version_snapshot_json" text NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"error_code" text,
	"error_message" text,
	"created_at" text NOT NULL,
	"started_at" text,
	"completed_at" text
);
--> statement-breakpoint
CREATE TABLE "grader_result" (
	"id" text PRIMARY KEY NOT NULL,
	"execution_id" text NOT NULL,
	"grader_version" text NOT NULL,
	"passed" boolean NOT NULL,
	"deterministic_passed" boolean NOT NULL,
	"finding_recall" numeric,
	"critical_finding_recall" numeric,
	"finding_precision" numeric,
	"category_accuracy" numeric,
	"severity_accuracy" numeric,
	"critical_underclassification_count" integer DEFAULT 0 NOT NULL,
	"audit_citation_precision" numeric,
	"rule_reference_accuracy" numeric,
	"hallucinated_finding_rate" numeric,
	"corrective_action_completeness" numeric,
	"schema_validity" numeric,
	"failure_types_json" jsonb NOT NULL,
	"details_json" jsonb NOT NULL,
	"judge_model" text,
	"created_at" text NOT NULL,
	CONSTRAINT "grader_result_nonnegative_underclassification" CHECK ("grader_result"."critical_underclassification_count" >= 0)
);
--> statement-breakpoint
CREATE TABLE "human_correction" (
	"id" text PRIMARY KEY NOT NULL,
	"finding_id" text NOT NULL,
	"audit_id" text NOT NULL,
	"agent_version_id" text NOT NULL,
	"rulebook_version_id" text NOT NULL,
	"failure_type" text NOT NULL,
	"reason" text NOT NULL,
	"original_finding_json" text NOT NULL,
	"corrected_finding_json" text NOT NULL,
	"regression_eval_case_id" text,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pipeline_job" (
	"id" text PRIMARY KEY NOT NULL,
	"audit_id" text NOT NULL,
	"agent_version_id" text NOT NULL,
	"rulebook_version" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"error_code" text,
	"error_message" text,
	"created_at" text NOT NULL,
	"started_at" text,
	"completed_at" text,
	CONSTRAINT "pipeline_job_idempotency_key_unique" UNIQUE("idempotency_key")
);
--> statement-breakpoint
CREATE TABLE "quality_gate" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"version" integer NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"minimum_critical_finding_recall" numeric DEFAULT 0.95 NOT NULL,
	"minimum_finding_precision" numeric DEFAULT 0.9 NOT NULL,
	"minimum_audit_citation_precision" numeric DEFAULT 0.98 NOT NULL,
	"minimum_rule_reference_accuracy" numeric DEFAULT 0.98 NOT NULL,
	"minimum_schema_validity" numeric DEFAULT 1 NOT NULL,
	"minimum_cap_completeness" numeric DEFAULT 0.95 NOT NULL,
	"maximum_critical_regressions" integer DEFAULT 0 NOT NULL,
	"maximum_hallucinated_finding_rate" numeric DEFAULT 0.02 NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL,
	CONSTRAINT "quality_gate_positive_version" CHECK ("quality_gate"."version" > 0),
	CONSTRAINT "quality_gate_nonnegative_regressions" CHECK ("quality_gate"."maximum_critical_regressions" >= 0)
);
--> statement-breakpoint
CREATE TABLE "quality_gate_evaluation" (
	"id" text PRIMARY KEY NOT NULL,
	"quality_gate_id" text NOT NULL,
	"comparison_id" text NOT NULL,
	"decision" text NOT NULL,
	"reasons_json" jsonb NOT NULL,
	"quality_gate_snapshot_json" jsonb NOT NULL,
	"metrics_snapshot_json" jsonb NOT NULL,
	"evaluated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rule_chunk" (
	"id" text PRIMARY KEY NOT NULL,
	"rule_id" text NOT NULL,
	"rulebook_id" text NOT NULL,
	"rulebook_version" text NOT NULL,
	"text" text NOT NULL,
	"page_number" integer NOT NULL,
	"section_id" text NOT NULL,
	"section_title" text NOT NULL,
	"category" text NOT NULL,
	"embedding" text,
	"embedding_model" text,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rulebook" (
	"id" text PRIMARY KEY NOT NULL,
	"source_document_id" text,
	"name" text NOT NULL,
	"version" text NOT NULL,
	"standard" text NOT NULL,
	"effective_from" text NOT NULL,
	"effective_to" text,
	"language" text DEFAULT 'en' NOT NULL,
	"index_status" text DEFAULT 'PENDING' NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "run_comparison" (
	"id" text PRIMARY KEY NOT NULL,
	"baseline_run_id" text NOT NULL,
	"candidate_run_id" text NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"stable_pass_count" integer DEFAULT 0 NOT NULL,
	"improvement_count" integer DEFAULT 0 NOT NULL,
	"regression_count" integer DEFAULT 0 NOT NULL,
	"stable_failure_count" integer DEFAULT 0 NOT NULL,
	"critical_regression_count" integer DEFAULT 0 NOT NULL,
	"metric_delta_json" jsonb,
	"cost_delta_usd" numeric,
	"latency_delta_ms" integer,
	"error_code" text,
	"error_message" text,
	"created_at" text NOT NULL,
	"completed_at" text,
	CONSTRAINT "run_comparison_distinct_runs" CHECK ("run_comparison"."baseline_run_id" <> "run_comparison"."candidate_run_id"),
	CONSTRAINT "run_comparison_nonnegative_counts" CHECK ("run_comparison"."stable_pass_count" >= 0 and "run_comparison"."improvement_count" >= 0 and "run_comparison"."regression_count" >= 0 and "run_comparison"."stable_failure_count" >= 0 and "run_comparison"."critical_regression_count" >= 0)
);
--> statement-breakpoint
CREATE TABLE "source_document" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"version" text,
	"language" text DEFAULT 'en' NOT NULL,
	"file_path" text,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "supplier_audit" (
	"id" text PRIMARY KEY NOT NULL,
	"supplier_name" text NOT NULL,
	"factory_name" text NOT NULL,
	"audit_standard" text NOT NULL,
	"audit_date" text NOT NULL,
	"document_name" text NOT NULL,
	"status" text DEFAULT 'uploaded' NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "test_execution" (
	"id" text PRIMARY KEY NOT NULL,
	"run_id" text NOT NULL,
	"eval_case_id" text NOT NULL,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"agent_output" text,
	"passed" boolean,
	"agent_cost_usd" numeric DEFAULT 0 NOT NULL,
	"evaluator_cost_usd" numeric DEFAULT 0 NOT NULL,
	"token_input" integer DEFAULT 0 NOT NULL,
	"token_output" integer DEFAULT 0 NOT NULL,
	"latency_ms" integer DEFAULT 0 NOT NULL,
	"error_code" text,
	"error_message" text,
	"created_at" text NOT NULL,
	"started_at" text,
	"completed_at" text,
	CONSTRAINT "test_execution_nonnegative_usage" CHECK ("test_execution"."agent_cost_usd" >= 0 and "test_execution"."evaluator_cost_usd" >= 0 and "test_execution"."token_input" >= 0 and "test_execution"."token_output" >= 0 and "test_execution"."latency_ms" >= 0)
);
--> statement-breakpoint
CREATE TABLE "trace_event" (
	"id" text PRIMARY KEY NOT NULL,
	"execution_id" text,
	"pipeline_job_id" text,
	"stage" text NOT NULL,
	"event_type" text NOT NULL,
	"sequence" integer NOT NULL,
	"attempt" integer,
	"started_at" text NOT NULL,
	"completed_at" text,
	"duration_ms" integer,
	"input_summary" text,
	"output_summary" text,
	"error_code" text,
	"token_input" integer,
	"token_output" integer,
	"cost_usd" numeric,
	CONSTRAINT "trace_event_exactly_one_owner" CHECK (("trace_event"."execution_id" is not null and "trace_event"."pipeline_job_id" is null) or ("trace_event"."execution_id" is null and "trace_event"."pipeline_job_id" is not null))
);
--> statement-breakpoint
ALTER TABLE "agent_version" ADD CONSTRAINT "agent_version_rulebook_version_id_rulebook_id_fk" FOREIGN KEY ("rulebook_version_id") REFERENCES "public"."rulebook"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_finding" ADD CONSTRAINT "audit_finding_audit_id_supplier_audit_id_fk" FOREIGN KEY ("audit_id") REFERENCES "public"."supplier_audit"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_finding" ADD CONSTRAINT "audit_finding_agent_version_id_agent_version_id_fk" FOREIGN KEY ("agent_version_id") REFERENCES "public"."agent_version"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_finding" ADD CONSTRAINT "audit_finding_pipeline_job_id_pipeline_job_id_fk" FOREIGN KEY ("pipeline_job_id") REFERENCES "public"."pipeline_job"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_page" ADD CONSTRAINT "audit_page_audit_id_supplier_audit_id_fk" FOREIGN KEY ("audit_id") REFERENCES "public"."supplier_audit"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_comparison" ADD CONSTRAINT "case_comparison_comparison_id_run_comparison_id_fk" FOREIGN KEY ("comparison_id") REFERENCES "public"."run_comparison"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_comparison" ADD CONSTRAINT "case_comparison_eval_case_id_eval_case_id_fk" FOREIGN KEY ("eval_case_id") REFERENCES "public"."eval_case"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_comparison" ADD CONSTRAINT "case_comparison_baseline_execution_id_test_execution_id_fk" FOREIGN KEY ("baseline_execution_id") REFERENCES "public"."test_execution"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_comparison" ADD CONSTRAINT "case_comparison_candidate_execution_id_test_execution_id_fk" FOREIGN KEY ("candidate_execution_id") REFERENCES "public"."test_execution"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "compliance_rule" ADD CONSTRAINT "compliance_rule_rulebook_id_rulebook_id_fk" FOREIGN KEY ("rulebook_id") REFERENCES "public"."rulebook"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eval_case" ADD CONSTRAINT "eval_case_input_rulebook_version_id_rulebook_id_fk" FOREIGN KEY ("input_rulebook_version_id") REFERENCES "public"."rulebook"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eval_case" ADD CONSTRAINT "eval_case_parent_case_id_eval_case_id_fk" FOREIGN KEY ("parent_case_id") REFERENCES "public"."eval_case"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eval_suite_case" ADD CONSTRAINT "eval_suite_case_suite_id_eval_suite_id_fk" FOREIGN KEY ("suite_id") REFERENCES "public"."eval_suite"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "eval_suite_case" ADD CONSTRAINT "eval_suite_case_eval_case_id_eval_case_id_fk" FOREIGN KEY ("eval_case_id") REFERENCES "public"."eval_case"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluation_run" ADD CONSTRAINT "evaluation_run_agent_version_id_agent_version_id_fk" FOREIGN KEY ("agent_version_id") REFERENCES "public"."agent_version"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluation_run" ADD CONSTRAINT "evaluation_run_suite_id_eval_suite_id_fk" FOREIGN KEY ("suite_id") REFERENCES "public"."eval_suite"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evaluation_run" ADD CONSTRAINT "evaluation_run_rulebook_version_id_rulebook_id_fk" FOREIGN KEY ("rulebook_version_id") REFERENCES "public"."rulebook"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grader_result" ADD CONSTRAINT "grader_result_execution_id_test_execution_id_fk" FOREIGN KEY ("execution_id") REFERENCES "public"."test_execution"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "human_correction" ADD CONSTRAINT "human_correction_finding_id_audit_finding_id_fk" FOREIGN KEY ("finding_id") REFERENCES "public"."audit_finding"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "human_correction" ADD CONSTRAINT "human_correction_audit_id_supplier_audit_id_fk" FOREIGN KEY ("audit_id") REFERENCES "public"."supplier_audit"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "human_correction" ADD CONSTRAINT "human_correction_agent_version_id_agent_version_id_fk" FOREIGN KEY ("agent_version_id") REFERENCES "public"."agent_version"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "human_correction" ADD CONSTRAINT "human_correction_rulebook_version_id_rulebook_id_fk" FOREIGN KEY ("rulebook_version_id") REFERENCES "public"."rulebook"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "human_correction" ADD CONSTRAINT "human_correction_regression_eval_case_id_eval_case_id_fk" FOREIGN KEY ("regression_eval_case_id") REFERENCES "public"."eval_case"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_job" ADD CONSTRAINT "pipeline_job_audit_id_supplier_audit_id_fk" FOREIGN KEY ("audit_id") REFERENCES "public"."supplier_audit"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pipeline_job" ADD CONSTRAINT "pipeline_job_agent_version_id_agent_version_id_fk" FOREIGN KEY ("agent_version_id") REFERENCES "public"."agent_version"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quality_gate_evaluation" ADD CONSTRAINT "quality_gate_evaluation_quality_gate_id_quality_gate_id_fk" FOREIGN KEY ("quality_gate_id") REFERENCES "public"."quality_gate"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quality_gate_evaluation" ADD CONSTRAINT "quality_gate_evaluation_comparison_id_run_comparison_id_fk" FOREIGN KEY ("comparison_id") REFERENCES "public"."run_comparison"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rule_chunk" ADD CONSTRAINT "rule_chunk_rule_id_compliance_rule_id_fk" FOREIGN KEY ("rule_id") REFERENCES "public"."compliance_rule"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rule_chunk" ADD CONSTRAINT "rule_chunk_rulebook_id_rulebook_id_fk" FOREIGN KEY ("rulebook_id") REFERENCES "public"."rulebook"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rulebook" ADD CONSTRAINT "rulebook_source_document_id_source_document_id_fk" FOREIGN KEY ("source_document_id") REFERENCES "public"."source_document"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "run_comparison" ADD CONSTRAINT "run_comparison_baseline_run_id_evaluation_run_id_fk" FOREIGN KEY ("baseline_run_id") REFERENCES "public"."evaluation_run"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "run_comparison" ADD CONSTRAINT "run_comparison_candidate_run_id_evaluation_run_id_fk" FOREIGN KEY ("candidate_run_id") REFERENCES "public"."evaluation_run"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_execution" ADD CONSTRAINT "test_execution_run_id_evaluation_run_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."evaluation_run"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "test_execution" ADD CONSTRAINT "test_execution_eval_case_id_eval_case_id_fk" FOREIGN KEY ("eval_case_id") REFERENCES "public"."eval_case"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trace_event" ADD CONSTRAINT "trace_event_execution_id_test_execution_id_fk" FOREIGN KEY ("execution_id") REFERENCES "public"."test_execution"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trace_event" ADD CONSTRAINT "trace_event_pipeline_job_id_pipeline_job_id_fk" FOREIGN KEY ("pipeline_job_id") REFERENCES "public"."pipeline_job"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_finding_job_idx" ON "audit_finding" USING btree ("pipeline_job_id");--> statement-breakpoint
CREATE UNIQUE INDEX "audit_page_audit_number_unique" ON "audit_page" USING btree ("audit_id","page_number");--> statement-breakpoint
CREATE UNIQUE INDEX "case_comparison_case_unique" ON "case_comparison" USING btree ("comparison_id","eval_case_id");--> statement-breakpoint
CREATE INDEX "eval_case_parent_idx" ON "eval_case" USING btree ("parent_case_id");--> statement-breakpoint
CREATE UNIQUE INDEX "eval_suite_name_version_unique" ON "eval_suite" USING btree ("name","version");--> statement-breakpoint
CREATE UNIQUE INDEX "eval_suite_content_hash_unique" ON "eval_suite" USING btree ("content_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "eval_suite_case_ordinal_unique" ON "eval_suite_case" USING btree ("suite_id","ordinal");--> statement-breakpoint
CREATE UNIQUE INDEX "evaluation_run_idempotency_unique" ON "evaluation_run" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "evaluation_run_suite_status_idx" ON "evaluation_run" USING btree ("suite_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "grader_result_execution_unique" ON "grader_result" USING btree ("execution_id");--> statement-breakpoint
CREATE INDEX "human_correction_finding_idx" ON "human_correction" USING btree ("finding_id");--> statement-breakpoint
CREATE UNIQUE INDEX "human_correction_regression_case_unique" ON "human_correction" USING btree ("regression_eval_case_id");--> statement-breakpoint
CREATE INDEX "pipeline_job_status_idx" ON "pipeline_job" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "quality_gate_name_version_unique" ON "quality_gate" USING btree ("name","version");--> statement-breakpoint
CREATE UNIQUE INDEX "quality_gate_evaluation_unique" ON "quality_gate_evaluation" USING btree ("quality_gate_id","comparison_id");--> statement-breakpoint
CREATE UNIQUE INDEX "rulebook_standard_version_unique" ON "rulebook" USING btree ("standard","version");--> statement-breakpoint
CREATE UNIQUE INDEX "run_comparison_pair_unique" ON "run_comparison" USING btree ("baseline_run_id","candidate_run_id");--> statement-breakpoint
CREATE UNIQUE INDEX "test_execution_run_case_unique" ON "test_execution" USING btree ("run_id","eval_case_id");--> statement-breakpoint
CREATE INDEX "test_execution_run_status_idx" ON "test_execution" USING btree ("run_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "trace_event_job_sequence_unique" ON "trace_event" USING btree ("pipeline_job_id","sequence");--> statement-breakpoint
CREATE UNIQUE INDEX "trace_event_execution_sequence_unique" ON "trace_event" USING btree ("execution_id","sequence");