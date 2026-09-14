import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import chatRouter from "./chat";
import demandsRouter from "./demands";
import financialRouter from "./financial";
import billingRouter from "./billing";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

// Public: health check and the login flow itself.
router.use(healthRouter);
router.use(authRouter);

// Everything else requires a signed-in user.
router.use(requireAuth, chatRouter);
router.use(requireAuth, demandsRouter);
router.use(requireAuth, financialRouter);
router.use(requireAuth, billingRouter);

export default router;
