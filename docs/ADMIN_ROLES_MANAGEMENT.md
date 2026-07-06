# Admin Role Management System

## Overview

The admin role management system provides a secure, auditable way to manage administrator access in the ADDIX marketplace. It includes:

- **List all admins** with their details and grant dates
- **Grant admin roles** to trusted team members with server-side validation
- **Revoke admin roles** with audit logging and optional reasons
- **Search users** by email or name for quick access
- **Audit log** tracking all role changes for compliance

## Architecture

### Server-Side Functions (`src/lib/admin-roles.functions.ts`)

All admin role operations are handled via server functions with full validation:

#### `listAllAdmins()`
- **Access**: Admin only
- **Returns**: List of all admins with email, name, avatar, and grant date
- **Security**: Requires `assertAdmin()` check

#### `grantAdminRole(userId, reason?)`
- **Access**: Admin only
- **Validation**:
  - User must exist in profiles table
  - Cannot grant to self (prevents accidental self-revocation)
  - User must not already have admin role
  - Input validation with Zod schema
- **Audit**: Logs action with optional reason
- **Returns**: Success message with user profile

#### `revokeAdminRole(userId, reason?)`
- **Access**: Admin only
- **Validation**:
  - Cannot revoke from self (safety guard)
  - User must exist and have admin role
  - Input validation with Zod schema
- **Audit**: Logs action with optional reason
- **Returns**: Success message with user profile

#### `searchUsersForAdminGrant(query)`
- **Access**: Admin only
- **Search**: By email or full name (case-insensitive)
- **Returns**: User profiles with current roles
- **Limit**: 10 results per search

#### `getAdminAuditLog(limit?)`
- **Access**: Admin only
- **Returns**: Audit log of role changes (up to 100)
- **Graceful**: Returns `{ available: false }` if audit table doesn't exist

### UI Component (`src/routes/_authenticated/admin/roles.tsx`)

Three-tab interface for admin role management:

#### Tab 1: Admin List
- Displays all current admins with avatars
- Shows email and grant date
- One-click revoke with optional reason prompt
- Security warnings about admin role risks
- Empty state guidance

#### Tab 2: Grant Role
- Search users by email or name
- Preview of target user before granting
- Optional reason field (max 200 chars)
- Prevents granting to users who already have admin role
- Confirmation step before granting

#### Tab 3: Audit Log
- Full history of role changes
- Shows admin who made change and target user
- Displays action (grant/revoke) with visual indicator
- Shows optional reason for each change
- Graceful fallback if audit table not created

## Database Requirements

### Tables

#### `user_roles`
```sql
-- Existing table, no changes needed
id BIGINT PRIMARY KEY
user_id TEXT REFERENCES profiles(id)
role TEXT
created_at TIMESTAMP
```

#### `admin_audit_log` (Optional but recommended)
```sql
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  admin_id TEXT NOT NULL REFERENCES profiles(id),
  action TEXT NOT NULL,  -- 'grant_admin' or 'revoke_admin'
  target_user_id TEXT NOT NULL REFERENCES profiles(id),
  details JSONB,  -- Optional metadata like reason
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_admin_audit_log_created_at ON admin_audit_log(created_at DESC);
```

### RLS Policies

No special RLS policies needed - all operations are server-side with `assertAdmin()` checks.

## Security Features

### Server-Side Validation
1. **Middleware**: All functions use `requireSupabaseAuth` middleware
2. **Admin Check**: Every operation calls `assertAdmin()` to verify admin role
3. **Input Validation**: Zod schemas validate all inputs
4. **User Existence**: Verifies target user exists before changes

### Safeguards
- **Self-revocation Prevention**: Cannot revoke your own admin role
- **Self-grant Prevention**: Cannot grant admin role to yourself via grant endpoint
- **Audit Trail**: All changes logged (if audit table exists)
- **Graceful Degradation**: System works without audit table

### Access Control
- Admin list: Admin only
- Grant/revoke: Admin only
- Search users: Admin only
- Audit log: Admin only

## Usage

### For Admins

1. **Navigate to Role Management**
   - Click the lock icon (🔒) in the admin dashboard header
   - Or go to `/admin/roles`

2. **View Current Admins**
   - Tab: "Admins"
   - Lists all current administrators
   - Click trash icon to revoke access

3. **Grant New Admin**
   - Tab: "Grant Role"
   - Search for user by email or name
   - Click user card to select
   - Optionally enter reason (e.g., "Added to operations team")
   - Click "Grant admin role"

