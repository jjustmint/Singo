import { prisma } from '../'

export const FindAllSong = async() => {
    const songs = await prisma.song.findMany();
    return songs;
}