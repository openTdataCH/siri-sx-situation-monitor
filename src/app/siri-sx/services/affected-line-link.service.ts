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
          line.affectedStopRefs.some((affectedStopId) => sameStop(stopId, affectedStopId))));
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

    const from = canonicalStopId(trip.stopIds[0]);
    const lastStop = canonicalStopId(trip.stopIds.at(-1)!);
    const defaultTo = lastStop === from ? trip.stopIds.at(-2) : lastStop;
    if (!defaultTo || sameStop(defaultTo, from)) {
      throw new Error('The selected GTFS trip has no destination distinct from its origin.');
    }
    const affectedTo = line.affectedStopRefs.find((stopId) => !sameStop(stopId, from));
    const originIsAffected = line.affectedStopRefs.some((stopId) => sameStop(stopId, from));
    const to = canonicalStopId(
      line.affectedStopRefs.length === 0 || originIsAffected
        ? defaultTo
        : affectedTo ?? defaultTo
    );
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

function sameStop(left: string, right: string): boolean {
  return canonicalStopId(left) === canonicalStopId(right);
}

function canonicalStopId(stopId: string): string {
  return /^(ch:[^:]+:sloid:[^:_]+)/.exec(stopId)?.[1] ?? stopId;
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
