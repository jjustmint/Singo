export type SongType = {
    song_id: number,
    title: string,
    key_signature: string,
    parent_song_id: number | null,
    lyrics: string | null,
    singer: string | null,
}