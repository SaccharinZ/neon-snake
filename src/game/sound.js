let audioContext = null;

function getAudioContext() {
  if (typeof window === 'undefined') return null;

  const AudioContextClass = window.AudioContext ?? window.webkitAudioContext;
  if (!AudioContextClass) return null;

  if (!audioContext) {
    try {
      audioContext = new AudioContextClass();
    } catch {
      return null;
    }
  }

  if (audioContext.state === 'suspended') {
    audioContext.resume().catch(() => {});
  }

  return audioContext;
}

function tone({
  frequency,
  endFrequency = frequency,
  duration = 0.1,
  type = 'sine',
  volume = 0.04,
  delay = 0,
}) {
  const context = getAudioContext();
  if (!context) return;

  const startAt = context.currentTime + delay;
  const oscillator = context.createOscillator();
  const gain = context.createGain();

  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, startAt);
  oscillator.frequency.exponentialRampToValueAtTime(
    Math.max(30, endFrequency),
    startAt + duration,
  );

  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(volume, startAt + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(startAt);
  oscillator.stop(startAt + duration + 0.03);
}

export function unlockAudio() {
  getAudioContext();
}

export function playStartSound() {
  tone({ frequency: 280, endFrequency: 420, duration: 0.11, type: 'triangle' });
  tone({
    frequency: 420,
    endFrequency: 660,
    duration: 0.12,
    type: 'triangle',
    delay: 0.08,
  });
  tone({
    frequency: 660,
    endFrequency: 880,
    duration: 0.14,
    type: 'sine',
    volume: 0.03,
    delay: 0.16,
  });
}

export function playEatSound() {
  tone({
    frequency: 720,
    endFrequency: 1000,
    duration: 0.08,
    type: 'triangle',
    volume: 0.045,
  });
  tone({
    frequency: 1220,
    endFrequency: 1460,
    duration: 0.07,
    type: 'sine',
    volume: 0.022,
    delay: 0.045,
  });
}

export function playLevelUpSound() {
  tone({
    frequency: 520,
    endFrequency: 660,
    duration: 0.1,
    type: 'triangle',
    volume: 0.028,
    delay: 0.02,
  });
  tone({
    frequency: 780,
    endFrequency: 1040,
    duration: 0.14,
    type: 'sine',
    volume: 0.026,
    delay: 0.1,
  });
}

export function playCrashSound() {
  tone({
    frequency: 240,
    endFrequency: 70,
    duration: 0.34,
    type: 'sawtooth',
    volume: 0.045,
  });
  tone({
    frequency: 120,
    endFrequency: 48,
    duration: 0.28,
    type: 'square',
    volume: 0.02,
    delay: 0.02,
  });
}

export function playWinSound() {
  [440, 554, 659, 880].forEach((frequency, index) => {
    tone({
      frequency,
      endFrequency: frequency * 1.12,
      duration: 0.16,
      type: 'triangle',
      volume: 0.03,
      delay: index * 0.09,
    });
  });
}
