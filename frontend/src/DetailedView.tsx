import {LocationForecasts} from "./data/LocationForecasts";

export type DetailedView = Meteogram | Sounding | Summary
export type DetailedViewType = 'meteogram' | 'sounding' | 'summary'

export type Meteogram = {
  viewType: 'meteogram'
  locationForecasts: LocationForecasts
  latitude: number
  longitude: number
}

export type Sounding = {
  viewType: 'sounding'
  locationForecasts: LocationForecasts
  latitude: number
  longitude: number
}

type Summary = {
  viewType: 'summary'
  latitude: number
  longitude: number
}