4. **Review History**
   - Tab: "Audit Log"
   - See all role changes with timestamps
   - View who made changes and reasons

### Bootstrap: First Admin

When no admins exist:

1. Visit `/admin` as any authenticated user
2. See "Claim admin role" button
3. Click to claim first admin role
4. Can now grant/revoke other admins

## Testing

### Manual Testing Checklist

- [ ] First user can claim admin role
- [ ] Non-admin cannot access role management page
- [ ] Admin can see list of all admins
- [ ] Admin can search users by email
- [ ] Admin can search users by name
- [ ] Admin can grant admin role to user
- [ ] Granting to already-admin user shows error
- [ ] Admin cannot grant to self
- [ ] Admin cannot revoke from self
- [ ] Revoking shows confirmation prompt
- [ ] Audit log shows new entries after role changes
- [ ] Reasons are displayed in audit log

### Error Handling

```typescript
// Invalid user ID
"Forbidden: admin role required"

// User already admin
"User already has admin role"

// User not found
"User profile not found"

// Self operations
"Cannot revoke your own admin role via this action"
"Cannot grant admin role to yourself via this action"
```

## Performance Considerations

### Query Optimization
- `listAllAdmins()`: Single query to `user_roles`, then parallel profile fetches
- `searchUsersForAdminGrant()`: Uses `ilike` with 10-result limit
- `getAdminAuditLog()`: Orders by `created_at DESC` with index

### Caching
React Query caches:
- `["admin-list"]` - invalidated after grant/revoke
- `["admin-audit-log"]` - invalidated after grant/revoke
- `["search-users"]` - keyed by search query

## Future Enhancements

1. **Role Types**: Support multiple role types (moderator, analyst, etc.)
2. **Permissions**: Fine-grained permissions per role
3. **Audit Retention**: Auto-archive old audit logs
4. **Notifications**: Notify users when granted admin role
5. **Activity Monitor**: Dashboard showing recent admin actions
6. **Bulk Operations**: Grant/revoke multiple admins at once
7. **2FA Requirement**: Require 2FA for admin operations
8. **Approval Workflow**: Multiple admins approve new admins

## Troubleshooting

### "Admin already assigned" Error

**Problem**: First user tries to claim admin role but admins already exist
**Solution**: Ask existing admin to grant you role via Grant Role tab

### Audit Log Not Showing

**Problem**: Audit log tab shows "not available"
**Solution**: Create `admin_audit_log` table (see Database Requirements)

### Cannot Revoke Self

**Problem**: Can't remove own admin role
**Reason**: Safety feature to prevent accidental lockout
**Solution**: Have another admin revoke your role, or contact support

### Search Not Finding User

**Problem**: User search returns no results
**Solution**: 
- Verify user has completed sign-up
- Search by exact email if name search fails
- Check user exists in profiles table

## API Reference

### `listAllAdmins()`
```typescript
async function listAllAdmins(): Promise<Array<{
  id: string;          // user ID (UUID)
  email: string;
  fullName: string;
  avatarUrl: string | null;
  grantedAt: string;   // ISO timestamp
}>>
```

### `grantAdminRole(userId, reason?)`
```typescript
async function grantAdminRole(
  userId: string,
  reason?: string
): Promise<{
  success: true;
  message: string;
  user: { id: string; email: string; full_name: string; avatar_url: string | null }
}>
```

### `revokeAdminRole(userId, reason?)`
```typescript
async function revokeAdminRole(
  userId: string,
  reason?: string
): Promise<{
  success: true;
  message: string;
  user: { id: string; email: string; full_name: string; avatar_url: string | null }
}>
```

### `searchUsersForAdminGrant(query)`
```typescript
async function searchUsersForAdminGrant(
  query: string  // min 1 char, max 100
): Promise<Array<{
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  roles: string[];
  isAdmin: boolean;
}>>
```

### `getAdminAuditLog(limit?)`
```typescript
async function getAdminAuditLog(
  limit?: number  // 1-100, default 50
): Promise<{
  logs: Array<{
    id: string;
    admin_id: string;
    action: 'grant_admin' | 'revoke_admin';
    target_user_id: string;
    details: { reason?: string };
    created_at: string;
    admins: { email: string; full_name: string };
    targets: { email: string; full_name: string };
  }>;
  available: boolean;  // false if audit table doesn't exist
}>
```

## Support

For issues or questions about admin role management:

1. Check the troubleshooting section above
2. Review server function error messages
3. Check browser console for client-side errors
4. Verify database tables exist
5. Ensure user has admin role via `assertAdmin()` check
