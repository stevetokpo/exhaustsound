"use client";

import { useState } from "react";
import { useSession } from "@/lib/hooks/useSession";
import { PresetShelf } from "./PresetShelf";
import { ToneSection } from "./ToneSection";
import { NoiseSection } from "./NoiseSection";
import { SessionPanel } from "./SessionPanel";
import { BackgroundTrack } from "./BackgroundTrack";
import { TransportDock } from "./TransportDock";
import { VeilOverlay } from "./VeilOverlay";
import { Visualizer } from "./Visualizer";

export function Studio() {
  const engine = useSession();
  const [veilOpen, setVeilOpen] = useState(false);

  return (
    <>
      {/* Halos d'ambiance : deux formes très lentes, seules choses animées
          de la page en dehors de l'onde. */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div
          className="halo absolute -left-40 -top-40 size-[38rem] rounded-full opacity-[0.16] blur-3xl"
          style={{ background: "var(--halo-a)" }}
        />
        <div
          className="halo absolute -bottom-52 -right-40 size-[34rem] rounded-full opacity-[0.13] blur-3xl"
          style={{ background: "var(--halo-b)", animationDelay: "-14s" }}
        />
      </div>

      <div className="mx-auto w-full max-w-6xl px-4 pb-32 pt-6 sm:px-6">
        <div className="panel mb-4 overflow-hidden px-4 pt-3">
          <Visualizer getAnalyser={engine.getAnalyser} active={engine.isActive} />
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
          <div className="space-y-4">
            <PresetShelf
              activePreset={engine.activePreset}
              onSelect={engine.applyPreset}
            />
            <ToneSection settings={engine.settings} update={engine.update} />
          </div>

          <div className="space-y-4 lg:sticky lg:top-20">
            <SessionPanel
              master={engine.settings.master}
              onMasterChange={engine.setMaster}
              durationMin={engine.durationMin}
              onDurationChange={engine.changeDuration}
              remaining={engine.remaining}
              isActive={engine.isActive}
              onVeil={() => setVeilOpen(true)}
            />
            <BackgroundTrack
              track={engine.track}
              level={engine.trackLevel}
              loop={engine.trackLoop}
              onTrackChange={engine.changeTrack}
              onLevelChange={engine.setTrackLevel}
              onLoopChange={engine.setTrackLoop}
            />
            <NoiseSection settings={engine.settings} update={engine.update} />
          </div>
        </div>
      </div>

      <TransportDock
        state={engine.state}
        settings={engine.settings}
        activePreset={engine.activePreset}
        durationMin={engine.durationMin}
        remaining={engine.remaining}
        onToggle={engine.toggle}
      />

      <VeilOverlay
        open={veilOpen}
        onClose={() => setVeilOpen(false)}
        isActive={engine.isActive}
        durationMin={engine.durationMin}
        remaining={engine.remaining}
      />
    </>
  );
}
