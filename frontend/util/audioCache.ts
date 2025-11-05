import { Directory, File, Paths } from "expo-file-system";
import { buildAssetUri } from "@/util/assetUri";

const REMOTE_AUDIO_PATTERN = /^https?:\/\//i;
const AUDIO_CACHE_DIRECTORY = "audio-cache";

const safeFileName = (value: string) =>
  value.replace(/[^a-zA-Z0-9._-]/g, "_");

const cachedAudioMap = new Map<
  number,
  {
    promise: Promise<CachedAudioAsset>;
  }
>();

type CachedAudioAsset = {
  instrumentUri?: string | null;
  vocalUri?: string | null;
  localInstrumentUri?: string | null;
  localVocalUri?: string | null;
};

export const ensureLocalAudioFile = async (
  remoteUri: string
): Promise<string> => {
  if (!remoteUri) {
    throw new Error("Remote URI is required.");
  }

  if (!REMOTE_AUDIO_PATTERN.test(remoteUri)) {
    return remoteUri;
  }

  try {
    const cacheRoot = Paths.cache;
    if (!cacheRoot?.uri) {
      throw new Error("Cache directory unavailable");
    }

    const audioCacheDir = new Directory(cacheRoot, AUDIO_CACHE_DIRECTORY);
    try {
      audioCacheDir.create({ intermediates: true, idempotent: true });
    } catch (dirError) {
      console.warn("Audio cache directory setup warning:", dirError);
    }

    const lastSegment =
      remoteUri.split("/").pop()?.split("?")[0].split("#")[0] ??
      `audio-${Date.now()}.mp3`;
    const fileName = safeFileName(lastSegment);
    const targetFile = new File(audioCacheDir, `${Date.now()}-${fileName}`);

    const downloadedFile = await File.downloadFileAsync(remoteUri, targetFile, {
      idempotent: true,
    });

    return downloadedFile.uri;
  } catch (error) {
    console.warn("Falling back to streaming audio due to caching failure", error);
    return remoteUri;
  }
};

export const prefetchAudioVersion = (
  versionId: number,
  instruPath?: string | null,
  vocalPath?: string | null
) => {
  if (typeof versionId !== "number" || Number.isNaN(versionId)) {
    return null;
  }

  const existing = cachedAudioMap.get(versionId);
  if (existing) {
    return existing.promise;
  }

  const promise = (async (): Promise<CachedAudioAsset> => {
    const instrumentUri = buildAssetUri(instruPath);
    const vocalUri = buildAssetUri(vocalPath);

    const result: CachedAudioAsset = {
      instrumentUri,
      vocalUri,
      localInstrumentUri: null,
      localVocalUri: null,
    };

    try {
      if (instrumentUri) {
        result.localInstrumentUri = await ensureLocalAudioFile(instrumentUri);
      }
    } catch (err) {
      console.warn("Failed to prefetch instrumental audio", err);
      result.localInstrumentUri = null;
    }

    try {
      if (vocalUri && vocalUri !== instrumentUri) {
        result.localVocalUri = await ensureLocalAudioFile(vocalUri);
      }
    } catch (err) {
      console.warn("Failed to prefetch vocal audio", err);
      result.localVocalUri = null;
    }

    return result;
  })();

  cachedAudioMap.set(versionId, { promise });

  promise.catch(() => {
    cachedAudioMap.delete(versionId);
  });

  return promise;
};

export const consumePrefetchedAudio = (
  versionId: number
): Promise<CachedAudioAsset> | null => {
  const entry = cachedAudioMap.get(versionId);
  return entry?.promise ?? null;
};
