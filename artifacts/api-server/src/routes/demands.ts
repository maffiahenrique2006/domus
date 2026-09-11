import { Router, type IRouter } from "express";
import { desc, eq, sql } from "drizzle-orm";
import { db, demandsTable } from "@workspace/db";
import { dateToDateString } from "../lib/dates";
import {
  CreateDemandBody,
  UpdateDemandBody,
  UpdateDemandParams,
  DeleteDemandParams,
  GetDemandParams,
  GetDemandsResponse,
  CreateDemandResponse,
  GetDemandResponse,
  UpdateDemandResponse,
  DeleteDemandResponse,
  GetDemandsSummaryResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/demands", async (_req, res): Promise<void> => {
  const demands = await db
    .select()
    .from(demandsTable)
    .orderBy(desc(demandsTable.createdAt));

  res.json(GetDemandsResponse.parse(demands));
});

router.get("/demands/summary", async (_req, res): Promise<void> => {
  const all = await db.select().from(demandsTable);

  const summary = {
    total: all.length,
    pending: all.filter((d) => d.status === "pending").length,
    in_progress: all.filter((d) => d.status === "in_progress").length,
    review: all.filter((d) => d.status === "review").length,
    done: all.filter((d) => d.status === "done").length,
    urgent: all.filter((d) => d.priority === "urgent").length,
  };

  res.json(GetDemandsSummaryResponse.parse(summary));
});

router.post("/demands", async (req, res): Promise<void> => {
  const parsed = CreateDemandBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [demand] = await db
    .insert(demandsTable)
    .values({ ...parsed.data, dueDate: dateToDateString(parsed.data.dueDate) })
    .returning();
  res.status(201).json(CreateDemandResponse.parse(demand));
});

router.get("/demands/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetDemandParams.safeParse({ id: Number(raw) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [demand] = await db
    .select()
    .from(demandsTable)
    .where(eq(demandsTable.id, params.data.id));

  if (!demand) {
    res.status(404).json({ error: "Demand not found" });
    return;
  }

  res.json(GetDemandResponse.parse(demand));
});

router.patch("/demands/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = UpdateDemandParams.safeParse({ id: Number(raw) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateDemandBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [demand] = await db
    .update(demandsTable)
    .set({ ...parsed.data, dueDate: dateToDateString(parsed.data.dueDate), updatedAt: new Date() })
    .where(eq(demandsTable.id, params.data.id))
    .returning();

  if (!demand) {
    res.status(404).json({ error: "Demand not found" });
    return;
  }

  res.json(UpdateDemandResponse.parse(demand));
});

router.delete("/demands/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteDemandParams.safeParse({ id: Number(raw) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  await db.delete(demandsTable).where(eq(demandsTable.id, params.data.id));
  res.json(DeleteDemandResponse.parse({ success: true }));
});

export default router;
