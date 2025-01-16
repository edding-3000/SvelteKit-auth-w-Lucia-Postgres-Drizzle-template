# Svelte 5 with [Lucia auth](https://lucia-auth.com), postgres and [Drizzle](https://orm.drizzle.team) setup as template project in TypeScipt :revolving_hearts:

This is a Svelte 5 project with Lucia auth [Email and password with 2FA](https://lucia-auth.com/examples/email-password-2fa) already implemented, ready to use and extend.

The files within [`routes/lucia/signup`](src/routes/lucia/signup) have been modified with another password called 'registery password' field, so that only users who know this password can register. The password is stored as an encrypted variable in the env file (possibly not secure). 
If this is not what you want or need, small parts of the code in [`+page.server.ts`](src/routes/lucia/signup/+page.server.ts) and [`+page.svelte`](src/routes/lucia/signup/+page.svelte) must be removed.

I simply followed lucia auth's instructions. I'm definitely not an expert on authorization or anything like that. I just thought it might make life easier for some people.

Also there is a small type issue in [`/routs/lucia/signup/+page.svelte`](src/routs/lucia/signup/+page.svelte), not sure if its a local problem.

## Creating a project :clipboard:

U need to setup ur postgres database.

### Lucia :smiling_imp:
- Run `npm run db:push` to update your database schema
- Visit /lucia route to view the demo

### Drizzle :sweat_drops:
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
