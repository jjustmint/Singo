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