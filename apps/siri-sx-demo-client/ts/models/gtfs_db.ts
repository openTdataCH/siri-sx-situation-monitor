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

export class GTFS_Trip {
    public trip_id: string
    public trip_short_name: string
    public route: GTFS_Route
    public stopTimes: GTFS_StopTime[]
    public departure: TripPointTime
    public arrival: TripPointTime

    constructor(
        trip_id: string,
        trip_short_name: string,
        route: GTFS_Route,
        stopTimes: GTFS_StopTime[],
        departure: TripPointTime,
        arrival: TripPointTime
    ) {
        this.trip_id = trip_id
        this.trip_short_name = trip_short_name
        this.route = route
        this.stopTimes = stopTimes
        this.departure = departure
        this.arrival = arrival
    }

    public static initWithTrip_Flat_JSON(tripJSON: Trip_Flat_JSON): GTFS_Trip | null {
        const agency: GTFS_Agency = {
            agency_id: tripJSON.agency_id,
            agency_name: tripJSON.agency_name,
        };

        const route: GTFS_Route = {
            route_id: tripJSON.route_id,
            route_short_name: tripJSON.route_short_name,
            agency: agency,
        };

        const tripDeparture: TripPointTime = {
            timeS: tripJSON.departure_time,
            timeMins: tripJSON.departure_day_minutes,
        }
        const tripArrival: TripPointTime = {
            timeS: tripJSON.arrival_time,
            timeMins: tripJSON.arrival_day_minutes,
        }

        const stopTimes: GTFS_StopTime[] = (() => {
            const items: GTFS_StopTime[] = [];
            tripJSON.stop_times_s.split(' -- ').forEach(stopTimeDataRow => {
                const stopTimeParts = stopTimeDataRow.split('|');

                const stop: GTFS_Stop = {
                    stop_id: stopTimeParts[0],
                    stop_name: 'n/a'
                }

                const arrS = stopTimeParts[1].trim();
                const depS = stopTimeParts[2].trim();

                const stopTime: GTFS_StopTime = {
                    stop: stop,
                    arrS: arrS === '' ? null : arrS,
                    depS: depS === '' ? null : depS,
                }

                items.push(stopTime);
            });

            return items;
        })();

        if (stopTimes.length < 2) {
            console.error('Broken stop_times');
            console.log(tripJSON);
            return null;
        }

        const trip = new GTFS_Trip(tripJSON.trip_id, tripJSON.trip_short_name, route, stopTimes, tripDeparture, tripArrival);
        
        return trip;
    }

}


