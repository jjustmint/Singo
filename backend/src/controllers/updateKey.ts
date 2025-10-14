import { Context } from "hono";
import { ConstructResponse } from "../utils/responseConstructor";
import { updateKey } from "../models/user.model";

export const UpdateKeyController = async (c: Context) => {
    try {
      const userId = c.get("user_id");
      if (!userId) return c.json(ConstructResponse(false, "Missing user id"), 400);
  
      // Get uploaded file from frontend request
      const formData = await c.req.formData();
      const file = formData.get("file") as File;
      if (!file) return c.json(ConstructResponse(false, "Missing audio file"), 400);
  
      // Forward to FastAPI
      const forwardForm = new FormData();
      forwardForm.append("file", file, file.name);
  
      const res = await fetch("http://keydetector-api:8083/keydetect", {
        method: "POST",
        body: forwardForm,
      });
  
      const data = await res.json();
  
      // Update in DB
      const update = await updateKey(userId, data?.detectedKey);
  
      return c.json(ConstructResponse(true, "Successfully Updated Key", update), 200);
    } catch (e) {
      console.log(e);
      
      return c.json(ConstructResponse(false, `${e}`), 500);
    }
  };