export type LeaderboardEntryType = {
    record_id: number;
    user_id: number | null;
    userName: string;
    profilePicture: string | null;
    accuracyScore: number;
    createdAt: string;
};
