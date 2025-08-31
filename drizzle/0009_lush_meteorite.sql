ALTER TABLE "user" ADD COLUMN "country" varchar(2);--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "yswsDbFulfilled" boolean DEFAULT false NOT NULL;