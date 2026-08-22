/** XML date/time values remain strings at the transport boundary. */
export type SiriDateTimeDto = string;

/** SIRI identifiers use several XML reference types but are transported as strings. */
export type SiriReferenceDto = string;

export interface NaturalLanguageStringDto {
  value: string;
  lang?: string;
}

export interface DefaultedTextDto extends NaturalLanguageStringDto {
  overridden?: boolean;
}

export interface TimeIntervalDto {
  startTime: SiriDateTimeDto;
  endTime?: SiriDateTimeDto;
}

export interface SituationSourceDto {
  countryRef?: SiriReferenceDto;
  sourceType?: SourceTypeDto;
  email?: string;
  phone?: string;
  name?: string;
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
  | 'open'
  | 'published'
  | 'closed'
  | 'closing'
  | (string & {});

export type SeverityDto =
  | 'unknown'
  | 'verySlight'
  | 'slight'
  | 'normal'
  | 'severe'
  | 'verySevere'
  | 'noImpact'
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
  | 'stopPoint'
  | 'vehicleJourney'
  | (string & {});

export type TextualContentSizeDto = 'S' | 'M' | 'L' | (string & {});

export type SituationConditionDto =
  | 'unknown'
  | 'altered'
  | 'cancelled'
  | 'delayed'
  | 'diverted'
  | 'disrupted'
  | 'additionalService'
  | 'normalService'
  | (string & {});
