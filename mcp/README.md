# Shefaa Clinic MCP for Claude Desktop

This local MCP server manages clinics and doctor accounts in Firebase without Cloud Functions. It communicates with Claude Desktop through `stdio`; it does not expose an HTTP endpoint.

## Setup

1. Keep the Firebase service-account JSON on this computer and outside Git.
2. Open Claude Desktop's configuration file:
   `%APPDATA%\\Claude\\claude_desktop_config.json`
3. Merge the `mcpServers.shefaa-clinic-manager` entry from `claude_desktop_config.example.json` into that file. Do not replace unrelated existing MCP servers.
4. Restart Claude Desktop completely.
5. In Claude Desktop, ask to list clinics or create a doctor. Approve the tool call only after reviewing its details.

## Available tools

- `list_clinics` — fetches clinic IDs and names.
- `create_clinic` — adds an active clinic and audit record.
- `create_doctor` — creates Firebase Authentication, `users/{uid}`, `doctors/{uid}`, custom role claim, and an audit record. The doctor is active but must complete their profile and availability at first login.
- `list_doctors` — verifies doctor accounts, optionally by clinic ID.

## Security notes

- The service-account JSON path is a local Claude Desktop setting. Never paste its file contents into chat or commit it to Git.
- The temporary password is used only to create Firebase Authentication. The server never stores it in Firestore or audit logs and never returns it in a tool response.
- Only install this MCP configuration on an administrator-controlled computer; it has Firebase Admin privileges.
