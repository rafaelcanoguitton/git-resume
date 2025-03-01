import { int, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

export const stashes = sqliteTable("stashes_table", {
  id: int().primaryKey({ autoIncrement: true }),
  userId: int(),
  path: text(),
});

export const users = sqliteTable("users_table", {
  id: int().primaryKey({ autoIncrement: true }),
  githubId: text(),
});

export const stashRelations = relations(stashes, ({ one }) => ({
  user: one(users, {
    fields: [stashes.userId],
    references: [users.id],
  }),
}));

export const userRelations = relations(users, ({ many }) => ({
  stashes: many(stashes),
}));
