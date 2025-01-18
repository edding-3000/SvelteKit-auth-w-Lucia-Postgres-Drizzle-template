import { generateRandomOTP } from "./utils";
import { db } from "./db";
import { ExpiringTokenBucket } from "./rate-limit";
import { encodeBase32 } from "@oslojs/encoding";
import * as table from '$lib/server/db/schema';
import nodemailer from "nodemailer";
import { transporter } from "./transporter";
import { GMAIL_EMAIL } from '$env/static/private'

import type { RequestEvent } from "@sveltejs/kit";
import { and, eq } from "drizzle-orm";

export async function getUserEmailVerificationRequest(userId: number, id: string): Promise<EmailVerificationRequest | null> {
  const [row] = await db.select({
    id: table.emailVerificationRequest.id,
    userId: table.emailVerificationRequest.userId,
    code: table.emailVerificationRequest.code,
    email: table.emailVerificationRequest.email,
    expiresAt: table.emailVerificationRequest.expiresAt
  }).from(table.emailVerificationRequest)
    .where(
      and(
        eq(table.emailVerificationRequest.id, id),
        eq(table.emailVerificationRequest.userId, userId)
      )
    );
  if (row === null) {
    return row;
  }
  return row;
}

export async function createEmailVerificationRequest(userId: number, email: string): Promise<EmailVerificationRequest> {
  deleteUserEmailVerificationRequest(userId);
  const idBytes = new Uint8Array(20);
  crypto.getRandomValues(idBytes);
  const id = encodeBase32(idBytes).toLowerCase();

  const code = generateRandomOTP();
  const expiresAt = new Date(Date.now() + 1000 * 60 * 10);

  const [request] = await db.insert(table.emailVerificationRequest).values({ id, userId, code, email, expiresAt }).returning()

  return request;
}

export async function deleteUserEmailVerificationRequest(userId: number): Promise<void> {
  await db.delete(table.emailVerificationRequest).where(eq(table.emailVerificationRequest.userId, userId))
}

export async function sendVerificationEmail(email: string, code: string): Promise<void> {
  // const info = await transporter.sendMail({
  //   from: `"Maddison Foo Koch 👻" <${GMAIL_EMAIL}>`, // sender address
  //   to: email, // list of receivers
  //   subject: "Your verification code for Coolection", // Subject line
  //   text: `Your verification code is ${code}`, // plain text body
  //   html: `<strong>Your verification code is ${code}</strong>`, // html body
  // });

  // console.log("Message sent: %s", info.messageId);
  console.log(`To ${email}: Your verification code is ${code}`);
}

export function setEmailVerificationRequestCookie(event: RequestEvent, request: EmailVerificationRequest): void {
  event.cookies.set("email_verification", request.id, {
    httpOnly: true,
    path: "/",
    secure: import.meta.env.PROD,
    sameSite: "lax",
    expires: request.expiresAt
  });
}

export function deleteEmailVerificationRequestCookie(event: RequestEvent): void {
  event.cookies.set("email_verification", "", {
    httpOnly: true,
    path: "/",
    secure: import.meta.env.PROD,
    sameSite: "lax",
    maxAge: 0
  });
}

export async function getUserEmailVerificationRequestFromRequest(event: RequestEvent): Promise<EmailVerificationRequest | null> {
  if (event.locals.user === null) {
    return null;
  }
  const id = event.cookies.get("email_verification") ?? null;
  if (id === null) {
    return null;
  }
  const request = await getUserEmailVerificationRequest(event.locals.user.id, id);
  if (request === null) {
    deleteEmailVerificationRequestCookie(event);
  }
  return request;
}

export const sendVerificationEmailBucket = new ExpiringTokenBucket<number>(3, 60 * 10);

export interface EmailVerificationRequest {
  id: string;
  userId: number;
  code: string;
  email: string;
  expiresAt: Date;
}