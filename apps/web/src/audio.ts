import type { Settings } from '@voidmarch/config';
let context: AudioContext | undefined, master: GainNode | undefined, ambient: GainNode | undefined;
export function startAudio() {
  if (context) {
    void context.resume();
    return;
  }
  context = new AudioContext();
  master = context.createGain();
  master.gain.value = 0.03;
  master.connect(context.destination);
  ambient = context.createGain();
  ambient.gain.value = 0.25;
  ambient.connect(master);
  const length = context.sampleRate * 3,
    buffer = context.createBuffer(1, length, context.sampleRate),
    data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < length; i++) {
    last = (last + Math.random() * 0.04 - 0.02) * 0.985;
    data[i] = last;
  }
  const wind = context.createBufferSource();
  wind.buffer = buffer;
  wind.loop = true;
  const filter = context.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 500;
  wind.connect(filter);
  filter.connect(ambient);
  wind.start();
  for (const frequency of [55, 82.42]) {
    const oscillator = context.createOscillator();
    oscillator.type = 'sine';
    oscillator.frequency.value = frequency;
    const gain = context.createGain();
    gain.gain.value = 0.045;
    oscillator.connect(gain);
    gain.connect(ambient);
    oscillator.start();
  }
}
export function audioSettings(s: Settings) {
  if (master)
    master.gain.value = (s.muteUnfocused && document.hidden ? 0 : s.masterVolume / 100) * 0.15;
  if (ambient) ambient.gain.value = s.musicVolume / 100;
}
export function sound(kind: string, volume: number) {
  if (!context || !master) return;
  const oscillator = context.createOscillator(),
    gain = context.createGain(),
    now = context.currentTime;
  oscillator.type = kind === 'ATTACK' ? 'triangle' : 'sine';
  oscillator.frequency.setValueAtTime(kind === 'ATTACK' ? 95 : kind === 'BUILD' ? 220 : 330, now);
  oscillator.frequency.exponentialRampToValueAtTime(70, now + 0.25);
  gain.gain.setValueAtTime((volume / 100) * 0.25, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
  oscillator.connect(gain);
  gain.connect(master);
  oscillator.start();
  oscillator.stop(now + 0.5);
}
