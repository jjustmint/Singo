export type LeaderboardEntryType = {
    record_id: number;
    user_id: number | null;
    userName: string;
    profilePicture: string | null;
    accuracyScore: number;
    createdAt: string;
};

export type ChallengeSongType = {
    challenge_id: number;
    version_id: number;
    start_date: string;
    end_date: string;
};

export type LeaderboardPayload = {
    challengeSong: ChallengeSongType | null;
    leaderBoard: LeaderboardEntryType[];
};
