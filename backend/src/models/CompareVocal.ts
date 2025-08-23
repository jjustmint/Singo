import path = require('path');
import { prisma } from '../'
import * as fs from 'fs';
import { version } from 'os';

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
            user_id: userId,
        },
        data:{
            
        }
    }
    )
}