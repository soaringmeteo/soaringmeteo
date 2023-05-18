// We centralize here some code shared by multiple modules to reduce the size of the bundles

export const showDate = (date: Date, options?: { showWeekDay?: boolean }): string =>
  date.toLocaleString(
    undefined,
    {
      weekday: (options && options.showWeekDay && 'short') || undefined,
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }
  )

export const xcFlyingPotentialLayerName = 'XC Flying Potential';

export const inversionStyle = '#d0a0e8';
