# Module 1: Authentication

**Phase:** 1 | **Priority:** Critical — nothing works without this

---

## Features

| Feature | Description |
|---------|-------------|
| Google OAuth 2.0 | Primary login method |
| Secure Sessions | HTTP-only cookies, not localStorage |
| Refresh Token Rotation | New refresh token issued on every use |
| Token Encryption | Tokens encrypted at rest in database |
| Login Audit Logs | Every login recorded with IP, device, timestamp |
| Device Tracking | Track devices used per user |
| Session Monitoring | Active sessions visible to user |

---

## Security Requirements

| Requirement | Implementation |
|------------|---------------|
| HTTP-only Cookies | Access token in HTTP-only cookie (no JS access) |
| JWT | Short-lived access token (15 min) |
| CSRF Protection | CSRF token on all POST/PUT/DELETE requests |
| Rate Limiting | 10 login attempts/minute per IP |
| Session Expiry | 30-day refresh token, auto-invalidated on logout |

---

## OAuth Flow

```
1. User clicks "Sign in with Google"
2. Redirect to Google OAuth consent screen
3. Google redirects back with auth code
4. Backend exchanges code for access + refresh tokens
5. Backend fetches user profile (email, name, picture)
6. Upsert user record in database
7. Create session (JWT access token + refresh token)
8. Set HTTP-only cookie
9. Redirect to dashboard
```

---

## API Scopes Required

| Scope | Purpose |
|-------|---------|
| `openid` | Basic identity |
| `email` | User email |
| `profile` | User name and picture |
| `https://www.googleapis.com/auth/analytics.readonly` | GA4 data read |
| `https://www.googleapis.com/auth/webmasters.readonly` | GSC data read |

---

## Database Tables

### `users`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | Primary key |
| email | VARCHAR | Unique |
| name | VARCHAR | |
| picture | VARCHAR | Google profile picture URL |
| google_id | VARCHAR | Unique Google user ID |
| refresh_token | TEXT | Encrypted |
| google_refresh_token | TEXT | Encrypted — for GA4/GSC API calls |
| created_at | TIMESTAMP | |
| last_login_at | TIMESTAMP | |
| is_active | BOOLEAN | |

### `audit_logs` (auth events)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | |
| user_id | UUID | FK to users |
| action | VARCHAR | login, logout, token_refresh |
| ip_address | INET | |
| user_agent | TEXT | |
| created_at | TIMESTAMP | |

---

## Open Questions / Gaps

- [ ] Is Google OAuth the only login method or will email/password be added?
- [ ] What happens when a user's Google account is deactivated?
- [ ] Can a user belong to multiple agencies/clients?
- [ ] Is there an admin superuser role that can impersonate clients?
- [ ] Are sessions invalidated on password change (since there's no password — on Google account revocation)?
- [ ] RBAC: What roles exist? (Admin, Agency Manager, Client Viewer?) — Not defined in blueprint
