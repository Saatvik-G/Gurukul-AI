export class AudioAmplitudeTracker {
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private dataArray: Uint8Array | null = null;
  private isConnected = false;

  public init(audioElement: HTMLAudioElement): void {
    if (this.isConnected) return;
    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) return;

      this.audioCtx = new AudioCtxClass();
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.6;

      const bufferLength = this.analyser.frequencyBinCount;
      this.dataArray = new Uint8Array(new ArrayBuffer(bufferLength));

      this.sourceNode = this.audioCtx.createMediaElementSource(audioElement);
      this.sourceNode.connect(this.analyser);
      this.analyser.connect(this.audioCtx.destination);
      this.isConnected = true;
    } catch (e) {
      console.warn("Web Audio API initialization notice:", e);
    }
  }

  public getAmplitude(): number {
    if (!this.analyser || !this.dataArray) return 0;

    if (this.audioCtx && this.audioCtx.state === "suspended") {
      this.audioCtx.resume().catch(() => {});
    }

    (this.analyser as any).getByteFrequencyData(this.dataArray);
    let sum = 0;
    const len = this.dataArray.length;
    for (let i = 0; i < len; i++) {
      sum += this.dataArray[i];
    }
    const average = sum / len;
    // Normalize to 0 - 1 range with exponential smoothing curve
    const normalized = Math.min(1, Math.max(0, average / 128));
    return Math.pow(normalized, 1.2);
  }

  public cleanup(): void {
    if (this.audioCtx && this.audioCtx.state !== "closed") {
      this.audioCtx.close().catch(() => {});
    }
    this.isConnected = false;
  }
}
