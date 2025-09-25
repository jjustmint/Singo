import path = require('path');
import { prisma } from '../'
import * as fs from 'fs';
import { version } from 'os';
import { Mistake } from '../types/CompareVocal';

export const findVersionPath = async(versionId: number) => {
    const versionPath = await prisma.audio_version.findFirst({
        where: {
            version_id: versionId
        }
    })
    if (!versionId) {
        throw new Error("Song not found")
    }
    return  versionPath
}

export const findUserRecordPath = async(recordId: number) => {
    const userRecord = await prisma.recording.findFirst({
        where: {
            record_id: recordId
        }
    })
    if (!userRecord) {
        throw new Error("User record not found")
    }
    return userRecord
}

export const updateScore = async(recordId: number, score: number) => {
    const updateSingingScore = await prisma.recording.update({
        where:{
            record_id: recordId,
        },
        data:{
            accuracy_score: score,
        }
    })
    return updateSingingScore
}

export const uploadMistakes = async(recordId: number, mistakes: Mistake[]) => {
    for (const mistake of mistakes) {
        try {
            await prisma.mistakes.create({
              data: {
                pitch_diff: Math.round(mistake.pitch_diff),
                reason: mistake.reason,
                timestamp_start: mistake.start_time,
                timestamp_end: mistake.end_time,
                recording_id: recordId,
              },
            });
          } catch (err) {
            console.error("Prisma error inserting mistake:", err);
          }
      }     
}

export const createUserRecord = async(payload: {
    user_id: number,
    version_id: number,
    key: string,
    user_audio_path: string,
    accuracy_score: number,
}) => {
    const newRecord = await prisma.recording.create({
        data: {
            user_id: payload.user_id,
            version_id: payload.version_id,
            key: payload.key || null,
            user_audio_path: payload.user_audio_path,
            accuracy_score: payload.accuracy_score || null,
        }
    })
    return newRecord
}