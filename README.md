# [Lucia auth](https://lucia-auth.com) w/ Sveltekit, postgres and [Drizzle](https://orm.drizzle.team) as template project written in TypeScipt :revolving_hearts:

This is a SvelteKit template project with Lucia auth [Email and password example with 2FA and WebAuthn](https://lucia-auth.com/examples/email-password-2fa-webauthn) already implemented, ready to use and extend.

It uses [`nodemailer`](https://www.nodemailer.com) for sending emails.

I simply followed lucia auth's instructions. I'm definitely not an expert on authorization or anything like that. I just thought it might make life easier for some people.

## TODOs :clipboard:

### env

Create a .env file. Generate a 128 bit (16 byte) string, base64 encode it, and set it as `ENCRYPTION_KEY`.

```bash
ENCRYPTION_KEY="L9pmqRJnO1ZJSQ2svbHuBA=="
```

> You can use OpenSSL to quickly generate a secure key.
>
> ```bash
> openssl rand --base64 16
> ```


- Add an 'ORIGIN' variable to your env file that corresponds to the hostname (for example `"localgost"`).
- Add an 'ORIGIN_URL' variable to your env file that corresponds to the host url (for example `"http://localhost:5173"`).

### Setup SMTP for sending mails

Setup your SMTP server in the [`transporter.ts`](src/lib/server/transporter.ts) file. You can use [Gmail](https://support.google.com/a/answer/176600). Insert your gmail as `GMAIL_EMAIL` and an ["app password"](https://support.google.com/mail/answer/185833?hl=en&sjid=4253428048818908293-EU) as `GMAIL_PASSWORD` in your env file.

Uncomment and fill in / rewrite the informations for the email-verification process in the [`email-verification.ts`](src/lib/server/email-verification.ts) file and password-reset process in the [`password-reset.ts`](src/lib/server/password-reset.ts) file.

### Setup your postgres database

This project uses Drizzle ORM.

#### Lucia :smiling_imp:
- Run `npm run db:push` to update your database schema
- Visit /lucia route to view the demo

#### Drizzle :sweat_drops:
- You will need to set DATABASE_URL in your production environment
- Run `npm run db:push` to update your database schema

## Developing

Once you've created a project and installed dependencies with `npm install` (or `pnpm install` or `yarn`), start a development server:

```bash
npm run dev

# or start the server and open the app in a new browser tab
npm run dev -- --open
```

## Building

To create a production version of your app:

```bash
npm run build
```

You can preview the production build with `npm run preview`.

> To deploy your app, you may need to install an [adapter](https://svelte.dev/docs/kit/adapters) for your target environment.
