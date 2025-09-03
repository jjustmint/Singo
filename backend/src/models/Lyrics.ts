import { prisma } from "..";

export const FindLyricsBySongId = async(songId: number) => {
    const lyrics = await prisma.song.findUnique({
        where:{
            song_id: songId
        }
    })
    return lyrics;
}