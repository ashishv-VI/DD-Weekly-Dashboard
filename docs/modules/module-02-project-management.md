# Module 2: Project Management

**Phase:** 1 | **Priority:** Critical — all data is scoped to projects

---

## Features

| Feature | Description |
|---------|-------------|
| Multi-Client Support | One platform serves multiple agency clients |
| Multi-Property Support | Each client can have multiple domains/properties |
| Domain Selector | UI dropdown to switch between domains |
| Property Selector | Links GA4 and GSC properties to a project |

---

## Hierarchy

```
Agency
└── Client A
    ├── Domain A (GA4 Property + GSC Site)
    └── Domain B (GA4 Property + GSC Site)
└── Client B
    └── Domain C (GA4 Property + GSC Site)
```

---

## Database Tables

### `agencies`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | |
| name | VARCHAR | Agency name |
| owner_user_id | UUID | FK to users |
| created_at | TIMESTAMP | |

### `clients`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | |
| agency_id | UUID | FK to agencies |
| name | VARCHAR | Client company name |
| created_at | TIMESTAMP | |

### `projects`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | |
| client_id | UUID | FK to clients |
| name | VARCHAR | Project/domain name |
| domain | VARCHAR | e.g. "example.com" |
| created_at | TIMESTAMP | |

### `properties`
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | |
| project_id | UUID | FK to projects |
| ga4_property_id | VARCHAR | GA4 property ID |
| gsc_site_url | VARCHAR | GSC site URL |
| type | ENUM | ga4, gsc, both |
| created_at | TIMESTAMP | |

---

## UI Components Needed

| Component | Description |
|-----------|-------------|
| Client selector dropdown | Top-level navigation switcher |
| Domain/project selector | Sub-navigation after client is selected |
| Project settings page | Manage GA4 + GSC property links |
| Add new project wizard | Step-by-step to connect GA4 + GSC |
| Client management page | Admin: add/remove clients |

---

## Add New Project Flow

```
1. User clicks "Add Project"
2. Enter project name + domain
3. System fetches all accessible GA4 properties from Google
4. User selects matching GA4 property
5. System fetches all accessible GSC properties from Google
6. User selects matching GSC site
7. Project is saved and initial sync is triggered
```

---

## Open Questions / Gaps

- [ ] Can the same GA4 property be linked to multiple projects? (Edge case)
- [ ] Who can add new clients — only agency admins?
- [ ] Is there a limit on number of clients or properties per plan?
- [ ] If a user revokes Google access, what happens to linked properties?
- [ ] **RBAC not defined** — Who can see which clients/projects?
- [ ] Is there a "Transfer project" feature if ownership changes?
- [ ] White-label: Can the agency brand the platform for clients?
