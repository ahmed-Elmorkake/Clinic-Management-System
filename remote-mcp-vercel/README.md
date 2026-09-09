# Shefaa Remote MCP for Claude Web

This is a standalone remote MCP server for Vercel. Claude connects to `https://YOUR-VERCEL-DOMAIN/api/mcp` with OAuth and can use clinic-management tools from any Claude surface.

## Security model

- Firebase Admin credentials live only in Vercel environment variables.
- Claude must complete OAuth authorization using the MCP administrator email and password.
- Access tokens are scoped to `shefaa:manage` and expire after one hour.
- Authorization codes are single-use and recorded in Firestore.
- Doctor temporary passwords are never returned or written to Firestore/audit logs.

## Deploy to Vercel

1. Create a separate GitHub repository and upload this folder only (`remote-mcp-vercel`). Do not upload any `.env` file or Firebase JSON key.
2. In Google Cloud, revoke the Firebase key exposed previously and create a new service-account key. Keep its JSON private.
3. Import the repository in Vercel and set the Root Directory to `remote-mcp-vercel` if it is inside a larger repository.
4. Before the first production deployment, add these Vercel Environment Variables for Production:
   - `FIREBASE_SERVICE_ACCOUNT_JSON_BASE64` (recommended): Base64 of the entire new service-account JSON. In PowerShell run: `[Convert]::ToBase64String([IO.File]::ReadAllBytes('C:\\path\\to\\new-key.json'))`, then paste its output. Alternatively use `FIREBASE_SERVICE_ACCOUNT_JSON` with the full JSON content.
   - `MCP_OAUTH_SIGNING_SECRET`: a unique random value of at least 32 characters.
   - `MCP_ADMIN_EMAIL`: the email you use to authorize Claude.
   - `MCP_ADMIN_PASSWORD_HASH`: run `npm run hash:admin-password` locally and paste the output.
   - `MCP_PUBLIC_ORIGIN`: your final production Vercel URL, for example `https://shefaa-remote-mcp.vercel.app`.
5. Deploy. If Vercel gives a different production URL than the value used in `MCP_PUBLIC_ORIGIN`, update the variable and redeploy.

## Connect in Claude Web

1. In Claude, open **Customize → Connectors → Add custom connector**.
2. Name: `Shefaa Clinic Manager`.
3. URL: `https://YOUR-VERCEL-DOMAIN/api/mcp`.
4. Click Add. Claude discovers OAuth automatically, opens the Shefaa authorization page, then sign in with `MCP_ADMIN_EMAIL` and its plaintext administrator password.
5. Enable the connector in a conversation from **+ → Connectors**.

## Tools

- `list_clinics`
- `create_clinic`
- `create_doctor`
- `list_doctors`

Always ask Claude to show a summary and wait for confirmation before calling `create_clinic` or `create_doctor`.
