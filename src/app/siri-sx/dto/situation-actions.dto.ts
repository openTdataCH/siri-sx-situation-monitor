import { AffectsScopeDto } from './situation-affects.dto';
import {
  InfoLinkDto,
  NaturalLanguageStringDto,
  ScopeTypeDto,
  SeverityDto,
  SiriDateTimeDto,
  SiriReferenceDto,
  SituationConditionDto,
  TextualContentSizeDto,
  TimeIntervalDto
} from './situation-common.dto';

export interface PublishingActionsDto {
  actions: PublishingActionDto[];
}

export interface PublishingActionDto {
  publishAtScope?: PublishAtScopeDto;
  passengerInformationAction?: PassengerInformationActionDto;
}

export interface PublishAtScopeDto {
  scopeType: ScopeTypeDto;
  affects?: AffectsScopeDto;
}

export interface PassengerInformationActionDto {
  actionRef: SiriReferenceDto;
  recordedAtTime?: SiriDateTimeDto;
  ownerRef?: SiriReferenceDto;
  perspectives?: string[];
  publicationWindows?: TimeIntervalDto[];
  actionPriority?: number;
  version?: number;
  textualContent?: TextualContentDto[];
}

export interface TextualContentDto {
  textualContentSize: TextualContentSizeDto;
  summaryContent: TextPropertyContentDto;
  reasonContent?: TextPropertyContentDto;
  descriptionContent?: TextPropertyContentDto;
  consequenceContent?: TextPropertyContentDto;
  recommendationContent?: TextPropertyContentDto;
  durationContent?: TextPropertyContentDto;
  remarkContent?: TextPropertyContentDto;
  infoLinks?: InfoLinkDto[];
}

export interface TextPropertyContentDto {
  values: NaturalLanguageStringDto[];
}

export interface PtConsequencesDto {
  consequences: PtConsequenceDto[];
}

export interface PtConsequenceDto {
  period?: {
    startTime: SiriDateTimeDto;
    endTime?: SiriDateTimeDto;
  };
  conditions?: SituationConditionDto[];
  severity?: SeverityDto;
  affects?: AffectsScopeDto;
  advice?: NaturalLanguageStringDto[];
}
