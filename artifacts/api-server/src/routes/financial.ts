import { Router, type IRouter } from "express";
import { desc, eq } from "drizzle-orm";
import { db, transactionsTable } from "@workspace/db";
import { dateToDateString } from "../lib/dates";
import {
  CreateTransactionBody,
  UpdateTransactionBody,
  UpdateTransactionParams,
  DeleteTransactionParams,
  GetTransactionsResponse,
  CreateTransactionResponse,
  UpdateTransactionResponse,
  DeleteTransactionResponse,
  GetFinancialSummaryResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/financial/transactions", async (_req, res): Promise<void> => {
  const transactions = await db
    .select()
    .from(transactionsTable)
    .orderBy(desc(transactionsTable.date));

  const parsed = transactions.map((t) => ({
    ...t,
    amount: parseFloat(t.amount),
  }));

  res.json(GetTransactionsResponse.parse(parsed));
});

router.post("/financial/transactions", async (req, res): Promise<void> => {
  const parsed = CreateTransactionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [tx] = await db
    .insert(transactionsTable)
    .values({
      ...parsed.data,
      amount: String(parsed.data.amount),
      date: dateToDateString(parsed.data.date),
    })
    .returning();

  res.status(201).json(CreateTransactionResponse.parse({ ...tx, amount: parseFloat(tx.amount) }));
});

router.patch("/financial/transactions/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = UpdateTransactionParams.safeParse({ id: Number(raw) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateTransactionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.amount !== undefined) {
    updateData.amount = String(parsed.data.amount);
  }
  if (parsed.data.date !== undefined) {
    updateData.date = dateToDateString(parsed.data.date);
  }

  const [tx] = await db
    .update(transactionsTable)
    .set(updateData)
    .where(eq(transactionsTable.id, params.data.id))
    .returning();

  if (!tx) {
    res.status(404).json({ error: "Transaction not found" });
    return;
  }

  res.json(UpdateTransactionResponse.parse({ ...tx, amount: parseFloat(tx.amount) }));
});

router.delete("/financial/transactions/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteTransactionParams.safeParse({ id: Number(raw) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  await db.delete(transactionsTable).where(eq(transactionsTable.id, params.data.id));
  res.json(DeleteTransactionResponse.parse({ success: true }));
});

router.get("/financial/summary", async (_req, res): Promise<void> => {
  const transactions = await db.select().from(transactionsTable).orderBy(transactionsTable.date);
  const parsed = transactions.map((t) => ({ ...t, amount: parseFloat(t.amount) }));

  const totalIncome = parsed.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const totalExpense = parsed.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const balance = totalIncome - totalExpense;

  // By category
  const categoryMap = new Map<string, { total: number; count: number }>();
  for (const t of parsed) {
    const key = `${t.type}:${t.category}`;
    const existing = categoryMap.get(key) ?? { total: 0, count: 0 };
    categoryMap.set(key, { total: existing.total + t.amount, count: existing.count + 1 });
  }
  const byCategory = Array.from(categoryMap.entries()).map(([key, val]) => ({
    category: key.split(":")[1],
    total: val.total,
    count: val.count,
  }));

  // Monthly trend
  const monthMap = new Map<string, { income: number; expense: number }>();
  for (const t of parsed) {
    const month = t.date.substring(0, 7); // YYYY-MM
    const existing = monthMap.get(month) ?? { income: 0, expense: 0 };
    if (t.type === "income") {
      monthMap.set(month, { ...existing, income: existing.income + t.amount });
    } else {
      monthMap.set(month, { ...existing, expense: existing.expense + t.amount });
    }
  }
  const monthlyTrend = Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({
      month,
      income: data.income,
      expense: data.expense,
      balance: data.income - data.expense,
    }));

  res.json(
    GetFinancialSummaryResponse.parse({
      totalIncome,
      totalExpense,
      balance,
      byCategory,
      monthlyTrend,
    })
  );
});

export default router;
