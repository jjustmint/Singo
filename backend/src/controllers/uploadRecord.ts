import { Context } from "hono";
import { ConstructResponse } from "../utils/responseConstructor";
import * as fs from "fs";
import * as path from "path";
import { randomUUID } from "crypto";

// DB helpers
import { createUserRecord, updateScore, uploadMistakes, findVersionPath } from "../models/CompareVocal";

export const uploadRecordAndScoreController = async (c: Context) => {
    try {
        const userId = c.get("user_id");
        if (!userId) {
            return c.json(ConstructResponse(false, "Missing userId"), 400);
        }

        // Parse form data (file + versionId + key)
        const formData = await c.req.formData();
        const file = formData.get("file") as File;
        const versionId = formData.get("versionId") as string;
        const key = formData.get("key") as string | null;
        const ori = formData.get("ori") as string | null;

        if (!file) {
            return c.json(ConstructResponse(false, "Missing file"), 400);
        }
        if (!versionId) {
            return c.json(ConstructResponse(false, "Missing versionId"), 400);
        }

        // Convert file into buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Ensure upload dir exists
        const uploadDir = path.join(process.cwd(), "data", "uploads", "users", String(userId));
        fs.mkdirSync(uploadDir, { recursive: true });

        // Generate unique filename
        const ext = path.extname(file.name) || ".mp3";
        const uniqueName = `${randomUUID()}${ext}`;
        const filePath = path.join(uploadDir, uniqueName);

        // Save file
        fs.writeFileSync(filePath, buffer);
        const relativePath = path.relative(process.cwd(), filePath);

        // Create DB entry (initially with null accuracy_score)
        const newRecord = await createUserRecord({
            user_id: Number(userId),
            version_id: Number(versionId),
            key: key || "",
            user_audio_path: relativePath,
            accuracy_score: -1, // placeholder until scored
        });

        // Call FastAPI compare service
        const response = await fetch("http://localhost:8080/compare", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                originalSongPath: ori,
                userSongPath: filePath,
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
                filePath,
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
