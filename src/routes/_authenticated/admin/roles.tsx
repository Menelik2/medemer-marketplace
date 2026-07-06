import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  ArrowLeft, Crown, Shield, Plus, X, Trash2, Search as SearchIcon,
  Loader2, Check, AlertCircle, LogHistory, User, Mail, Calendar,
} from "lucide-react";
import {
  listAllAdmins,
  grantAdminRole,
  revokeAdminRole,
  searchUsersForAdminGrant,
  getAdminAuditLog,
} from "@/lib/admin-roles.functions";

export const Route = createFileRoute("/_authenticated/admin/roles")({
  component: AdminRolesPage,
});

function AdminRolesPage() {
  const [view, setView] = useState<"list" | "grant" | "audit">("list");

  return (
    <div className="min-h-screen bg-soft-clay pb-16">
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-md border-b border-border">
        <div className="mx-auto max-w-4xl px-4 py-3 flex items-center gap-3">
          <Link to="/admin" className="size-9 grid place-items-center rounded-full hover:bg-muted">
            <ArrowLeft className="size-4" />
          </Link>
          <Crown className="size-5 text-heritage-gold" />
          <h1 className="font-display text-lg">Admin Role Management</h1>
        </div>
        <nav className="mx-auto max-w-4xl px-4 pb-2 flex gap-1 overflow-x-auto no-scrollbar">
          {(
            [
              ["list", "Admins", Shield],
              ["grant", "Grant Role", Plus],
              ["audit", "Audit Log", LogHistory],
            ] as [typeof view, string, any][]
          ).map(([id, label, Icon]) => (
            <button
              key={id}
              onClick={() => setView(id)}
              className={`shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full inline-flex items-center gap-1.5 transition-colors ${
                view === id
                  ? "bg-ethio-charcoal text-soft-clay"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <Icon className="size-3.5" /> {label}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-4xl px-4 pt-4">
        {view === "list" && <AdminListPanel />}
        {view === "grant" && <GrantAdminPanel />}
        {view === "audit" && <AuditLogPanel />}
      </main>
    </div>
  );
}

/* -------- Admin List Panel -------- */

function AdminListPanel() {
  const fetch = useServerFn(listAllAdmins);
  const revokeRole = useServerFn(revokeAdminRole);
  const qc = useQueryClient();

  const { data = [], isLoading } = useQuery({
    queryKey: ["admin-list"],
    queryFn: () => fetch(),
  });

  const revokeMut = useMutation({
    mutationFn: (userId: string) => {
      const reason = prompt("Reason for revoking admin role (optional):");
      return revokeRole({ data: { userId, reason: reason || undefined } });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-list"] });
      qc.invalidateQueries({ queryKey: ["admin-audit-log"] });
    },
    onError: (e) => alert((e as Error).message),
  });

  if (isLoading) {
    return (
      <div className="py-10 grid place-items-center">
        <Loader2 className="size-5 animate-spin text-heritage-gold" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex gap-3">
        <AlertCircle className="size-5 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-blue-900">Security Note</p>
          <p className="text-xs text-blue-800 mt-1">
            Admin roles should only be granted to trusted team members. Each role change is logged
            and auditable.
          </p>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="text-center py-14">
          <Crown className="size-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No admins yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {data.map((admin: any) => (
            <div
              key={admin.id}
              className="bg-card border border-border rounded-2xl p-4 flex items-center gap-4"
            >
              {admin.avatarUrl ? (
                <img
                  src={admin.avatarUrl}
                  alt=""
                  className="size-12 rounded-full object-cover border border-border"
                />
              ) : (
                <div className="size-12 rounded-full bg-muted grid place-items-center">
                  <User className="size-5 text-muted-foreground" />
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-sm truncate">
                    {admin.fullName || "Unknown"}
                  </p>
                  <Shield className="size-3.5 text-heritage-gold shrink-0" />
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Mail className="size-3.5 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground truncate">{admin.email}</p>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Calendar className="size-3.5 text-muted-foreground" />
                  <p className="text-[10px] text-muted-foreground">
                    Granted {new Date(admin.grantedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <button
                onClick={() => revokeMut.mutate(admin.id)}
                disabled={revokeMut.isPending}
                className="size-9 grid place-items-center rounded-full hover:bg-heritage-red/10 text-heritage-red disabled:opacity-60"
                title="Revoke admin role"
                aria-label="Revoke admin role"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* -------- Grant Admin Panel -------- */

function GrantAdminPanel() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [grantReason, setGrantReason] = useState("");

  const search = useServerFn(searchUsersForAdminGrant);
  const grantRole = useServerFn(grantAdminRole);
  const qc = useQueryClient();

  const { data: results = [], isLoading: isSearching } = useQuery({
    queryKey: ["search-users", searchQuery],
    queryFn: () => search({ data: { query: searchQuery } }),
    enabled: searchQuery.length > 0,
  });

  const grantMut = useMutation({
    mutationFn: () =>
      grantRole({ data: { userId: selectedUser.id, reason: grantReason || undefined } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-list"] });
      qc.invalidateQueries({ queryKey: ["search-users"] });
      qc.invalidateQueries({ queryKey: ["admin-audit-log"] });
      setSelectedUser(null);
      setGrantReason("");
      setSearchQuery("");
      alert("Admin role granted successfully");
    },
    onError: (e) => alert((e as Error).message),
  });

  return (
    <div className="space-y-4">
      <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex gap-3">
        <AlertCircle className="size-5 text-green-600 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-green-900">Careful Action</p>
          <p className="text-xs text-green-800 mt-1">
            Granting admin role gives full access to sensitive operations. Ensure the user is
            trusted and aware of their responsibilities.
          </p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-4">
        <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
          <SearchIcon className="size-3.5 inline mr-1" /> Search user by email or name
        </label>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search users…"
          className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {searchQuery && isSearching && (
        <div className="py-8 grid place-items-center">
          <Loader2 className="size-5 animate-spin text-heritage-gold" />
        </div>
      )}

      {searchQuery && !isSearching && results.length === 0 && (
        <div className="text-center py-8">
          <p className="text-sm text-muted-foreground">No users found</p>
        </div>
      )}

      {!selectedUser && results.length > 0 && (
        <div className="space-y-2">
          {results.map((user: any) => (
            <button
              key={user.id}
              onClick={() => setSelectedUser(user)}
              disabled={user.isAdmin}
              className={`w-full text-left bg-card border rounded-2xl p-4 flex items-center gap-3 transition-colors ${
                user.isAdmin
                  ? "opacity-50 cursor-not-allowed border-border"
                  : "border-border hover:border-heritage-gold/50 hover:ring-1 hover:ring-heritage-gold/20"
              }`}
            >
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt=""
                  className="size-10 rounded-full object-cover border border-border"
                />
              ) : (
                <div className="size-10 rounded-full bg-muted grid place-items-center">
                  <User className="size-4 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{user.fullName || user.email}</p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </div>
              {user.isAdmin && (
                <Shield className="size-4 text-heritage-gold shrink-0" />
              )}
            </button>
          ))}
        </div>
      )}

      {selectedUser && (
        <div className="bg-card border border-border rounded-2xl p-4 space-y-4">
          <div>
            <p className="text-sm font-semibold mb-2">Confirm grant admin role to:</p>
            <div className="flex items-center gap-3 mb-4">
              {selectedUser.avatarUrl ? (
                <img
                  src={selectedUser.avatarUrl}
                  alt=""
                  className="size-10 rounded-full object-cover border border-border"
                />
              ) : (
                <div className="size-10 rounded-full bg-muted grid place-items-center">
                  <User className="size-4 text-muted-foreground" />
                </div>
              )}
              <div>
                <p className="text-sm font-semibold">{selectedUser.fullName || selectedUser.email}</p>
                <p className="text-xs text-muted-foreground">{selectedUser.email}</p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
              Reason (optional)
            </label>
            <textarea
              value={grantReason}
              onChange={(e) => setGrantReason(e.target.value)}
              placeholder="Why is this user being granted admin access?"
              maxLength={200}
              className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none h-20"
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              {grantReason.length}/200 characters
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => {
                setSelectedUser(null);
                setGrantReason("");
              }}
              className="flex-1 text-xs font-bold py-2.5 rounded-full border border-border hover:bg-muted"
            >
              Cancel
            </button>
            <button
              onClick={() => grantMut.mutate()}
              disabled={grantMut.isPending}
              className="flex-1 text-xs font-bold py-2.5 rounded-full bg-heritage-green text-soft-clay inline-flex items-center justify-center gap-1.5 disabled:opacity-60"
            >
              {grantMut.isPending ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" /> Granting…
                </>
              ) : (
                <>
                  <Check className="size-3.5" /> Grant admin role
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* -------- Audit Log Panel -------- */

function AuditLogPanel() {
  const fetch = useServerFn(getAdminAuditLog);
  const { data, isLoading } = useQuery({
    queryKey: ["admin-audit-log"],
    queryFn: () => fetch({ data: { limit: 100 } }),
  });

  if (isLoading) {
    return (
      <div className="py-10 grid place-items-center">
        <Loader2 className="size-5 animate-spin text-heritage-gold" />
      </div>
    );
  }

  if (!data?.available) {
    return (
      <div className="text-center py-14">
        <LogHistory className="size-8 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">Audit log not yet available</p>
        <p className="text-xs text-muted-foreground mt-1">
          Create the admin_audit_log table to enable audit tracking
        </p>
      </div>
    );
  }

  if (data.logs.length === 0) {
    return (
      <div className="text-center py-14">
        <LogHistory className="size-8 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">No audit events yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {data.logs.map((log: any) => (
        <div key={log.id} className="bg-card border border-border rounded-2xl p-4">
          <div className="flex items-start justify-between mb-2">
            <div>
              <p className="text-sm font-semibold capitalize">
                {log.action === "grant_admin" ? "✓ Role Granted" : "✗ Role Revoked"}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {new Date(log.created_at).toLocaleString()}
              </p>
            </div>
            <span
              className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${
                log.action === "grant_admin"
                  ? "bg-heritage-green/20 text-heritage-green"
                  : "bg-heritage-red/20 text-heritage-red"
              }`}
            >
              {log.action === "grant_admin" ? "Granted" : "Revoked"}
            </span>
          </div>

          <div className="text-xs space-y-1 mt-3">
            <p className="text-muted-foreground">
              Admin:{" "}
              <span className="font-semibold text-foreground">
                {log.admins?.email || "Unknown"}
              </span>
            </p>
            <p className="text-muted-foreground">
              User:{" "}
              <span className="font-semibold text-foreground">
                {log.targets?.email || "Unknown"}
              </span>
            </p>
            {log.details?.reason && (
              <p className="text-muted-foreground">
                Reason: <span className="font-semibold text-foreground">{log.details.reason}</span>
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
