import { pgTable, pgView, integer, text, boolean, timestamp, varchar } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export const rawUsers = pgTable('user', {
	slackId: text().primaryKey(),
	avatarUrl: text().notNull(),
	isAdmin: boolean().default(false).notNull()
});

export const shopItems = pgTable('shop_items', {
	id: text()
		.primaryKey()
		.$defaultFn(() => nanoid()),
	name: text().notNull(),
	description: text().notNull(),
	imageUrl: text().notNull(),
	price: integer().notNull(),
	type: varchar({ enum: ['hcb', 'third_party'] }),
	hcbMids: text().array()
});

export const shopOrders = pgTable('shop_orders', {
	id: text()
		.primaryKey()
		.$defaultFn(() => nanoid()),
	shopItemId: text()
		.notNull()
		.references(() => shopItems.id),
	priceAtOrder: integer().notNull(),
	status: varchar({ enum: ['pending', 'fulfilled', 'rejected'] })
		.default('pending')
		.notNull(),
	memo: text(),
	createdAt: timestamp().notNull().defaultNow(),
	userId: text()
		.notNull()
		.references(() => rawUsers.slackId)
});

export const payouts = pgTable('payouts', {
	id: text()
		.primaryKey()
		.$defaultFn(() => nanoid()),
	tokens: integer().notNull(),
	userId: text()
		.notNull()
		.references(() => rawUsers.slackId),
	memo: text(),
	createdAt: timestamp().notNull().defaultNow()
});

export const usersWithTokens = pgView('users_with_tokens').as((qb) => {
	return qb
		.select({
			slackId: rawUsers.slackId,
			avatarUrl: rawUsers.avatarUrl,
			isAdmin: rawUsers.isAdmin,
			tokens: sql<number>`
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
		`.as('tokens')
		})
		.from(rawUsers);
});

export type UserWithTokens = typeof usersWithTokens.$inferSelect;
export type ShopItem = typeof shopItems.$inferSelect;
export type ShopOrder = typeof shopOrders.$inferSelect;
export type Payout = typeof payouts.$inferSelect;
