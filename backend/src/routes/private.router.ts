import { Hono } from "hono";
import { jwtMiddleware } from "../middlewares/jwt";
import { UpdateKeyController } from "../controllers/updateKey";
import { CompareVocalController } from "../controllers/CompareVocal";
import { DisplaySongsController, getAudioVerByIdController, getLatestSongsController, getRecordController, getSongController, getSongKeyController } from "../controllers/Song";
import { FindLeaderBoardController, setChallengeSongController } from "../controllers/LeaderBoard";
import { DisplayMistakesController } from "../controllers/Mistake";
import { HistoryController } from "../controllers/History";
import { UserController } from "../controllers/User";
import { uploadRecordAndScoreController } from "../controllers/uploadRecord";
import { CreateSongAndVersionController } from "../controllers/CreateSongAndVersionController";
import { updateProfilePicController, updateUserController } from "../controllers/Profile";
import { AddLyricController, GetLyricController } from "../controllers/Lyrics";

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
privateRouter.post("/getsongs/latest", getLatestSongsController);
privateRouter.get("/getuser", UserController);
privateRouter.post("/getaudiobyid", getAudioVerByIdController);
privateRouter.post("/uploaduserrecord", uploadRecordAndScoreController);
privateRouter.post("/uploadsong", CreateSongAndVersionController);
privateRouter.post("/updatepic", updateProfilePicController);
privateRouter.post("/updateuser", updateUserController);
privateRouter.post("/addlyric", AddLyricController);
privateRouter.post("/getlyric", GetLyricController);
privateRouter.post("/getrecord", getRecordController);
privateRouter.post("/setChallenge", setChallengeSongController);

export { privateRouter }
