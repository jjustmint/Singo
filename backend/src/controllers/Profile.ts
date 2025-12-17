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
        const update = await updateUser(user_id, { photo: photoPath });
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
        if (!body.username || !body.password) {
            return c.json(ConstructResponse(false, "Missing username or password", 400));
        }
        const checkUser = await checkUsername(parseInt(user_id), body.username);
        if (checkUser) {
            return c.json(ConstructResponse(false, "Username already exists", 400));
        }
        const checkPass = await checkPassword(parseInt(user_id), body.password);
        if (!checkPass) {
            return c.json(ConstructResponse(false, "Password is incorrect", 400));
        }
        if (body.newPassword) {
            if (body.password === body.newPassword) {
                return c.json(ConstructResponse(false, "New password cannot be the same as the old password", 400));
            }
            const hashedNewPassword = await Bun.password.hash(body.newPassword);
            const update = await updateUser(user_id, { username: body.username, password: hashedNewPassword });
            return c.json(ConstructResponse(true, "update username successfully", update), 200);
        } else {
            const update = await updateUser(user_id, { username: body.username });
            return c.json(ConstructResponse(true, "update username successfully", update), 200);
        }
    } catch (e) {
        return c.json(ConstructResponse(false, `Error: ${e}`), 500)
    }
}