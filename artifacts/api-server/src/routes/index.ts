import { Router, type IRouter } from "express";
import healthRouter from "./health";
import chatRouter from "./chat";
import demandsRouter from "./demands";
import financialRouter from "./financial";

const router: IRouter = Router();

router.use(healthRouter);
router.use(chatRouter);
router.use(demandsRouter);
router.use(financialRouter);

export default router;
