// We centralize here some code shared by multiple modules to reduce the size of the bundles

import {type Model} from "./State";

export const showDate = (date: Date, options: { showWeekDay?: boolean, timeZone?: string, showHour?: boolean }): string => {
  const formattedDate = date.toLocaleString(
    undefined,
    {
      weekday: (options.showWeekDay && 'short') || undefined,
      month: 'short',
      day: '2-digit',
      hour: (options.showHour !== undefined) ? (options.showHour ? '2-digit' : undefined) : '2-digit',
      minute: (options.showHour !== undefined) ? (options.showHour ? '2-digit' : undefined) : '2-digit',
      hour12: false,
      timeZone: options.timeZone
    }
  );
  return options.timeZone === 'UTC' ? `${formattedDate}Z` : formattedDate
}

export const showCoordinates = (lng: number, lat: number, model: Model): string => {
  const precision = model === 'gfs' ? 2 : 4;
  return `${lng >= 0 ? 'E' : 'W'}${Math.abs(lng).toFixed(precision)} ${lat >= 0 ? 'N' : 'S'}${Math.abs(lat).toFixed(precision)}`
}

export const xcFlyingPotentialLayerName = 'XC Flying Potential';

export const inversionStyle = '#d0a0e8';
