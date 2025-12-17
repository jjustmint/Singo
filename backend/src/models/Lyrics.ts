import { prisma } from "..";

export const FindLyricsBySongId = async(songId: number) => {
    const lyrics = await prisma.song.findUnique({
        where:{
            song_id: songId
        }
    })
    return lyrics;
}

export const AddLyric = async (song_id: number, lyric: string, timestart: number) => {
    const addLyric = await prisma.lyric.create({
      data: {
        lyric,
        timestart,
        song_id
      }
    })
    return addLyric;
}

export const GetLyricsBySongId = async (songId: number) => {
    const lyrics = await prisma.lyric.findMany({
        where: {
            song_id: songId
        },
        orderBy: {
            timestart: 'asc'
        }
    });
    return lyrics;
}