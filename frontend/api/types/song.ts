export type SongType = {
    song_id: number,
    title: string,
    key_signature: string,
    parent_song_id: number | null,
    lyrics: string | null,
    album_cover: string | null,
    singer: string,
    previewsong: string | null
}
