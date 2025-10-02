import { Context } from "hono";
import { ConstructResponse } from "../utils/responseConstructor";
import { checkPassword, checkUsername, updateUser } from "../models/user.model";
import path = require("path");
import * as fs from "fs";
import { ProfilePayload } from "../types/Profile";

export const updateProfilePicController = async (c: Context) => {
    try {
        const user_id = c.get("user_id")
        if (!user_id) {
            return c.json(ConstructResponse(false, "Missing user id", 400));
        }
        const formData = await c.req.formData();
        const photo = formData.get("photo") as File;
        if (!photo) {
            return c.json(ConstructResponse(false, "Missing photo", 400));
        }
            const Dir = path.join("data", "uploads", "users", String(user_id), "photo");
            fs.mkdirSync(Dir, { recursive: true });
            const photoPath = path.join(Dir, "photo.jpg");
            const buf = Buffer.from(await photo.arrayBuffer());
            fs.writeFileSync(photoPath, buf);
            const update = await updateUser(user_id, { photo: photoPath});
            return c.json(ConstructResponse(true, "update user profile successfully", update), 200);
    } catch (e) {
        return c.json(ConstructResponse(false, `Error: ${e}`), 500)
    }
}

export const updateUserController = async (c: Context) => {
    try {
        const user_id = c.get("user_id")
        if (!user_id) {
            return c.json(ConstructResponse(false, "Missing user id", 400));
        }
        const body = await c.req.json<ProfilePayload>();
        // Validate input
        if (!body.username||!body.oldpassword || !body.password) {
            return c.json(ConstructResponse(false, "Missing password", 400));
        }
        // Check if username & password already exists
        const checkUser = await checkUsername(parseInt(user_id),body.username);
        if (checkUser) {
            return c.json(ConstructResponse(false, "Username already exists", 400));
        }
        const checkPass = await checkPassword(parseInt(user_id), body.oldpassword);
        if(!checkPass){
            return c.json(ConstructResponse(false, "Old password is incorrect", 400));
        }
        const update = await updateUser(user_id, { username: body.username, password: body.password });
        return c.json(ConstructResponse(true, "update username successfully", update), 200);
    } catch (e) {
        return c.json(ConstructResponse(false, `Error: ${e}`), 500)
    }
}