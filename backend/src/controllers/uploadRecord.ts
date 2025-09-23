import { Context } from "hono";
import { ConstructResponse } from "../utils/responseConstructor";
import * as fs from "fs";
import * as path from "path";
import { randomUUID } from "crypto";
import ffmpeg from "fluent-ffmpeg";
import { tmpdir } from "os";

// DB helpers
import { createUserRecord, updateScore, uploadMistakes } from "../models/CompareVocal";

export const uploadRecordAndScoreController = async (c: Context) => {
  try {
    const userId = c.get("user_id");
    if (!userId) {
      return c.json(ConstructResponse(false, "Missing userId"), 400);
    }

    // Parse form data (file + versionId + key + original path)
    const formData = await c.req.formData();
    const file = formData.get("file") as File;
    const versionId = formData.get("versionId") as string;
    const key = formData.get("key") as string | null;
    const ori = formData.get("ori") as string | null;

    if (!file) return c.json(ConstructResponse(false, "Missing file"), 400);
    if (!versionId) return c.json(ConstructResponse(false, "Missing versionId"), 400);

    // Convert file into buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Ensure upload directory exists
    const uploadDir = path.join(process.cwd(), "data", "uploads", "users", String(userId));
    fs.mkdirSync(uploadDir, { recursive: true });

    // Save temp WAV file
    const tempWavPath = path.join(tmpdir(), `${randomUUID()}.wav`);
    fs.writeFileSync(tempWavPath, buffer);

    // Convert to MP3
    const mp3Name = `${randomUUID()}.mp3`;
    const mp3Path = path.join(uploadDir, mp3Name);

    await new Promise<void>((resolve, reject) => {
      ffmpeg(tempWavPath)
        .toFormat("mp3")
        .on("error", (err) => reject(err))
        .on("end", () => resolve())
        .save(mp3Path);
    });

    // Delete temp WAV
    fs.unlinkSync(tempWavPath);

    // Create DB entry with MP3 path
    const relativePath = path.relative(process.cwd(), mp3Path);
    const newRecord = await createUserRecord({
      user_id: Number(userId),
      version_id: Number(versionId),
      key: key || "",
      user_audio_path: relativePath,
      accuracy_score: -1, // placeholder
    });

    // Call compare service
    const response = await fetch("http://localhost:8080/compare", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        originalSongPath: ori,
        userSongPath: mp3Path,
      }),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      return c.json(
        ConstructResponse(false, result.message || "Error from compare API", 400)
      );
    }

    // Update DB with score + mistakes
    await updateScore(newRecord.record_id, result?.data?.finalScore);
    await uploadMistakes(newRecord.record_id, result?.data?.mistakes);

    return c.json(
      ConstructResponse(true, "Upload and scoring successful", {
        recordId: newRecord.record_id,
        filePath: mp3Path,
        score: result?.data?.finalScore,
        mistakes: result?.data?.mistakes,
      }),
      200
    );
  } catch (e) {
    console.error("Execution error:", e);
    return c.json(ConstructResponse(false, `Error: ${e}`, null), 500);
  }
};