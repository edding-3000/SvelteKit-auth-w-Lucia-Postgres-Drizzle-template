import { pgTable, serial, text, integer, timestamp, boolean, customType } from 'drizzle-orm/pg-core';

const bytea = customType<{
	data: Buffer
	default: false
}>({
	dataType() {
		return 'bytea'
	},
})

export const user = pgTable('user', {
	id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
	age: integer('age'),
	email: text('email').notNull(),
	emailVerified: boolean('email_verified').default(false).notNull(),
	username: text('username').notNull().unique(),
	passwordHash: text('password_hash').notNull(),
	registered2FA: boolean('registered2FA').default(false).notNull(),
	recoveryCode: bytea('recovery_code').notNull(),
	totpKey: bytea('totp_key')
});

export const session = pgTable('session', {
	id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
	userId: integer('user_id')
		.notNull()
		.references(() => user.id),
	expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
	twoFactorVerified: boolean('two_factor_verified').default(false).notNull().references(() => user.registered2FA)
});

export const emailVerificationRequest = pgTable('email_verification_request', {
	id: text('id').notNull(),
	userId: integer('user_id')
		.notNull()
		.references(() => user.id),
	email: text('email').notNull().references(() => user.email),
	expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
	code: text('code').notNull()
});

export const passwordResetSession = pgTable('password_reset_session', {
	id: text('id').notNull(),
	userId: integer('user_id')
		.notNull()
		.references(() => user.id),
	email: text('email').notNull().references(() => user.email),
	expiresAt: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
	emailVerified: boolean('email_verified').notNull().references(() => user.emailVerified),
	twoFactorVerified: boolean('two_factor_verified').notNull().references(() => user.registered2FA),
	code: text('code').notNull()
});

export type PasswordResetSession = typeof passwordResetSession.$inferSelect;

export type EmailVerificationRequest = typeof emailVerificationRequest.$inferSelect;

export type Session = typeof session.$inferSelect;

export type User = typeof user.$inferSelect;
