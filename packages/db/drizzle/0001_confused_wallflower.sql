CREATE TABLE `human_correction` (
	`id` text PRIMARY KEY NOT NULL,
	`finding_id` text NOT NULL,
	`audit_id` text NOT NULL,
	`agent_version_id` text NOT NULL,
	`failure_type` text NOT NULL,
	`reason` text NOT NULL,
	`original_finding_json` text NOT NULL,
	`corrected_finding_json` text NOT NULL,
	`regression_eval_case_id` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`finding_id`) REFERENCES `audit_finding`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`audit_id`) REFERENCES `supplier_audit`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`agent_version_id`) REFERENCES `agent_version`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`regression_eval_case_id`) REFERENCES `eval_case`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `human_correction_finding_idx` ON `human_correction` (`finding_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `human_correction_regression_case_unique` ON `human_correction` (`regression_eval_case_id`);