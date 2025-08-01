DROP VIEW "public"."users_with_tokens";--> statement-breakpoint
ALTER TABLE "shop_orders" ADD COLUMN "memo" text;--> statement-breakpoint
CREATE VIEW "public"."users_with_tokens" AS (select "slackId", "avatarUrl", "isAdmin", 
			GREATEST(
				COALESCE(
					(SELECT SUM(tokens) FROM payouts WHERE "userId" = "user"."slackId"),
					0
				) -
				COALESCE(
					(SELECT SUM("priceAtOrder") FROM shop_orders WHERE "userId" = "user"."slackId" AND status IN ('pending', 'fulfilled')),
					0
				),
				0
			)
		 as "tokens" from "user");