export type MistakeType = {
  missed_id: number;
  recording_id: number;
  timestamp_start: number;
  timestamp_end: number;
  reason: string;
  pitch_diff: number;
};
