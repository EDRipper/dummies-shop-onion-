CREATE TABLE "user" (
	"slackId" text PRIMARY KEY NOT NULL,
	"avatarUrl" text NOT NULL,
	"isAdmin" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payouts" (
	"id" text PRIMARY KEY NOT NULL,
	"tokens" integer NOT NULL,
	"userId" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shop_items" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"imageUrl" text NOT NULL,
	"price" integer NOT NULL,
	"type" varchar,
	"hcbMids" text[]
);
--> statement-breakpoint
CREATE TABLE "shop_orders" (
	"id" text PRIMARY KEY NOT NULL,
	"shopItemId" text NOT NULL,
	"priceAtOrder" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"userId" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_userId_user_slackId_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("slackId") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop_orders" ADD CONSTRAINT "shop_orders_shopItemId_shop_items_id_fk" FOREIGN KEY ("shopItemId") REFERENCES "public"."shop_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shop_orders" ADD CONSTRAINT "shop_orders_userId_user_slackId_fk" FOREIGN KEY ("userId") REFERENCES "public"."user"("slackId") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE VIEW "public"."users_with_tokens" AS (select "slackId", "avatarUrl", "isAdmin", 
			GREATEST(
				COALESCE(
					(SELECT SUM(tokens) FROM payouts WHERE "userId" = "user"."slackId"), 
					0
				) - 
				COALESCE(
					(SELECT SUM("priceAtOrder") FROM shop_orders WHERE "userId" = "user"."slackId"), 
					0
				),
				0
			)
		 as "tokens" from "user");