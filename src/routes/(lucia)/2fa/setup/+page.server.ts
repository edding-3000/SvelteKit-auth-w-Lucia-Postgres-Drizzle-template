import { fail, redirect } from "@sveltejs/kit";
import { deleteSessionTokenCookie, invalidateSession } from "$lib/server/session";

import type { Actions, RequestEvent } from "@sveltejs/kit";

export async function load(event: RequestEvent) {
  if (event.locals.session === null || event.locals.user === null) {
    return redirect(302, "/login");
  }
  if (!event.locals.user.emailVerified) {
    return redirect(302, "/verify-email");
  }
  if (event.locals.user.registered2FA) {
    return redirect(302, "/");
  }
  return {};
}

export const actions: Actions = {
  default: action
};

async function action(event: RequestEvent) {
  if (event.locals.session === null) {
    return fail(401, {
      message: "Not authenticated"
    });
  }
  await invalidateSession(event.locals.session.id);
  deleteSessionTokenCookie(event);
  return redirect(302, "/login");
}