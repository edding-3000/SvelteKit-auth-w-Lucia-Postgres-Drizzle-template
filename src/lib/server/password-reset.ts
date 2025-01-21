import { db } from "./db";
import * as table from '$lib/server/db/schema';
import { encodeHexLowerCase } from "@oslojs/encoding";
import { generateRandomOTP } from "./utils";
import { sha256 } from "@oslojs/crypto/sha2";
import nodemailer from "nodemailer";
import { transporter } from "./transporter";
import { GMAIL_EMAIL } from '$env/static/private'

import type { RequestEvent } from "@sveltejs/kit";
import type { User } from "./user";
import { eq, sql } from "drizzle-orm";

export async function createPasswordResetSession(token: string, userId: number, email: string): Promise<PasswordResetSession> {
  const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));
  const session: PasswordResetSession = {
    id: sessionId,
    userId,
    email,
    expiresAt: new Date(Date.now() + 1000 * 60 * 10),
    code: generateRandomOTP(),
    emailVerified: false,
    twoFactorVerified: false
  };
  await db.insert(table.passwordResetSession)
    .values({
      id: session.id,
      userId: session.userId,
      email: session.email,
      code: session.code,
      expiresAt: session.expiresAt,
    })
  return session;
}

export async function validatePasswordResetSessionToken(token: string): Promise<PasswordResetSessionValidationResult> {
  const sessionId = encodeHexLowerCase(sha256(new TextEncoder().encode(token)));

  const [row] = await db.select({
    passwordResetSession: {
      id: table.passwordResetSession.id,
      userId: table.passwordResetSession.userId,
      email: table.passwordResetSession.email,
      code: table.passwordResetSession.code,
      expiresAt: table.passwordResetSession.expiresAt,
      emailVerified: table.passwordResetSession.emailVerified,
      twoFactorVerified: table.passwordResetSession.twoFactorVerified
    },
    user: {
      id: table.user.id,
      email: table.user.email,
      username: table.user.username,
      emailVerified: table.user.emailVerified,
      hasTotpCredential: sql`CASE WHEN ${table.totpCredential.id} IS NOT NULL THEN true ELSE false END`,
      hasPasskeyCredential: sql`CASE WHEN ${table.passkeyCredential.id} IS NOT NULL THEN true ELSE false END`,
      hasSecurityKeyCredential: sql`CASE WHEN ${table.securityKeyCredential.id} IS NOT NULL THEN true ELSE false END`,
    }
  }).from(table.passwordResetSession)
    .innerJoin(table.user, eq(table.passwordResetSession.userId, table.user.id))
    .leftJoin(table.totpCredential, eq(table.user.id, table.totpCredential.userId))
    .leftJoin(table.passkeyCredential, eq(table.user.id, table.passkeyCredential.userId))
    .leftJoin(table.securityKeyCredential, eq(table.user.id, table.securityKeyCredential.userId))
    .where(eq(table.passwordResetSession.id, sessionId));

  if (row === null || row === undefined) {
    return { session: null, user: null };
  }
  const session: PasswordResetSession = {
    id: row.passwordResetSession.id,
    userId: row.passwordResetSession.userId,
    email: row.passwordResetSession.email,
    code: row.passwordResetSession.code,
    expiresAt: row.passwordResetSession.expiresAt,
    emailVerified: row.passwordResetSession.emailVerified,
    twoFactorVerified: row.passwordResetSession.twoFactorVerified
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
  if (Date.now() >= session.expiresAt.getTime()) {
    await db.delete(table.passwordResetSession).where(eq(table.passwordResetSession.id, session.id));
    return { session: null, user: null };
  }
  return { session, user };
}

export async function setPasswordResetSessionAsEmailVerified(sessionId: string): Promise<void> {
  await db.update(table.passwordResetSession).set({ emailVerified: true }).where(eq(table.passwordResetSession.id, sessionId))
}

export async function setPasswordResetSessionAs2FAVerified(sessionId: string): Promise<void> {
  await db.update(table.passwordResetSession).set({ twoFactorVerified: true }).where(eq(table.passwordResetSession.id, sessionId))
}

export async function invalidateUserPasswordResetSessions(userId: number): Promise<void> {
  await db.delete(table.passwordResetSession).where(eq(table.passwordResetSession.userId, userId))
}

export async function validatePasswordResetSessionRequest(event: RequestEvent): Promise<PasswordResetSessionValidationResult> {
  const token = event.cookies.get("password_reset_session") ?? null;
  if (token === null) {
    return { session: null, user: null };
  }
  const result = await validatePasswordResetSessionToken(token);
  if (result.session === null) {
    deletePasswordResetSessionTokenCookie(event);
  }
  return result;
}

export function setPasswordResetSessionTokenCookie(event: RequestEvent, token: string, expiresAt: Date): void {
  event.cookies.set("password_reset_session", token, {
    expires: expiresAt,
    sameSite: "lax",
    httpOnly: true,
    path: "/",
    secure: !import.meta.env.DEV
  });
}

export function deletePasswordResetSessionTokenCookie(event: RequestEvent): void {
  event.cookies.set("password_reset_session", "", {
    maxAge: 0,
    sameSite: "lax",
    httpOnly: true,
    path: "/",
    secure: !import.meta.env.DEV
  });
}

export function sendPasswordResetEmail(email: string, code: string): void {
  // const info = await transporter.sendMail({
  //   from: `"Maddison Foo Koch 👻" <${GMAIL_EMAIL}>`, // sender address
  //   to: email, // list of receivers
  //   subject: "Your verification code for XYZ", // Subject line
  //   text: `Your verification code is ${code}`, // plain text body
  //   html: `<strong>Your verification code is ${code}</strong>`, // html body
  // });

  console.log(`To ${email}: Your reset code is ${code}`);
}

export interface PasswordResetSession {
  id: string;
  userId: number;
  email: string;
  expiresAt: Date;
  code: string;
  emailVerified: boolean;
  twoFactorVerified: boolean;
}

export type PasswordResetSessionValidationResult =
  | { session: PasswordResetSession; user: User }
  | { session: null; user: null };