import { Hono } from "hono";
import { jwtMiddleware } from "../middlewares/jwt";
import { UpdateKeyController } from "../controllers/updateKey";
import { CompareVocalController } from "../controllers/CompareVocal";


const privateRouter = new Hono()

privateRouter.get("/updatekey", jwtMiddleware, UpdateKeyController )
privateRouter.post("/comparevocal", jwtMiddleware, CompareVocalController);

export { privateRouter }