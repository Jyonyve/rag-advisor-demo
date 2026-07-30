CREATE TABLE "demo_guests" (
	"user_id" text PRIMARY KEY NOT NULL,
	"auth_recipe_user_id" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "demo_guests" ADD CONSTRAINT "demo_guests_user_id_users_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("user_id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "demo_guests_expires_at_idx" ON "demo_guests" USING btree ("expires_at");
--> statement-breakpoint
CREATE TABLE "demo_guest_attempts" (
	"attempt_id" text PRIMARY KEY NOT NULL,
	"client_hash" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE INDEX "demo_guest_attempts_client_created_idx" ON "demo_guest_attempts" USING btree ("client_hash", "created_at");
--> statement-breakpoint
CREATE TABLE "demo_generation_usage" (
	"usage_id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"kind" text NOT NULL,
	"status" text NOT NULL,
	"usage_day" date NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "demo_generation_usage_kind_check" CHECK ("demo_generation_usage"."kind" in ('chat', 'report')),
	CONSTRAINT "demo_generation_usage_status_check" CHECK ("demo_generation_usage"."status" in ('reserved', 'succeeded', 'failed'))
);
--> statement-breakpoint
ALTER TABLE "demo_generation_usage" ADD CONSTRAINT "demo_generation_usage_user_id_demo_guests_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."demo_guests"("user_id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "demo_generation_usage_user_kind_idx" ON "demo_generation_usage" USING btree ("user_id", "kind", "status");
--> statement-breakpoint
CREATE INDEX "demo_generation_usage_day_kind_idx" ON "demo_generation_usage" USING btree ("usage_day", "kind", "status");
