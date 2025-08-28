ALTER TABLE "payouts" ADD COLUMN "baseHackatimeHours" numeric DEFAULT '0.0' NOT NULL;--> statement-breakpoint
ALTER TABLE "payouts" ADD COLUMN "overridenHours" numeric DEFAULT '0.0' NOT NULL;