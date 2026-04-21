interface LevelMeterProps {
  level: number // 0..1
  active: boolean
  bars?: number
}

/**
 * Live microphone-input visualisation. Each bar turns green in sequence as
 * the input level rises. Purely visual — tells a nervous grandparent
 * "yes, it's hearing you". Not calibrated.
 */
export function LevelMeter({ level, active, bars = 24 }: LevelMeterProps) {
  return (
    <div
      className="flex h-12 items-end justify-center gap-[3px]"
      aria-hidden
    >
      {Array.from({ length: bars }).map((_, i) => {
        const threshold = (i + 1) / bars
        const lit = active && level >= threshold * 0.85
        // Height climbs linearly with bar index so the meter looks like a
        // pair of wings rising out of centre.
        const distanceFromCenter = Math.abs(i - (bars - 1) / 2)
        const maxDistance = (bars - 1) / 2
        const heightFactor = 1 - distanceFromCenter / (maxDistance + 1)
        const heightPct = 25 + heightFactor * 75

        return (
          <div
            key={i}
            className={
              'w-[4px] rounded-sm transition-colors duration-75 ' +
              (lit ? 'bg-green-500' : 'bg-muted')
            }
            style={{ height: `${heightPct}%` }}
          />
        )
      })}
    </div>
  )
}
