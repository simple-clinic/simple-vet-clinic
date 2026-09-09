"use client";

const particles: Record<string, string[]> = {
  snow: ["❄", "❅", "•"],
  rain: ["│", "╵"],
  autumn: ["🍂", "🍁"],
  spring: ["✿", "❀", "🌸"],
  ramadan: ["☾", "✦", "🏮"],
  christmas: ["❄", "✦", "🎄"],
};

export function AmbientEffects({
  effect,
  enabled,
  density,
  speed,
  opacity,
}: {
  effect: string;
  enabled: boolean;
  density: number;
  speed: number;
  opacity: number;
}) {
  if (!enabled || effect === "none" || !particles[effect]) return null;
  const set = particles[effect];
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[80] overflow-hidden"
    >
      {Array.from(
        { length: Math.min(60, Math.max(4, density)) },
        (_, index) => {
          const left = (index * 37) % 100;
          const delay = -((index * 1.7) % speed);
          const duration = speed * (0.7 + ((index * 13) % 9) / 20);
          return (
            <span
              key={index}
              className={`ambient-particle ambient-${effect}`}
              style={{
                left: `${left}%`,
                animationDelay: `${delay}s`,
                animationDuration: `${duration}s`,
                opacity,
                fontSize: `${14 + (index % 5) * 3}px`,
              }}
            >
              {set[index % set.length]}
            </span>
          );
        },
      )}
    </div>
  );
}
