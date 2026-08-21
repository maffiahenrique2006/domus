import { pgTable, text, serial, timestamp, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const demandsTable = pgTable("demands", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  status: text("status", { enum: ["pending", "in_progress", "review", "done"] }).notNull().default("pending"),
  priority: text("priority", { enum: ["low", "medium", "high", "urgent"] }).notNull().default("medium"),
  area: text("area", {
    enum: ["comercial", "financeiro", "operacoes", "marketing", "juridico", "estrutura", "sistema", "empresa"],
  }).notNull().default("empresa"),
  dueDate: date("due_date", { mode: "string" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertDemandSchema = createInsertSchema(demandsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDemand = z.infer<typeof insertDemandSchema>;
export type Demand = typeof demandsTable.$inferSelect;
