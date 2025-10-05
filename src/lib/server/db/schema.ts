import {
	pgTable,
	pgView,
	integer,
	text,
	boolean,
	timestamp,
	varchar,
	decimal,
	index
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export const rawUsers = pgTable('user', {
	slackId: text().primaryKey(),
	displayName: text(),
	avatarUrl: text().notNull(),
	isAdmin: boolean().default(false).notNull(),
	country: varchar({ length: 2 }),
	yswsDbFulfilled: boolean().default(false).notNull()
});

export const shopItems = pgTable('shop_items', {
	id: text()
		.primaryKey()
		.$defaultFn(() => nanoid()),
	name: text().notNull(),
	description: text().notNull(),
	imageUrl: text().notNull(),
	price: integer().notNull(),
	usd_cost: integer(),
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
}, (table) => ({
	userIdIdx: index('shop_orders_user_id_idx').on(table.userId),
	shopItemIdIdx: index('shop_orders_shop_item_id_idx').on(table.shopItemId),
	statusIdx: index('shop_orders_status_idx').on(table.status),
	createdAtIdx: index('shop_orders_created_at_idx').on(table.createdAt)
}));

export const payouts = pgTable('payouts', {
	id: text()
		.primaryKey()
		.$defaultFn(() => nanoid()),
	tokens: integer().notNull(),
	userId: text()
		.notNull()
		.references(() => rawUsers.slackId),
	memo: text(),
	createdAt: timestamp().notNull().defaultNow(),
	submittedToUnified: boolean().default(false).notNull(),
	baseHackatimeHours: decimal().default('0.0').notNull(),
	overridenHours: decimal().default('0.0')
}, (table) => ({
	userIdIdx: index('payouts_user_id_idx').on(table.userId),
	createdAtIdx: index('payouts_created_at_idx').on(table.createdAt),
	submittedToUnifiedIdx: index('payouts_submitted_to_unified_idx').on(table.submittedToUnified)
}));

export const usersWithTokens = pgView('users_with_tokens').as((qb) => {
	return qb
		.select({
			slackId: rawUsers.slackId,
			displayName: rawUsers.displayName,
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
