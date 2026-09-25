import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import chatRouter from "./chat";
import workspaceRouter, {handleWorkspaceError} from "./workspace";
import billingRouter from "./billing";
import { requireAuth } from "../lib/auth";

const router: IRouter = Router();

// Public: health check and the login flow itself.
router.use(healthRouter);
router.use(authRouter);

// Everything else requires a signed-in user.
router.use(requireAuth, chatRouter);
router.use(requireAuth, workspaceRouter);
router.use(requireAuth, billingRouter);
router.use(handleWorkspaceError);

export default router;
