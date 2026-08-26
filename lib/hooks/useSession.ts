"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SessionMixer, type SessionState } from "@/lib/audio/session";
import {
  DEFAULT_SETTINGS,
  type AmbienceId,
  type EngineSettings,
  type NoiseColor,
  type Texture,
} from "@/lib/audio/types";
import type { Preset } from "@/lib/audio/presets";
import type { Track } from "@/lib/library/types";

/** Durée du fondu de fin de séance, en secondes. */
export const SESSION_FADE = 25;

const NOISE_COLORS: readonly Texture[] = ["off", "white", "pink", "brown"];

interface WakeLockSentinelLike {
  release: () => Promise<void>;
  released: boolean;
}

export function useSession() {
  const mixerRef = useRef<SessionMixer | null>(null);
  const wakeLockRef = useRef<WakeLockSentinelLike | null>(null);
  const endsAtRef = useRef<number | null>(null);
  const fadeStartedRef = useRef(false);

  const [settings, setSettings] = useState<EngineSettings>(DEFAULT_SETTINGS);
  const [state, setState] = useState<SessionState>("idle");
  const [durationMin, setDurationMin] = useState(0); // 0 = sans limite
  const [remaining, setRemaining] = useState(0);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [track, setTrack] = useState<Track | null>(null);
  const [trackLevel, setTrackLevelState] = useState(0.5);
  const [trackLoop, setTrackLoopState] = useState(true);

  const getMixer = useCallback(() => {
    mixerRef.current ??= new SessionMixer();
    return mixerRef.current;
  }, []);

  // ------------------------------------------------------------ cycle de vie

  useEffect(() => {
    const mixer = getMixer();
    // Le mélangeur est un système externe : c'est lui qui notifie la fin d'un
    // fondu, et c'est dans son rappel qu'on remet le minuteur à zéro.
    mixer.onStateChange = (next) => {
      setState(next);
      if (next === "idle") {
        endsAtRef.current = null;
        fadeStartedRef.current = false;
        setRemaining(0);
      }
    };
    return () => {
      mixer.onStateChange = null;
      mixer.dispose();
      mixerRef.current = null;
    };
  }, [getMixer]);

  // ------------------------------------------- veille écran pendant l'écoute

  const releaseWakeLock = useCallback(() => {
    void wakeLockRef.current?.release().catch(() => {});
    wakeLockRef.current = null;
  }, []);

  const requestWakeLock = useCallback(async () => {
    const wl = (navigator as Navigator & {
      wakeLock?: { request: (t: "screen") => Promise<WakeLockSentinelLike> };
    }).wakeLock;
    if (!wl || wakeLockRef.current) return;
    try {
      wakeLockRef.current = await wl.request("screen");
    } catch {
      // Refusé (onglet en arrière-plan, batterie faible) : sans conséquence.
    }
  }, []);

  useEffect(() => {
    if (state === "playing") void requestWakeLock();
    else releaseWakeLock();
  }, [state, requestWakeLock, releaseWakeLock]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible" && state === "playing") {
        void requestWakeLock();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [state, requestWakeLock]);

  // --------------------------------------------------------------- minuteur

  useEffect(() => {
    if (state !== "playing" || endsAtRef.current === null) return;

    const tick = () => {
      const endsAt = endsAtRef.current;
      if (endsAt === null) return;
      const left = Math.max(0, endsAt - Date.now());
      setRemaining(Math.ceil(left / 1000));
      if (left <= SESSION_FADE * 1000 && !fadeStartedRef.current) {
        fadeStartedRef.current = true;
        // Le fondu est calé sur le temps réellement restant : si l'utilisateur
        // rallonge la séance en cours de route, la fin reste juste.
        getMixer().stop(Math.max(1, left / 1000));
      }
    };

    tick();
    const id = window.setInterval(tick, 500);
    return () => window.clearInterval(id);
  }, [state, getMixer]);

  // ---------------------------------------------------------------- transport

  const start = useCallback(async () => {
    fadeStartedRef.current = false;
    endsAtRef.current = durationMin > 0 ? Date.now() + durationMin * 60_000 : null;
    setRemaining(durationMin * 60);
    await getMixer().start();
  }, [durationMin, getMixer]);

  const stop = useCallback(() => {
    getMixer().stop();
  }, [getMixer]);

  const toggle = useCallback(async () => {
    if (state === "idle") await start();
    else stop();
  }, [state, start, stop]);

  // -------------------------------------------- contrôles de l'écran verrouillé

  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title:
        track?.title ??
        activePreset ??
        `${settings.frequency.toFixed(settings.frequency % 1 ? 1 : 0)} Hz`,
      artist: "ExhaustSound",
      album: activePreset ?? "Générateur de fréquences",
    });
    navigator.mediaSession.playbackState = state === "idle" ? "paused" : "playing";
    navigator.mediaSession.setActionHandler("play", () => void start());
    navigator.mediaSession.setActionHandler("pause", () => stop());
    return () => {
      navigator.mediaSession.setActionHandler("play", null);
      navigator.mediaSession.setActionHandler("pause", null);
    };
  }, [state, activePreset, track, settings.frequency, start, stop]);

  // ------------------------------------------------------------ piste de fond

  const changeTrack = useCallback(
    (next: Track | null) => {
      setTrack(next);
      const mixer = getMixer();
      mixer.track.load(next?.url ?? null);
      if (next) {
        mixer.track.setLevel(trackLevel);
        mixer.track.setLoop(trackLoop);
        if (mixer.getState() === "playing") void mixer.track.play();
      }
    },
    [getMixer, trackLevel, trackLoop],
  );

  const setTrackLevel = useCallback(
    (value: number) => {
      setTrackLevelState(value);
      getMixer().track.setLevel(value);
    },
    [getMixer],
  );

  const setTrackLoop = useCallback(
    (value: boolean) => {
      setTrackLoopState(value);
      getMixer().track.setLoop(value);
    },
    [getMixer],
  );

  // --------------------------------------------------------------- réglages

  const update = useCallback(
    <K extends keyof EngineSettings>(key: K, value: EngineSettings[K]) => {
      setSettings((prev) => ({ ...prev, [key]: value }));
      setActivePreset(null);
      const tone = getMixer().tone;
      switch (key) {
        case "frequency": tone.setFrequency(value as number); break;
        case "waveform": tone.setWaveform(value as EngineSettings["waveform"]); break;
        case "mode": tone.setMode(value as EngineSettings["mode"]); break;
        case "beat": tone.setBeat(value as number); break;
        case "depth": tone.setDepth(value as number); break;
        case "toneLevel": tone.setToneLevel(value as number); break;
        case "noise": tone.setNoise(value as EngineSettings["noise"]); break;
        case "noiseLevel":
          tone.setNoiseLevel(value as number);
          getMixer().ambience.setLevel(value as number);
          break;
        case "noiseTone":
          tone.setNoiseTone(value as number);
          getMixer().ambience.setTone(value as number);
          break;
        case "master": getMixer().setMaster(value as number); break;
      }
    },
    [getMixer],
  );

  /**
   * Un seul sélecteur pour la couche de fond. Bruit brut et ambiance
   * naturelle s'excluent : une pluie est déjà du bruit filtré, les
   * superposer ne ferait qu'ajouter du souffle.
   */
  const setTexture = useCallback(
    (value: Texture) => {
      const isNoise = NOISE_COLORS.includes(value);
      const noise: NoiseColor = isNoise ? (value as NoiseColor) : "off";
      const ambience: AmbienceId | "off" = isNoise ? "off" : (value as AmbienceId);

      setSettings((prev) => ({ ...prev, noise, ambience }));
      setActivePreset(null);

      const mixer = getMixer();
      mixer.tone.setNoise(noise);
      mixer.ambience.setAmbience(
        ambience === "off" ? null : ambience,
        mixer.getState() === "playing",
      );
    },
    [getMixer],
  );

  /** Le volume général n'est jamais rattaché à un preset : c'est un
   *  réglage de confort, il ne doit pas invalider la sélection en cours. */
  const setMaster = useCallback(
    (value: number) => {
      setSettings((prev) => ({ ...prev, master: value }));
      getMixer().setMaster(value);
    },
    [getMixer],
  );

  const applyPreset = useCallback(
    (preset: Preset) => {
      setSettings((prev) => ({ ...prev, ...preset.settings }));
      setActivePreset(preset.name);
      getMixer().applyPreset(preset.settings);
      if (preset.duration) {
        setDurationMin(preset.duration);
        if (endsAtRef.current !== null) {
          endsAtRef.current = Date.now() + preset.duration * 60_000;
          fadeStartedRef.current = false;
        }
      }
    },
    [getMixer],
  );

  const changeDuration = useCallback((minutes: number) => {
    setDurationMin(minutes);
    if (minutes === 0) {
      endsAtRef.current = null;
      setRemaining(0);
      return;
    }
    if (endsAtRef.current !== null) {
      endsAtRef.current = Date.now() + minutes * 60_000;
      fadeStartedRef.current = false;
      setRemaining(minutes * 60);
    }
  }, []);

  return {
    settings,
    state,
    isActive: state !== "idle",
    remaining,
    durationMin,
    activePreset,
    track,
    trackLevel,
    trackLoop,
    texture: (settings.ambience !== "off" ? settings.ambience : settings.noise) as Texture,
    update,
    setTexture,
    setMaster,
    applyPreset,
    changeDuration,
    changeTrack,
    setTrackLevel,
    setTrackLoop,
    start,
    stop,
    toggle,
    getAnalyser: useCallback(() => getMixer().getAnalyser(), [getMixer]),
  };
}
