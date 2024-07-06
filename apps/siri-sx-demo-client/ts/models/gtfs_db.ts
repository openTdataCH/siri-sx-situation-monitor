export interface Trip_Flat_JSON {
    trip_id: string
    trip_short_name: string
    departure_time: string
    arrival_time: string
    departure_day_minutes: number
    arrival_day_minutes: number
    trip_headsign: string
    route_id: string
    route_type: number
    route_short_name: string
    agency_id: string
    agency_name: string
    stop_times_s: string
    day_bits: string
}

export interface GTFS_DB_Trips_Response {
    metadata: {
        gtfs_day: string,
        rows_no: number
    },
    rows: Trip_Flat_JSON[],
}

interface TripPointTime {
    timeS: string
    timeMins: number
}

interface GTFS_Stop {
    stop_id: string
    stop_name: string
}

interface GTFS_StopTime {
    stop: GTFS_Stop
    arrS: string | null
    depS: string | null
}

interface GTFS_Agency {
    agency_id: string
    agency_name: string
}

interface GTFS_Route {
    route_id: string
    route_short_name: string
    agency: GTFS_Agency
}
