/**
 * Audio provider abstraction.
 *
 * PHASE 2 ships the UI contract only. The mock does NOT play silence: a silent
 * MP3 makes the listening UX impossible to evaluate, so the mock reports that
 * no audio exists and the player renders an honest "аудио скоро" state.
 * Real clips (10–20 reviewed German phrases) arrive before PHASE 4, and
 * PHASE 8 swaps in the ElevenLabs implementation behind this same interface.
 */

export type AudioSpeed = 'slow' | 'normal' | 'natural';

export type AudioTrack = {
  url: string;
  durationMs: number | null;
  speed: AudioSpeed;
};

export interface AudioProvider {
  readonly name: 'mock' | 'elevenlabs';
  /** Returns null when no approved audio exists for this phrase yet. */
  getTrack(phraseId: string, speed?: AudioSpeed): Promise<AudioTrack | null>;
}

class MockAudioProvider implements AudioProvider {
  readonly name = 'mock' as const;

  async getTrack(): Promise<AudioTrack | null> {
    return null;
  }
}

export function createAudioProvider(): AudioProvider {
  return new MockAudioProvider();
}
