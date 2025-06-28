import { Hono } from "hono";
import { RegisterController } from "../controllers/auth/register";
import { LoginController } from "../controllers/auth/login";

const authRouter = new Hono()

authRouter.post("/register", RegisterController)
authRouter.post("/login", LoginController)

export { authRouter }