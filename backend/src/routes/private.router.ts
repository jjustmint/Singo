import { Hono } from "hono";
import { PrivateController } from "../controllers/test/private";
import { jwtMiddleware } from "../middlewares/jwt";

const privateRouter = new Hono()

privateRouter.get("/hehe", jwtMiddleware, PrivateController)

export { privateRouter }