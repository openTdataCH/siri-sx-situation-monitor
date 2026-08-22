import { SiriReferenceDto } from './situation-common.dto';

export interface AffectsScopeDto {
  operators?: AffectedOperatorDto[];
  networks?: AffectedNetworkDto[];
  stopPoints?: AffectedStopPointDto[];
  stopPlaces?: AffectedStopPlaceDto[];
  vehicleJourneys?: AffectedVehicleJourneyDto[];
  vehicles?: AffectedVehicleDto[];
}

export interface AffectedOperatorDto {
  operatorRef: SiriReferenceDto;
  operatorName?: string;
}

export interface AffectedNetworkDto {
  networkRef?: SiriReferenceDto;
  networkName?: string;
  vehicleMode?: string;
  allLines?: boolean;
  lines?: AffectedLineDto[];
}

export interface AffectedLineDto {
  affectedOperator?: AffectedOperatorDto;
  lineRef: SiriReferenceDto;
  publishedLineName?: string;
  direction?: AffectedDirectionDto;
  routes?: AffectedRouteDto[];
  stopPoints?: AffectedStopPointDto[];
  stopPlaces?: AffectedStopPlaceDto[];
  vehicleJourneys?: AffectedVehicleJourneyDto[];
}

export interface AffectedDirectionDto {
  directionRef?: SiriReferenceDto;
  directionName?: string[];
}

export interface AffectedRouteDto {
  routeRef: SiriReferenceDto;
  routeName?: string;
}

export interface AffectedStopPlaceDto {
  stopPlaceRef: SiriReferenceDto;
  placeName?: string;
  stopConditions?: string[];
}

export interface AffectedStopPointDto {
  stopPointRef: SiriReferenceDto;
  stopPointName?: string;
  location?: LocationDto;
  stopConditions?: string[];
}

export interface LocationDto {
  longitude?: number;
  latitude?: number;
}

export interface FramedVehicleJourneyRefDto {
  dataFrameRef: SiriReferenceDto;
  datedVehicleJourneyRef: SiriReferenceDto;
}

export interface AffectedVehicleJourneyDto {
  framedVehicleJourneyRef?: FramedVehicleJourneyRefDto;
  vehicleJourneyRef?: SiriReferenceDto;
  operator?: AffectedOperatorDto;
  lineRef?: SiriReferenceDto;
  publishedLineName?: string;
  directionRef?: SiriReferenceDto;
  origin?: AffectedStopPlaceDto;
  destination?: AffectedStopPlaceDto;
  calls?: AffectedCallDto[];
}

export interface AffectedCallDto {
  stopPointRef?: SiriReferenceDto;
  stopPlaceRef?: SiriReferenceDto;
  placeName?: string;
  order?: number;
}

export interface AffectedVehicleDto {
  vehicleRef: SiriReferenceDto;
  vehicleRegistrationNumber?: string;
}
