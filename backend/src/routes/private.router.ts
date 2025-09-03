import { Hono } from "hono";
import { jwtMiddleware } from "../middlewares/jwt";
import { UpdateKeyController } from "../controllers/updateKey";
import { CompareVocalController } from "../controllers/CompareVocal";
import { DisplaySongsController, getLyricsController, getSongKeyController } from "../controllers/Song";
import { FindLeaderBoardController } from "../controllers/LeaderBoard";
import { DisplayMistakesController } from "../controllers/Mistake";
import { HistoryController } from "../controllers/History";

const privateRouter = new Hono()

privateRouter.use(jwtMiddleware)

privateRouter.post("/updatekey", UpdateKeyController);
privateRouter.post("/comparevocal", CompareVocalController);
privateRouter.get("/findallsong", DisplaySongsController);
privateRouter.post("/getleaderboard", FindLeaderBoardController);
privateRouter.post("/getmistakes", DisplayMistakesController);
privateRouter.post("/gethistory", HistoryController);
privateRouter.post("/getlyrics", getLyricsController);
privateRouter.post("/getsongkey", getSongKeyController);

export { privateRouter }