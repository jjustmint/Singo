import { Hono } from "hono";
import { PrivateController } from "../controllers/test/private";
import { jwtMiddleware } from "../middlewares/jwt";
import { UpdateKeyController } from "../controllers/updateKey";


const privateRouter = new Hono()

privateRouter.get("/hehe", jwtMiddleware, PrivateController)
privateRouter.post("/updatekey", jwtMiddleware, UpdateKeyController )

export { privateRouter }