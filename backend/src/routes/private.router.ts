import { Hono } from "hono";
import { jwtMiddleware } from "../middlewares/jwt";
import { UpdateKeyController } from "../controllers/updateKey";
import { CompareVocalController } from "../controllers/CompareVocal";
import { DisplaySongsController, getLyricsController, getSongKeyController } from "../controllers/Song";
import { FindLeaderBoardController } from "../controllers/LeaderBoard";
import { DisplayMistakesController } from "../controllers/Mistake";
import { HistoryController } from "../controllers/History";

const privateRouter = new Hono()

privateRouter.post("/updatekey", jwtMiddleware, UpdateKeyController);
privateRouter.post("/comparevocal", jwtMiddleware, CompareVocalController);
privateRouter.get("/findallsong", jwtMiddleware, DisplaySongsController);
privateRouter.post("/getleaderboard", jwtMiddleware, FindLeaderBoardController);
privateRouter.post("/getmistakes", jwtMiddleware, DisplayMistakesController);
privateRouter.post("/gethistory", jwtMiddleware, HistoryController);
privateRouter.post("/getlyrics", jwtMiddleware, getLyricsController);
privateRouter.post("/getsongkey", jwtMiddleware, getSongKeyController);

export { privateRouter }