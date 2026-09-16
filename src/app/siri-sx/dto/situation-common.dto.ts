/** XML date/time values remain strings at the transport boundary. */
export type SiriDateTimeDto = string;

/** SIRI identifiers use several XML reference types but are transported as strings. */
export type SiriReferenceDto = string;

export interface NaturalLanguageStringDto {
  value: string;
  lang?: string;
}

export interface DefaultedTextDto extends NaturalLanguageStringDto {
  lang: string;
  overridden?: boolean;
}

export interface HalfOpenTimeIntervalDto {
  startTime: SiriDateTimeDto;
  endTime?: SiriDateTimeDto;
}

export interface ClosedTimeIntervalDto {
  startTime: SiriDateTimeDto;
  endTime: SiriDateTimeDto;
}

export type TimeIntervalDto = HalfOpenTimeIntervalDto;

export interface SituationSourceDto {
  countryRef?: SiriReferenceDto;
  sourceType: SourceTypeDto;
  email?: string;
  phone?: string;
  name?: NaturalLanguageStringDto;
  timeOfCommunication?: SiriDateTimeDto;
  externalCode?: string;
}

export interface InfoLinkDto {
  uri: string;
  label?: NaturalLanguageStringDto[];
  linkContent?: LinkContentDto;
}

export type SourceTypeDto =
  | 'directReport'
  | 'email'
  | 'phone'
  | 'fax'
  | 'post'
  | 'feed'
  | 'radio'
  | 'tv'
  | 'web'
  | (string & {});

export type LinkContentDto =
  | 'timetable'
  | 'relatedSite'
  | 'details'
  | 'advice'
  | 'other'
  | (string & {});

export type ProgressDto =
  | 'draft'
  | 'pendingApproval'
  | 'approvedDraft'
  | 'open'
  | 'published'
  | 'closed'
  | 'closing'
  | (string & {});

export type SeverityDto =
  | 'pti26_0'
  | 'unknown'
  | 'pti26_1'
  | 'verySlight'
  | 'pti26_2'
  | 'slight'
  | 'pti26_3'
  | 'normal'
  | 'pti26_4'
  | 'severe'
  | 'pti26_5'
  | 'verySevere'
  | 'pti26_6'
  | 'noImpact'
  | 'pti26_255'
  | 'undefined'
  | (string & {});

export type ScopeTypeDto =
  | 'general'
  | 'operator'
  | 'network'
  | 'route'
  | 'line'
  | 'place'
  | 'stopPlace'
  | 'stopPlaceComponent'
  | 'stopPoint'
  | 'vehicleJourney'
  | 'datedVehicleJourney'
  | 'connectionLink'
  | 'interchange'
  | 'allPT'
  | 'road'
  | (string & {});

export type TextualContentSizeDto = 'S' | 'M' | 'L' | (string & {});

export type SituationConditionDto =
  | 'unknown'
  | 'delay'
  | 'minorDelays'
  | 'majorDelays'
  | 'operationTimeExtension'
  | 'onTime'
  | 'disturbanceRectified'
  | 'changeOfPlatform'
  | 'lineCancellation'
  | 'tripCancellation'
  | 'boarding'
  | 'goToGate'
  | 'stopCancelled'
  | 'stopMoved'
  | 'stopOnDemand'
  | 'additionalStop'
  | 'substitutedStop'
  | 'diverted'
  | 'disruption'
  | 'limitedOperation'
  | 'discontinuedOperation'
  | 'irregularTraffic'
  | 'wagonOrderChanged'
  | 'trainShortened'
  | 'additionalRide'
  | 'replacementRide'
  | 'temporarilyNonStopping'
  | 'temporaryStopplace'
  | 'undefinedStatus'
  | (string & {});
