# Fabric capacity access setup — for the capacity owner

You (or whoever owns the Fabric trial capacity this project uses) need to grant a teammate access
without using guest sharing or shared credentials. This doc explains why, and gives both an
agent-automatable path and a manual portal fallback.

## Quick start — hand this to your own Claude Code / agent session

> Read `docs/fabric-capacity-access-setup.md` in this repo and do the following for me: create a
> new native Entra ID user in my tenant for my teammate (ask me for their name and desired
> username first), then grant that user the Contributor role on the workspace we're using for the
> Fabric WWI Replenishment App (ask me for the workspace name/ID if you can't find it via `az
> rest`). Use `az login` under my existing session — don't attempt anything requiring credentials
> you don't have. Tell me the username and temporary password to send my teammate once it's done,
> and stop if anything needs my interactive approval (e.g. an MFA prompt or an admin consent
> screen).

If your agent doesn't have Azure CLI / Fabric REST access configured, or hits a permissions wall,
fall back to the manual steps below — they take about the same amount of time either way.

## Why a native account, not a guest invite or shared login

Three options exist for giving a teammate access to a Fabric workspace you own. Two look easier
than they are:

- **Shared login (you both use your credentials): don't.** If MFA is on your account (it almost
  certainly is), your teammate can't sign in without you approving every single session — not a
  one-time cost, a recurring one. It also collides your two sessions (signing in as you from their
  laptop can boot your own active session), and it silently breaks any per-user audit trail
  (`ReorderAction.createdBy`, etc. — see `SPEC.md`) since everything looks like it came from one
  person.
- **B2B guest invite of a personal (non-work/school) Microsoft account: risky for this project.**
  Microsoft's own docs on B2B guest access call out that "guest users using social identities
  experience more limitations because of sign-in restrictions... they can't sign in where a work
  or school account is required" — and several creator-tier experiences (not just viewing) are
  flagged as needing a work-or-school account. Since this project needs semantic-model *authoring*
  and *deployment*, not just viewing, this is real risk, not a hypothetical.
- **Create a native member account in your own tenant: the actual simple answer.** A proper Entra
  ID account (`teammate@yourtenant.onmicrosoft.com`), separate from your own login, with full
  Contributor rights on the workspace. No guest restrictions (it's not a guest), no MFA/session
  collision (separate identity), no entanglement with any employer's credentials (brand new
  identity, created just for this).

## Manual steps (portal)

**1. Create the user** — [Microsoft Entra admin center](https://entra.microsoft.com) → **Users** →
**New user** → **Create new user** (not "Invite external user" — that's the guest path). Set a
username like `teammate@<your-tenant>.onmicrosoft.com` and a temporary password. Send the
username + password to your teammate through any reasonably secure channel.

**2. Confirm the workspace is on your trial capacity** — open the workspace in the
[Fabric portal](https://app.fabric.microsoft.com) → **Workspace settings** → **License info** (or
similar) → confirm it's assigned to your Fabric Trial capacity, and check the tier is **F64**, not
the smaller F4 — F64 is what lets a Fabric-free-licensed user (no separate paid Power BI license)
both view and create content in the workspace.

**3. Grant workspace access** — on the workspace page, **Manage access** (sometimes under the
**...** menu) → **Add people or groups** → enter the new account's email → role **Contributor** →
**Add**.

Your teammate then signs in once at `myaccount.microsoft.com` with the temp credentials, sets
their own permanent password and MFA, and uses that account for everything from then on
(`az login`, `rayfin login`, the Fabric portal).

## Automatable path (what the agent prompt above does)

Both steps 1 and 3 have real APIs behind them, verified against Microsoft's own docs — not
guessed:

- **Create the user**: `az ad user create --display-name "<Name>" --password "<TempPassword>" --user-principal-name "<user>@<tenant>.onmicrosoft.com" --force-change-password-next-sign-in true`
  — requires you to be signed in (`az login`) as a Global Administrator or User Administrator on
  your tenant, which you almost certainly are if it's your own personal/trial tenant.
- **Grant workspace access**: the Fabric REST API's [Add Workspace Role Assignment](https://learn.microsoft.com/rest/api/fabric/core/workspaces/add-workspace-role-assignment)
  endpoint (`POST https://api.fabric.microsoft.com/v1/workspaces/{workspaceId}/roleAssignments`),
  callable via `az rest` the same way the `semantic-model-authoring` skill already does for other
  Fabric operations.

Step 2 (confirming/assigning the trial capacity to the workspace) is more likely to be a portal-UI
step — worth having the agent check first rather than assuming, since not everything in Fabric
capacity assignment has full API coverage.
