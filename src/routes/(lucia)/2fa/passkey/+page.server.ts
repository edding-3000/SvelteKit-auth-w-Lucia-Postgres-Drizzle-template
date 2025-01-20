import { fail, redirect } from "@sveltejs/kit";
import { get2FARedirect } from "$lib/server/2fa";
import { getUserPasskeyCredentials } from "$lib/server/webauthn";

import type { Actions, RequestEvent } from "@sveltejs/kit";
import { deleteSessionTokenCookie, invalidateSession } from "$lib/server/session";

export async function load(event: RequestEvent) {
	if (event.locals.session === null || event.locals.user === null) {
		return redirect(302, "/login");
	}
	if (!event.locals.user.emailVerified) {
		return redirect(302, "/verify-email");
	}
	if (!event.locals.user.registered2FA) {
		return redirect(302, "/");
	}
	if (event.locals.session.twoFactorVerified) {
		return redirect(302, "/");
	}
	if (!event.locals.user.registeredPasskey) {
		return redirect(302, get2FARedirect(event.locals.user));
	}
	const dbCredentials = await getUserPasskeyCredentials(event.locals.user.id);

	const credentials = dbCredentials.map((credential) => ({
		...credential,
		id: new Uint8Array(credential.id),
		publicKey: new Uint8Array(credential.publicKey),
	}));

	return {
		credentials,
		user: event.locals.user
	};
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
