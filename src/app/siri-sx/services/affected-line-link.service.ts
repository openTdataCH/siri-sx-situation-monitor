import { Injectable } from '@angular/core';

import { AffectedLineView, PtSituationListItem, SupportedLanguage } from '../models';

const GTFS_TRIPS_URL = 'https://tools.opentransportdata.swiss/gtfs-query/trips';
const OJP_SEARCH_URL = 'https://opentdatach.github.io/ojp-demo-app/search';

@Injectable({ providedIn: 'root' })
export class AffectedLineLinkService {
  public async build(
    line: AffectedLineView,
    situation: PtSituationListItem,
    serviceDay: string,
    language: SupportedLanguage,
    now: Date = new Date()
  ): Promise<string> {
    const query = new URLSearchParams({
      route_short_name: line.name,
      line_ref: line.ref,
      service_day: serviceDay
    });
    const response = await fetch(`${GTFS_TRIPS_URL}?${query.toString()}`);
    if (!response.ok) {
      throw new Error(`GTFS trip lookup failed (${response.status}).`);
    }

    const payload = await response.json() as GtfsTripsResponse;
    const trips = payload.rows
      .map(parseTrip)
      .filter((trip): trip is GtfsTrip => trip !== undefined)
      .sort((left, right) => left.departureDayMinutes - right.departureDayMinutes);
    if (trips.length === 0) {
      throw new Error('No GTFS trips found for this affected line and service day.');
    }

    const defaultTrip = trips[0];
    const matchingTrips = line.affectedStopRefs.length === 0
      ? trips
      : trips.filter((trip) => trip.stopIds.some((stopId) =>
          line.affectedStopRefs.includes(stopId.split(':')[0])));
    const candidateTrips = matchingTrips.length > 0 ? matchingTrips : trips;
    const validityPeriod = situation.validityPeriods.find((period) =>
      formatDateKey(period.start) === serviceDay) ?? situation.validityPeriods[0];
    const nowTime = formatTime(now);
    const validityStart = formatTime(validityPeriod.start);
    const validityEnd = formatTime(validityPeriod.end);
    const targetTime = nowTime < validityStart || nowTime > validityEnd
      ? validityStart
      : nowTime;
    const trip = candidateTrips.find((candidate) =>
      candidate.departureTime.substring(0, 5) >= targetTime) ?? defaultTrip;

    const from = trip.stopIds[0];
    const defaultTo = trip.stopIds.at(-1)!;
    const to = line.affectedStopRefs.length === 0 || line.affectedStopRefs.includes(from)
      ? defaultTo
      : line.affectedStopRefs[0];
    const parameters = new URLSearchParams({
      from,
      to,
      trip_datetime: `${serviceDay} ${normalizeGtfsTime(trip.departureTime)}`,
      lang: language,
      do_search: 'yes'
    });
    return `${OJP_SEARCH_URL}?${parameters.toString()}`;
  }
}

interface GtfsTripRow {
  departure_time: string;
  departure_day_minutes: number;
  stop_times_s: string;
}

interface GtfsTripsResponse {
  rows: readonly GtfsTripRow[];
}

interface GtfsTrip {
  departureTime: string;
  departureDayMinutes: number;
  stopIds: readonly string[];
}

function parseTrip(row: GtfsTripRow): GtfsTrip | undefined {
  const stopIds = row.stop_times_s
    .split(' -- ')
    .map((stopTime) => stopTime.split('|')[0]?.trim())
    .filter((stopId): stopId is string => Boolean(stopId));
  return stopIds.length >= 2
    ? {
        departureTime: row.departure_time,
        departureDayMinutes: row.departure_day_minutes,
        stopIds
      }
    : undefined;
}

function normalizeGtfsTime(value: string): string {
  const [hoursText, minutes = '00'] = value.split(':');
  const hours = Number(hoursText);
  return `${String(hours >= 24 ? hours - 24 : hours).padStart(2, '0')}:${minutes}`;
}

function formatDateKey(date: Date): string {
  return `${date.getFullYear()}-${datePart(date.getMonth() + 1)}-${datePart(date.getDate())}`;
}

function formatTime(date: Date): string {
  return `${datePart(date.getHours())}:${datePart(date.getMinutes())}`;
}

function datePart(value: number): string {
  return value.toString().padStart(2, '0');
}
