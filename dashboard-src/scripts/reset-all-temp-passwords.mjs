import { createClient } from "@supabase/supabase-js";
import { loadLocalEnv } from "../supabase/scripts/import-env.mjs";

const TEMP_PASSWORD = "12345678";
const PAGE_SIZE = 1000;

loadLocalEnv();

const shouldShowHelp = process.argv.includes("--help");
const shouldExecute = process.argv.includes("--execute");

if (shouldShowHelp) {
  console.log(`
Reset every public.profiles user to the temporary password "${TEMP_PASSWORD}".

Usage:
  npm run reset:all-temp-passwords
  npm run reset:all-temp-passwords -- --execute

Environment:
  SUPABASE_URL or VITE_SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY

The command is a dry run unless --execute is provided. Profiles are the source
of truth; Supabase Auth is used only to update the user's login password.
`);
  process.exitCode = 0;
} else {
  await main();
}

async function main() {
  const supabaseUrl =
    String(process.env.SUPABASE_URL ?? "").trim() ||
    String(process.env.VITE_SUPABASE_URL ?? "").trim();
  const serviceRoleKey =
    String(process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").trim() ||
    String(process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ?? "").trim();

  if (!supabaseUrl) {
    throw new Error("Missing SUPABASE_URL or VITE_SUPABASE_URL.");
  }

  if (!serviceRoleKey) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY. Add it to your shell environment, or run this script where that secret is available.",
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const users = await listProfileUsers(supabase);

  console.log(`Found ${users.length} profile users.`);

  if (!shouldExecute) {
    console.log("Dry run only. Re-run with --execute to reset every profile user's password.");
    for (const user of users) {
      console.log(`Would reset: ${user.email ?? user.id}`);
    }
    return;
  }

  let authResetCount = 0;
  let profileOnlyCount = 0;
  const failures = [];

  for (const user of users) {
    try {
      const result = await resetUser(supabase, user);
      if (result.authPasswordReset) {
        authResetCount += 1;
        console.log(`Reset Auth password and profile flag: ${user.email ?? user.id}`);
      } else {
        profileOnlyCount += 1;
        console.log(`Updated profile flag only: ${user.email ?? user.id}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push({ user, message });
      console.error(`Failed: ${user.email ?? user.id}: ${message}`);
    }
  }

  console.log(`Done. Auth passwords reset: ${authResetCount}/${users.length}.`);
  console.log(`Profile-only temp flags updated: ${profileOnlyCount}/${users.length}.`);

  if (failures.length > 0) {
    console.error(`${failures.length} users failed.`);
    process.exitCode = 1;
  }
}

async function listProfileUsers(supabase) {
  const users = [];
  let from = 0;

  while (true) {
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from("profiles")
      .select("id,email")
      .order("email", { ascending: true })
      .range(from, to);

    if (error) {
      throw new Error(`Failed to list profile users: ${error.message}`);
    }

    const batch = data ?? [];
    users.push(...batch);

    if (batch.length < PAGE_SIZE) {
      break;
    }

    from += PAGE_SIZE;
  }

  return users;
}

async function resetUser(supabase, user) {
  const { error: authError } = await supabase.auth.admin.updateUserById(
    user.id,
    {
      password: TEMP_PASSWORD,
    },
  );

  const authUserMissing =
    authError &&
    String(authError.message ?? "").toLowerCase().includes("user not found");

  if (authError && !authUserMissing) {
    throw new Error(authError.message);
  }

  const timestamp = new Date().toISOString();
  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      password_enabled: true,
      requires_password_change: true,
      temporary_password_set_at: timestamp,
      password_changed_at: null,
    })
    .eq("id", user.id);

  if (profileError) {
    throw new Error(profileError.message);
  }

  return {
    authPasswordReset: !authUserMissing,
  };
}
