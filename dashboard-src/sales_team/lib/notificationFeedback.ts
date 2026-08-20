let audioContext: AudioContext | null = null;

function getAudioContext() {
  const AudioContextCtor = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextCtor) return null;
  audioContext ??= new AudioContextCtor();
  return audioContext;
}

export function playNotificationSound(urgent = false) {
  if (typeof window === 'undefined') return;

  try {
    const context = getAudioContext();
    if (!context) return;

    const start = context.currentTime;
    const tones = urgent ? [880, 660, 880] : [740, 940];

    tones.forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const toneStart = start + index * 0.12;

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(frequency, toneStart);
      gain.gain.setValueAtTime(0.0001, toneStart);
      gain.gain.exponentialRampToValueAtTime(0.16, toneStart + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, toneStart + 0.1);

      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(toneStart);
      oscillator.stop(toneStart + 0.11);
    });
  } catch {
    // Browsers can block audio before a user gesture. The visual badge still updates.
  }
}

