export interface Trip_Flat {
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
    rows: Trip_Flat[],
}
