import { Hono } from "hono";
import { jwtMiddleware } from "../middlewares/jwt";
import { UpdateKeyController } from "../controllers/updateKey";
import { CompareVocalController } from "../controllers/CompareVocal";
import { DisplaySongsController, getAudioVerByIdController, getSongController, getSongKeyController } from "../controllers/Song";
import { FindLeaderBoardController } from "../controllers/LeaderBoard";
import { DisplayMistakesController } from "../controllers/Mistake";
import { HistoryController } from "../controllers/History";
import { UserController } from "../controllers/User";
import { uploadRecordAndScoreController } from "../controllers/uploadRecord";
import { CreateSongAndVersionController } from "../controllers/CreateSongAndVersionController";

const privateRouter = new Hono()

privateRouter.use(jwtMiddleware)

privateRouter.post("/updatekey", UpdateKeyController);
privateRouter.post("/comparevocal", CompareVocalController);
privateRouter.get("/findallsong", DisplaySongsController);
privateRouter.post("/getleaderboard", FindLeaderBoardController);
privateRouter.post("/getmistakes", DisplayMistakesController);
privateRouter.post("/gethistory", HistoryController);
privateRouter.post("/getsong", getSongController);
privateRouter.post("/getsongkey", getSongKeyController);
privateRouter.get("/getuser", UserController);
privateRouter.post("/getaudiobyid", getAudioVerByIdController);
privateRouter.post("/uploaduserrecord", uploadRecordAndScoreController);
privateRouter.post("/uploadsong", CreateSongAndVersionController); // Placeholder for song upload

export { privateRouter }