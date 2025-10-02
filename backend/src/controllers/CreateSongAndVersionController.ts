import { Context } from "hono";
import { ConstructResponse } from "../utils/responseConstructor";
import { createSong, createVersion } from "../models/Song";
import * as fs from "fs";
import path = require("path");

export const CreateSongAndVersionController = async (c: Context) => {
  try {
    const formData = await c.req.formData();
    const song = formData.get("song") as File;
    const songName = formData.get("songName") as string;
    const lyrics = formData.get("lyrics") as string;
    const singer = formData.get("singer") as string;
    const album_coverFile = formData.get("album_cover") as File | null;
    const previewsongFile = formData.get("previewsong") as File | null;

    // === Save album_cover if provided ===
    let album_cover: string | null = null;
    if (album_coverFile) {
      const albumDir = path.join("data", "uploads", "song", songName, "albumCover");
      fs.mkdirSync(albumDir, { recursive: true });
      const albumPath = path.join(albumDir, album_coverFile.name);
      const buf = Buffer.from(await album_coverFile.arrayBuffer());
      fs.writeFileSync(albumPath, buf);
      album_cover = albumPath.replace(/^data[\\/]/, "");
    }

    // === Save previewsong if provided ===
    let previewsong: string | null = null;
    if (previewsongFile) {
      const previewDir = path.join("data", "uploads", "song", songName, "preview");
      fs.mkdirSync(previewDir, { recursive: true });
      const previewPath = path.join(previewDir, previewsongFile.name);
      const buf = Buffer.from(await previewsongFile.arrayBuffer());
      fs.writeFileSync(previewPath, buf);
      previewsong = previewPath.replace(/^data[\\/]/, "");
    }

    const songBaseDir = path.join("python","song", songName);
        const vocalDir = path.join(songBaseDir, "vocal");
        const instruDir = path.join(songBaseDir, "instru");

        fs.mkdirSync(vocalDir, { recursive: true });
        fs.mkdirSync(instruDir, { recursive: true });

    // === Send main audio file to FastAPI ===
    const backendForm = new FormData();
    backendForm.append("song", song);
    backendForm.append("song_name", songName);
    const controller = new AbortController(); // 5 min

    const response = await fetch("http://localhost:8085/upload-song", {
      method: "POST",
      body: backendForm,
      signal: controller.signal,
    });
    
    const result = await response.json();

    if (!response.ok || result.status !== "success") {
      return c.json(ConstructResponse(false, result.message || "Error from compare API", 400));
    }

    // === Step 1: Create song record in DB ===
    const songRecord = await createSong(
      songName,
      result.original_key,
      lyrics,
      singer,
      album_cover,
      previewsong
    );

    // === Step 2: Save separated versions ===
    for (const item of result.separated) {
      if (item.status === "done") {
        // Save correct relative paths in DB (match the actual file extension)
        try {
          await createVersion(
          songRecord.song_id,
          item.instru_path,
          item.vocal_path,
          item.key,
          item.semitone_shift,
          item.is_original
        );}
        catch (e) {
          console.error("Error creating version:", e);
          console.error("111111111111111111111111111111111111111111111111111111111111111111111111111111111111");
          return c.json(ConstructResponse(false, `Error creating version: ${e}`), 500);
      }
    }
    }
  
    return c.json(
      ConstructResponse(true, "Song and versions created successfully", {
        song: songRecord,
        versions: result.separated,
      })
    );
  } catch (e) {
    console.error("Execution error:", e);
    console.error("222222222222222222222222222222222222222222222222222222222222222222222222222222222222");
    return c.json(ConstructResponse(false, `Error: ${e}`), 500);
  }
};
