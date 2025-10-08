import { prisma } from '../'

export const FindAllSong = async() => {
    const songs = await prisma.song.findMany();
    return songs;
}

export const FindSongKeyBySongId = async (songId: number) => {
  const keys = await prisma.audio_version.findMany({
      where: {
          song_id: songId
      },
      orderBy: {
          semitone_shift: "asc"
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

export const createSong = async (title: string, key: string, singer: string, album_cover: string | null, previewsong: string | null) => {
    const createSong = await prisma.song.create({
      data: {
        title,
        key_signature: key,
        singer,
        album_cover,
        previewsong
      }
    })
  
    return createSong
  }
  
export const createVersion = async (songId: number, instru_path: string, ori_path: string, key_signature: string, semitone_shift: number, is_original: boolean ) => {
  const createVersion = await prisma.audio_version.create({
    data: {
      song_id: songId,
        instru_path,
        ori_path,
        key_signature,
        semitone_shift,
        is_original
      }
    })
  
    return createVersion
  }

export const getRecordById = async ( recordId: number) => {
  const record = await prisma.recording.findUnique({
      where: {
          record_id: recordId
      }
  })
  return record
}