import { pgTable, serial, text, integer, timestamp, boolean, customType, uniqueIndex } from 'drizzle-orm/pg-core';
import { SQL, sql } from 'drizzle-orm';

const bytea = customType<{
	data: Uint8Array,
	notNull: true
}>({
	dataType() {
		return 'bytea'
	},
})

export const user = pgTable('user', {
	id: serial('id').primaryKey().notNull(),
	email: text('email').notNull().unique(),
	username: text('username').notNull().unique(),
	passwordHash: text('password_hash').notNull(),
	emailVerified: boolean('email_verified').default(false).notNull(),
	recoveryCode: bytea('recovery_code').notNull(),
},
	(table) => ({
		emailUniqueIndex: uniqueIndex('email_index').on(sql`lower(${table.email})`),
	}),
);

export const session = pgTable('session', {
	id: text('id').primaryKey().notNull(),
	userId: integer('user_id')
		.notNull()
		.references(() => user.id),
	expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
	twoFactorVerified: boolean('two_factor_verified').default(false).notNull(),
});

export const emailVerificationRequest = pgTable('email_verification_request', {
	id: text('id').primaryKey().notNull(),
	userId: integer('user_id')
		.notNull()
		.references(() => user.id),
	email: text('email').notNull(),
	code: text('code').notNull(),
	expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
});

export const passwordResetSession = pgTable('password_reset_session', {
	id: text('id').primaryKey().notNull(),
	userId: integer('user_id')
		.notNull()
		.references(() => user.id),
	email: text('email').notNull(),
	code: text('code').notNull(),
	expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
	emailVerified: boolean('email_verified').default(false).notNull(),
	twoFactorVerified: boolean('two_factor_verified').default(false).notNull(),
});

export const totpCredential = pgTable('totp_credential', {
	id: serial('id').primaryKey().notNull(),
	userId: integer('user_id')
		.notNull()
		.references(() => user.id),
	key: bytea('key').notNull(),
});

export const passkeyCredential = pgTable('passkey_credential', {
	id: bytea('id').notNull(),
	userId: integer('user_id')
		.notNull()
		.references(() => user.id),
	name: text('name').notNull(),
	algorithm: integer('algorithm').notNull(),
	publicKey: bytea('public_key').notNull(),
});

export const securityKeyCredential = pgTable('security_key_credential', {
	id: bytea('id').notNull(),
	userId: integer('user_id')
		.notNull()
		.references(() => user.id),
	name: text('name').notNull(),
	algorithm: integer('algorithm').notNull(),
	publicKey: bytea('public_key').notNull(),
});

export type PasswordResetSession = typeof passwordResetSession.$inferSelect;

export type EmailVerificationRequest = typeof emailVerificationRequest.$inferSelect;

export type Session = typeof session.$inferSelect;

export type User = typeof user.$inferSelect;

export type TotpCredential = typeof totpCredential.$inferSelect;

export type PasskeyCredential = typeof passkeyCredential.$inferSelect;

export type SecurityKeyCredential = typeof securityKeyCredential.$inferSelect;
