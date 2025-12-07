import React, { useEffect, useState } from 'react';

export const Snowfall: React.FC = () => {
  const [snowflakes, setSnowflakes] = useState<number[]>([]);

  useEffect(() => {
    // Generate static count of snowflakes to avoid re-renders impacting performance too much
    const flakes = Array.from({ length: 30 }, (_, i) => i);
    setSnowflakes(flakes);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
      {snowflakes.map((i) => {
        const left = `${Math.random() * 100}%`;
        const animationDelay = `${Math.random() * 10}s`;
        const animationDuration = `${Math.random() * 5 + 5}s`;
        const opacity = Math.random() * 0.5 + 0.3;
        
        return (
          <div
            key={i}
            className="snowflake absolute top-[-20px] text-white select-none"
            style={{
              left,
              animationDelay,
              animationDuration,
              opacity,
              fontSize: `${Math.random() * 1.5 + 0.5}rem`
            }}
          >
            ❄
          </div>
        );
      })}
    </div>
  );
};