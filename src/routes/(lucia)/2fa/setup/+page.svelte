<script lang="ts">
	import { enhance } from '$app/forms';
</script>

<h1>Set up two-factor authentication</h1>
<ul>
	<li><a href="/2fa/totp/setup">Authenticator apps</a></li>
	<li><a href="/2fa/passkey/register">Passkeys</a></li>
	<li><a href="/2fa/security-key/register">Security keys</a></li>
</ul>

<form method="post" use:enhance>
	<button>Back</button>
</form>
