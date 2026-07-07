import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Verify the caller has the 'admin' role. Throws otherwise. */
async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data: isAdmin } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "admin",
  });
  if (!isAdmin) throw new Error("Forbidden: admin role required");
}

/** Verify user exists and get their profile info */
async function getUserProfile(sb: any, userId: string) {
  const { data, error } = await sb
    .from("profiles")
    .select("id, email, full_name, avatar_url")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("User profile not found");
  return data;
}

/** Get the list of all admins with their details */
export const listAllAdmins = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const sb = context.supabase;

    const { data: adminRoles, error } = await sb
      .from("user_roles")
      .select("user_id, created_at")
      .eq("role", "admin")
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);

    // Fetch profile info for each admin
    const admins = await Promise.all(
      (adminRoles ?? []).map(async (role: any) => {
        const profile = await getUserProfile(sb, role.user_id);
        return {
          id: role.user_id,
          email: profile.email,
          fullName: profile.full_name,
          avatarUrl: profile.avatar_url,
          grantedAt: role.created_at,
        };
      })
    );

    return admins;
  });

/** Grant admin role to a user (server-side validation) */
export const grantAdminRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        userId: z.string().uuid("Invalid user ID format"),
        reason: z
          .string()
          .max(200, "Reason must be 200 characters or less")
          .optional(),
      })
      .parse(d)
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);

    const sb = context.supabase;
    const { userId, reason } = data;

    // Validate target user exists
    const targetProfile = await getUserProfile(sb, userId);

    // Prevent granting to self (best practice)
    if (userId === context.userId) {
      throw new Error("Cannot grant admin role to yourself via this action");
    }

    // Check if user already has admin role
    const { data: existingRole } = await sb
      .from("user_roles")
      .select("id")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    if (existingRole) {
      throw new Error("User already has admin role");
    }

    // Grant the role
    const { error: insertError } = await sb
      .from("user_roles")
      .insert({
        user_id: userId,
        role: "admin",
      });

    if (insertError) throw new Error(insertError.message);

    // Log the action in audit trail (if audit table exists)
    try {
      await (sb as any).from("admin_audit_log").insert({
        admin_id: context.userId,
        action: "grant_admin",
        target_user_id: userId,
        details: { reason },
        created_at: new Date().toISOString(),
      });
    } catch {
      // Audit table may not exist yet - don't fail the grant
      console.warn("Could not log audit trail");
    }

    return {
      success: true,
      message: `Admin role granted to ${targetProfile.email}`,
      user: targetProfile,
    };
  });

/** Revoke admin role from a user (server-side validation) */
export const revokeAdminRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        userId: z.string().uuid("Invalid user ID format"),
        reason: z
          .string()
          .max(200, "Reason must be 200 characters or less")
          .optional(),
      })
      .parse(d)
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);

    const sb = context.supabase;
    const { userId, reason } = data;

    // Prevent revoking from self
    if (userId === context.userId) {
      throw new Error("Cannot revoke your own admin role via this action");
    }

    // Verify target user exists
    const targetProfile = await getUserProfile(sb, userId);

    // Check if user has admin role
    const { data: roleRecord } = await sb
      .from("user_roles")
      .select("id")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleRecord) {
      throw new Error("User does not have admin role");
    }

    // Revoke the role
    const { error: deleteError } = await sb
      .from("user_roles")
      .delete()
      .eq("user_id", userId)
      .eq("role", "admin");

    if (deleteError) throw new Error(deleteError.message);

    // Log the action in audit trail
    try {
      await (sb as any).from("admin_audit_log").insert({
        admin_id: context.userId,
        action: "revoke_admin",
        target_user_id: userId,
        details: { reason },
        created_at: new Date().toISOString(),
      });
    } catch {
      console.warn("Could not log audit trail");
    }

    return {
      success: true,
      message: `Admin role revoked from ${targetProfile.email}`,
      user: targetProfile,
    };
  });

/** Search for users to grant/revoke admin role (admin only) */
export const searchUsersForAdminGrant = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ query: z.string().min(1).max(100) }).parse(d)
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);

    const sb = context.supabase;
    const { query } = data;

    // Search by email or full name
    const { data: profiles, error } = await sb
      .from("profiles")
      .select("id, email, full_name, avatar_url")
      .or(`email.ilike.%${query}%,full_name.ilike.%${query}%`)
      .limit(10);

    if (error) throw new Error(error.message);

    // Get their current roles
    const results = await Promise.all(
      (profiles ?? []).map(async (profile: any) => {
        const { data: roles } = await sb
          .from("user_roles")
          .select("role")
          .eq("user_id", profile.id);

        return {
          id: profile.id,
          email: profile.email,
          fullName: profile.full_name,
          avatarUrl: profile.avatar_url,
          roles: (roles ?? []).map((r: any) => r.role),
          isAdmin: (roles ?? []).some((r: any) => r.role === "admin"),
        };
      })
    );

    return results;
  });

/** Get audit log of admin role changes */
export const getAdminAuditLog = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ limit: z.number().int().min(1).max(100).optional() }).parse(d)
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);

    const sb = context.supabase;
    const { limit = 50 } = data;

    // Attempt to fetch audit log; table may not exist
    try {
      const { data: logs, error } = await sb
        .from("admin_audit_log")
        .select(
          `
          id,
          admin_id,
          action,
          target_user_id,
          details,
          created_at,
          admins:admin_id (email, full_name),
          targets:target_user_id (email, full_name)
        `
        )
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) {
        // Audit table doesn't exist yet
        return { logs: [], available: false };
      }

      return {
        logs: logs ?? [],
        available: true,
      };
    } catch {
      return { logs: [], available: false };
    }
  });
