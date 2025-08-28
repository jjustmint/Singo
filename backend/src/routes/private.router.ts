import { Hono } from "hono";
import { jwtMiddleware } from "../middlewares/jwt";
import { UpdateKeyController } from "../controllers/updateKey";
import { CompareVocalController } from "../controllers/CompareVocal";
import { DisplaySongsController } from "../controllers/Song";
import { FindLeaderBoardController } from "../controllers/LeaderBoard";

const privateRouter = new Hono()

privateRouter.get("/updatekey", jwtMiddleware, UpdateKeyController )
privateRouter.post("/comparevocal", jwtMiddleware, CompareVocalController);
privateRouter.get("/findallsong", jwtMiddleware, DisplaySongsController);
privateRouter.post("/getleaderboard", jwtMiddleware, FindLeaderBoardController);

export { privateRouter }