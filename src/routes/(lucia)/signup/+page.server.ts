import { fail, redirect } from "@sveltejs/kit";
import { checkEmailAvailability, verifyEmailInput } from "$lib/server/email";
import { createUser, verifyUsernameInput } from "$lib/server/user";
import { RefillingTokenBucket } from "$lib/server/rate-limit";
import { verifyPasswordHash, verifyPasswordStrength } from "$lib/server/password";
import { createSession, generateSessionToken, setSessionTokenCookie } from "$lib/server/session";
import {
  createEmailVerificationRequest,
  sendVerificationEmail,
  setEmailVerificationRequestCookie
} from "$lib/server/email-verification";
import { get2FARedirect } from "$lib/server/2fa";

import type { SessionFlags } from "$lib/server/session";
import type { Actions, ServerLoadEvent, RequestEvent } from "@sveltejs/kit";
import { REGISTERY_PW } from "$env/static/private";
import { getClientIP } from "$lib/server/getClientIP";

const ipBucket = new RefillingTokenBucket<string>(3, 10);

export function load(event: ServerLoadEvent) {
  if (event.locals.session !== null && event.locals.user !== null) {
    if (!event.locals.user.emailVerified) {
      return redirect(302, "/verify-email");
    }
    if (!event.locals.user.registered2FA) {
      return redirect(302, "/2fa/setup");
    }
    if (!event.locals.session.twoFactorVerified) {
      return redirect(302, get2FARedirect(event.locals.user));
    }
    return redirect(302, "/");
  }
  return {};
}

export const actions: Actions = {
  default: action
};

async function action(event: RequestEvent) {
  // TODO: Assumes X-Forwarded-For is always included.
  const clientIP = getClientIP(event);
  if (clientIP !== null && !ipBucket.check(clientIP, 1)) {
    return fail(429, {
      message: "Too many requests",
      email: "",
      username: ""
    });
  }

  const formData = await event.request.formData();
  const email = formData.get("email");
  const username = formData.get("username");
  const password = formData.get("password");
  const confirmPassword = formData.get("confirmPassword");

  // Password you need if you want to register
  const registeryPassword = formData.get('registeryPassword');

  if (typeof email !== "string" || typeof username !== "string" || typeof password !== "string" || typeof confirmPassword !== "string" || typeof registeryPassword !== "string") {
    return fail(400, {
      message: "Invalid or missing fields",
      email: "",
      username: ""
    });
  }
  if (email === "" || password === "" || confirmPassword === "" || username === "" || registeryPassword === "") {
    return fail(400, {
      message: "Please enter your username, email, password and registery password",
      email: "",
      username: ""
    });
  }
  if (!verifyEmailInput(email)) {
    return fail(400, {
      message: "Invalid email",
      email,
      username
    });
  }
  const emailAvailable = await checkEmailAvailability(email);
  if (!emailAvailable) {
    return fail(400, {
      message: "Email is already used",
      email,
      username
    });
  }
  if (!verifyUsernameInput(username)) {
    return fail(400, {
      message: "Invalid username",
      email,
      username
    });
  }
  const strongPassword = await verifyPasswordStrength(password);
  if (!strongPassword) {
    return fail(400, {
      message: "Weak password",
      email,
      username
    });
  }
  if (password !== confirmPassword || password.normalize() !== confirmPassword.normalize()) {
    return fail(400, {
      message: "Passwords do not match.",
      email,
      username
    });
  }
  if (clientIP !== null && !ipBucket.consume(clientIP, 1)) {
    return fail(429, {
      message: "Too many requests",
      email,
      username
    });
  }

  // Remove from here
  try {
    if (!REGISTERY_PW) throw new Error('REGISTERY_PW is not set');
    const validPassword = await verifyPasswordHash(REGISTERY_PW, registeryPassword as string);
    if (!validPassword) {
      return fail(400, {
        message: 'Incorrect registery password',
        email: "",
        username: ""
      });
    }
  } catch (e) {
    return fail(500, {
      message: 'An error has occurred while checking registery password.',
      email: "",
      username: ""
    });
  }
  // to here

  const user = await createUser(email, username, password);
  const emailVerificationRequest = await createEmailVerificationRequest(user.id, user.email);
  await sendVerificationEmail(emailVerificationRequest.email, emailVerificationRequest.code);
  setEmailVerificationRequestCookie(event, emailVerificationRequest);

  const sessionFlags: SessionFlags = {
    twoFactorVerified: false
  };
  const sessionToken = generateSessionToken();
  const session = await createSession(sessionToken, user.id, sessionFlags);
  setSessionTokenCookie(event, sessionToken, session.expiresAt);
  throw redirect(302, "/2fa/setup");
}