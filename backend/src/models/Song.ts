import { prisma } from '../'

export const FindAllSong = async() => {
    const songs = await prisma.song.findMany();
    return songs;
}

export const FindSongKeyBySongId = async(songId: number) => {
    const keys = await prisma.audio_version.findMany({
        where:{
            song_id: songId
        }
    });
    return keys;
}

export const FindSongById = async(songId: number) => {
    const song = await prisma.song.findUnique({
        where:{
            song_id: songId
        }
    });
    return song;
}

export const FindAudioVerById = async(versionId: number) => {
    const audio = await prisma.audio_version.findUnique({
        where:{
            version_id: versionId
        }
    });
    return audio;
}