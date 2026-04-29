import {
  boolean,
  date,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

export const projects = pgTable("projects", {
  id: uuid("id").defaultRandom().primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  clientName: text("client_name").notNull().default(""),
  businessName: text("business_name").notNull().default(""),
  startDate: date("start_date"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const projectBrief = pgTable(
  "project_brief",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    needsBrand: boolean("needs_brand"),
    pageCount: integer("page_count"),
    features: text("features").notNull().default(""),
    timeline: text("timeline").notNull().default(""),
    budget: text("budget").notNull().default(""),
    hasRetainer: boolean("has_retainer"),
    retainerAmount: text("retainer_amount").notNull().default(""),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("project_brief_project_id_idx").on(t.projectId)],
);

export const brandValues = pgTable(
  "brand_values",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    primaryColor: text("primary_color").notNull().default("#5B8CFF"),
    secondaryColor: text("secondary_color").notNull().default("#A78BFA"),
    accentColor: text("accent_color").notNull().default("#34D399"),
    bgColor: text("bg_color").notNull().default("#0e0e0f"),
    textColor: text("text_color").notNull().default("#F0EFE8"),
    headingFont: text("heading_font").notNull().default(""),
    bodyFont: text("body_font").notNull().default(""),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [uniqueIndex("brand_values_project_id_idx").on(t.projectId)],
);

export const phaseSteps = pgTable(
  "phase_steps",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    phaseNumber: integer("phase_number").notNull(),
    stepIndex: integer("step_index").notNull(),
    completed: boolean("completed").notNull().default(false),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("phase_steps_project_phase_step_idx").on(
      t.projectId,
      t.phaseNumber,
      t.stepIndex,
    ),
  ],
);

export const phaseNotes = pgTable(
  "phase_notes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    phaseNumber: integer("phase_number").notNull(),
    adminNotes: text("admin_notes").notNull().default(""),
    clientNotes: text("client_notes").notNull().default(""),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("phase_notes_project_phase_idx").on(t.projectId, t.phaseNumber),
  ],
);
