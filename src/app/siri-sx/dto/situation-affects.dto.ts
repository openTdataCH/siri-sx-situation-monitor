import { NaturalLanguageStringDto, SiriReferenceDto } from './situation-common.dto';

export interface AffectsScopeDto {
  allOperators?: boolean;
  operators?: AffectedOperatorDto[];
  networks?: AffectedNetworkDto[];
  stopPoints?: AffectedStopPointDto[];
  stopPlaces?: AffectedStopPlaceDto[];
  vehicleJourneys?: AffectedVehicleJourneyDto[];
  vehicles?: AffectedVehicleDto[];
}

export interface AffectedOperatorDto {
  operatorRef?: SiriReferenceDto;
  operatorNames?: NaturalLanguageStringDto[];
}

export interface AffectedNetworkDto {
  affectedOperators?: AffectedOperatorDto[];
  networkRef?: SiriReferenceDto;
  networkNames?: NaturalLanguageStringDto[];
  vehicleMode?: string;
  allLines?: boolean;
  lines?: AffectedLineDto[];
}

export interface AffectedLineDto {
  affectedOperators?: AffectedOperatorDto[];
  lineRef: SiriReferenceDto;
  publishedLineNames?: NaturalLanguageStringDto[];
  directions?: AffectedDirectionDto[];
  routes?: AffectedRouteDto[];
  stopPoints?: AffectedStopPointDto[];
  stopPlaces?: AffectedStopPlaceDto[];
}

export interface AffectedDirectionDto {
  directionRef: SiriReferenceDto;
  directionNames?: NaturalLanguageStringDto[];
}

export interface AffectedRouteDto {
  routeRef?: SiriReferenceDto;
  directions?: AffectedDirectionDto[];
}

export interface AffectedStopPlaceDto {
  stopPlaceRef: SiriReferenceDto;
  placeNames?: NaturalLanguageStringDto[];
  stopConditions?: string[];
}

export interface AffectedStopPointDto {
  stopPointRef?: SiriReferenceDto;
  stopPointNames?: NaturalLanguageStringDto[];
  location?: LocationDto;
  stopConditions?: string[];
}

export type LocationDto = Wgs84LocationDto | CoordinateLocationDto;

export interface Wgs84LocationDto {
  longitude: number;
  latitude: number;
  coordinates?: never;
}

export interface CoordinateLocationDto {
  coordinates: unknown;
  longitude?: never;
  latitude?: never;
}

export interface FramedVehicleJourneyRefDto {
  dataFrameRef: SiriReferenceDto;
  datedVehicleJourneyRef: SiriReferenceDto;
}

export interface AffectedVehicleJourneyDto {
  framedVehicleJourneyRef?: FramedVehicleJourneyRefDto;
  vehicleJourneyRefs?: SiriReferenceDto[];
  operator?: AffectedOperatorDto;
  lineRef?: SiriReferenceDto;
  publishedLineNames?: NaturalLanguageStringDto[];
  directionRef?: SiriReferenceDto;
  origins?: AffectedStopPointDto[];
  destinations?: AffectedStopPointDto[];
  calls?: AffectedCallDto[];
}

export interface AffectedCallDto {
  stopPointRef?: SiriReferenceDto;
  stopPlaceRef?: SiriReferenceDto;
  placeNames?: NaturalLanguageStringDto[];
  order?: number;
}

export interface AffectedVehicleDto {
  vehicleRef: SiriReferenceDto;
  vehicleRegistrationNumberPlates?: string[];
}
