class SoundService {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  private init() {
    if (!this.ctx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setMute(muted: boolean) {
    this.isMuted = muted;
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    return this.isMuted;
  }

  public getIsMuted() {
    return this.isMuted;
  }

  public playSelect() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(850, this.ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  }

  public playConnect() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    
    // First high tone
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(523.25, now); // C5
    osc1.frequency.setValueAtTime(659.25, now + 0.08); // E5
    gain1.gain.setValueAtTime(0.1, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    osc1.connect(gain1);
    gain1.connect(this.ctx.destination);
    osc1.start();
    osc1.stop(now + 0.25);

    // Second backing harmony
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(329.63, now); // E4
    osc2.frequency.setValueAtTime(392.00, now + 0.08); // G4
    gain2.gain.setValueAtTime(0.06, now);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc2.connect(gain2);
    gain2.connect(this.ctx.destination);
    osc2.start();
    osc2.stop(now + 0.3);
  }

  public playDisconnect() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, now); // A4
    osc.frequency.linearRampToValueAtTime(220, now + 0.25); // A3

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(now + 0.25);
  }

  public playError() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(130, now); // C3
    osc.frequency.setValueAtTime(115, now + 0.1); 

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.setValueAtTime(0.12, now + 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(now + 0.25);
  }

  public playReset() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.4);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(now + 0.45);
  }

  public playTrainWhistle() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;

    // Steam train whistle is made of multiple harmonic frequencies (e.g. 587Hz D5, 659Hz E5, 784Hz G5)
    // plus a small frequency modulation and/or bandpass filtered white noise.
    // Let's combine three oscillators to get that beautiful vintage locomotive whistle chord:
    const frequencies = [587.33, 659.25, 783.99];
    
    frequencies.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      
      // slightly detune each slightly to make it organic and rich
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq + (idx * 1.5), now);
      
      // Vibrato / jitter
      const vibrato = this.ctx!.createOscillator();
      const vibratoGain = this.ctx!.createGain();
      vibrato.frequency.value = 6; // 6Hz vibration
      vibratoGain.gain.value = 8; // frequency dev of 8Hz
      
      vibrato.connect(vibratoGain);
      vibratoGain.connect(osc.frequency);
      
      // Main envelope: puff puff ... toottooot!
      // Part 1: brief puff (0.0s to 0.2s)
      // Part 2: long puff (0.3s to 1.5s)
      gain.gain.setValueAtTime(0.0, now);
      gain.gain.linearRampToValueAtTime(0.06, now + 0.05); // attack
      gain.gain.linearRampToValueAtTime(0.03, now + 0.25); // decay
      
      gain.gain.setValueAtTime(0.0, now + 0.28);
      gain.gain.linearRampToValueAtTime(0.08, now + 0.35); // attack 2
      gain.gain.setValueAtTime(0.08, now + 1.28);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.8); // release
      
      osc.connect(gain);
      gain.connect(this.ctx!.destination);
      
      vibrato.start(now);
      osc.start(now);
      
      vibrato.stop(now + 1.8);
      osc.stop(now + 1.8);
    });

    // Add some filtered white noise backings for the steam release hiss
    try {
      const bufferSize = this.ctx.sampleRate * 1.8;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      
      const noiseNode = this.ctx.createBufferSource();
      noiseNode.buffer = buffer;
      
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 1200;
      filter.Q.value = 2.0;
      
      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.0, now);
      noiseGain.gain.linearRampToValueAtTime(0.015, now + 0.05);
      noiseGain.gain.setValueAtTime(0.015, now + 0.25);
      noiseGain.gain.setValueAtTime(0.0, now + 0.28);
      noiseGain.gain.linearRampToValueAtTime(0.02, now + 0.35);
      noiseGain.gain.setValueAtTime(0.02, now + 1.2);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 1.7);
      
      noiseNode.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.ctx.destination);
      
      noiseNode.start(now);
      noiseNode.stop(now + 1.8);
    } catch (e) {
      console.warn("White noise whistle layer not supported", e);
    }
  }
}

export const sound = new SoundService();
