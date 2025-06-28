import { Hono } from "hono";
import { authRouter } from "./auth.router";
import { privateRouter } from "./private.router";

const mainRouter = new Hono()

mainRouter.route("/auth", authRouter)
mainRouter.route("/private", privateRouter)

export { mainRouter }