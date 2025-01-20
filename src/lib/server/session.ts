import type { RequestEvent } from '@sveltejs/kit';
import { eq, sql } from 'drizzle-orm';
import { sha256 } from '@oslojs/crypto/sha2';
import { encodeBase32LowerCaseNoPadding, encodeHexLowerCase } from '@oslojs/encoding';
import { db } from '$lib/server/db';
import * as table from '$lib/server/db/schema';
import type { User } from './user';

const DAY_IN_MS = 1000 * 60 * 60 * 24;

export const sessionCookieName = 'auth-session';

export function generateSessionToken() {
	const bytes = crypto.getRandomValues(new Uint8Array(20));
	const token = encodeBase32LowerCaseNoPadding(bytes);
	return token;
}

export async function createSession(token: string, userId: number, flags: SessionFlags) {
	const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
	const session: Session = {
		id: sessionId,
		userId,
		expiresAt: new Date(Date.now() + DAY_IN_MS * 30),
		twoFactorVerified: flags.twoFactorVerified
	};
	await db.insert(table.session).values(session);
	return session;
}

export async function validateSessionToken(token: string): Promise<{ session: Session; user: User } | { session: null; user: null }> {
	const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
	const [row] = await db
		.select({
			// Adjust user table here to tweak returned data
			user: {
				id: table.user.id,
				username: table.user.username,
				email: table.user.email,
				emailVerified: table.user.emailVerified,
				hasTotpCredential: sql`CASE WHEN ${table.totpCredential.id} IS NOT NULL THEN true ELSE false END`,
				hasPasskeyCredential: sql`CASE WHEN ${table.passkeyCredential.id} IS NOT NULL THEN true ELSE false END`,
				hasSecurityKeyCredential: sql`CASE WHEN ${table.securityKeyCredential.id} IS NOT NULL THEN true ELSE false END`,
			},
			session: table.session
		})
		.from(table.session)
		.innerJoin(table.user, eq(table.session.userId, table.user.id))
		.leftJoin(table.totpCredential, eq(table.user.id, table.totpCredential.userId))
		.leftJoin(table.passkeyCredential, eq(table.user.id, table.passkeyCredential.userId))
		.leftJoin(table.securityKeyCredential, eq(table.user.id, table.securityKeyCredential.userId))
		.where(eq(table.session.id, sessionId));

	if (!row) {
		return { session: null, user: null };
	}

	const session: Session = {
		id: row.session.id,
		userId: row.session.userId,
		expiresAt: row.session.expiresAt,
		twoFactorVerified: row.session.twoFactorVerified
	};
	const user: User = {
		id: row.user.id,
		email: row.user.email,
		username: row.user.username,
		emailVerified: row.user.emailVerified,
		registeredTOTP: row.user.hasTotpCredential as boolean,
		registeredPasskey: row.user.hasPasskeyCredential as boolean,
		registeredSecurityKey: row.user.hasSecurityKeyCredential as boolean,
		registered2FA: false
	};
	if (user.registeredPasskey || user.registeredSecurityKey || user.registeredTOTP) {
		user.registered2FA = true;
	}

	const sessionExpired = Date.now() >= session.expiresAt.getTime();
	if (sessionExpired) {
		await db.delete(table.session).where(eq(table.session.id, session.id));
		return { session: null, user: null };
	}

	const renewSession = Date.now() >= session.expiresAt.getTime() - DAY_IN_MS * 15;
	if (renewSession) {
		session.expiresAt = new Date(Date.now() + DAY_IN_MS * 30);
		await db
			.update(table.session)
			.set({ expiresAt: session.expiresAt })
			.where(eq(table.session.id, session.id));
	}

	return { session, user };
}

export type SessionValidationResult = Awaited<ReturnType<typeof validateSessionToken>>;

export async function invalidateSession(sessionId: string) {
	await db.delete(table.session).where(eq(table.session.id, sessionId));
}

export async function invalidateUserSessions(userId: number) {
	await db.delete(table.session).where(eq(table.session.userId, userId));
}

export async function setSessionAs2FAVerified(sessionId: string) {
	await db.update(table.session).set({ twoFactorVerified: true }).where(eq(table.session.id, sessionId))
}

export function setSessionTokenCookie(event: RequestEvent, token: string, expiresAt: Date) {
	event.cookies.set(sessionCookieName, token, {
		httpOnly: true,
		path: "/",
		secure: import.meta.env.PROD,
		sameSite: "lax",
		expires: expiresAt
	});
}

export function deleteSessionTokenCookie(event: RequestEvent) {
	event.cookies.delete(sessionCookieName, {
		httpOnly: true,
		path: "/",
		secure: import.meta.env.PROD,
		sameSite: "lax",
		maxAge: 0
	});
}

export interface SessionFlags {
	twoFactorVerified: boolean;
}

export interface Session extends SessionFlags {
	id: string;
	expiresAt: Date;
	userId: number;
}
