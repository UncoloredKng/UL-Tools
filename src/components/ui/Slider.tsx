"use client";

import type { CSSProperties } from "react";

interface SliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}

export function Slider({ label, value, onChange, min = 0, max = 10, step = 1 }: SliderProps) {
  const percent = ((value - min) / (max - min)) * 100;
  const style: CSSProperties & { "--range-progress"?: string } = {
    "--range-progress": `${percent}%`,
  };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <span className="rounded-md bg-accent-soft px-2 py-0.5 text-xs font-semibold text-accent">
          {value}/{max}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="slider-accent w-full"
        style={style}
        aria-label={label}
      />
    </div>
  );
}
