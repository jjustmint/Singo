export type CompareVocalPayload = {
    originalPath: string;
    userPath: string;
}

export type FindSongIdPayload = {
    oriId: number;
    recordId: number;
}

export type Mistake = {
    reason: string
    start_time: number
    end_time: number
    pitch_diff: number
}