import {
  pgTable,
  pgEnum,
  text,
  uuid,
  timestamp,
  integer,
  boolean,
  numeric,
  index,
} from "drizzle-orm/pg-core"

export const leadStatusEnum = pgEnum("lead_status", [
  "new",
  "contacted",
  "qualified",
  "closed",
  "lost",
])


export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  role: text("role").notNull().default("seo_team"),
  googleId: text("google_id").unique(),
  googleAccessToken: text("google_access_token"),
  googleRefreshToken: text("google_refresh_token"),
  createdAt: timestamp("created_at").defaultNow(),
})

export const clients = pgTable("clients", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  domain: text("domain").notNull(),
  slug: text("slug").notNull().unique(),
  username: text("username").notNull().unique(),
  pinHash: text("pin_hash").notNull(),
  leadsEnabled: boolean("leads_enabled").notNull().default(false),
  status: text("status").notNull().default("active"),
  loginAttempts: integer("login_attempts").default(0),
  lockedAt: timestamp("locked_at"),
  ga4PropertyId: text("ga4_property_id"),
  gscSiteUrl: text("gsc_site_url"),
  googleAccessToken: text("google_access_token"),
  googleRefreshToken: text("google_refresh_token"),
  tokenExpiry: timestamp("token_expiry"),
  notes: text("notes"),
  createdBy: uuid("created_by"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
})

export const leads = pgTable(
  "leads",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),

    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    email: text("email").notNull(),
    phone: text("phone"),
    companyName: text("company_name"),
    parkingSpaces: integer("parking_spaces"),

    hasAirportShuttle: boolean("has_airport_shuttle"),

    shuttleServiceWork: text("shuttle_service_work"),

    averageDailyParkingRate: numeric(
      "average_daily_parking_rate",
      {
        precision: 10,
        scale: 2,
      },
    ),

    status: leadStatusEnum("status").notNull().default("new"),

    sourcePage: text("source_page"),
    sourcePageUrl: text("source_page_url"),
    comments: text("comments"),
    adminNotes: text("admin_notes"),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => [
    index("leads_client_id_idx").on(table.clientId),
    index("leads_created_at_idx").on(table.createdAt),
  ],
)

export const loginAttemptLogs = pgTable("login_attempt_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  clientId: uuid("client_id"),
  ipAddress: text("ip_address"),
  success: boolean("success").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
})

export const reports = pgTable("reports", {
  id: uuid("id").defaultRandom().primaryKey(),
  clientId: uuid("client_id").notNull(),
  type: text("type").notNull(),
  periodStart: text("period_start").notNull(),
  periodEnd: text("period_end").notNull(),
  data: text("data"),
  status: text("status").notNull().default("generating"),
  createdAt: timestamp("created_at").defaultNow(),
})

export const notifications = pgTable("notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  type: text("type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  clientId: uuid("client_id"),
  read: boolean("read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
})

export type User = typeof users.$inferSelect
export type Client = typeof clients.$inferSelect
export type Report = typeof reports.$inferSelect
export type Notification = typeof notifications.$inferSelect
export type Lead = typeof leads.$inferSelect
export type NewLead = typeof leads.$inferInsert