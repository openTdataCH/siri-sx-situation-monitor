import { AffectsScopeDto } from './situation-affects.dto';
import {
  InfoLinkDto,
  ClosedTimeIntervalDto,
  DefaultedTextDto,
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
  publishAtScope: PublishAtScopeDto;
  passengerInformationActions: PassengerInformationActionDto[];
}

export interface PublishAtScopeDto {
  scopeType: ScopeTypeDto;
  affects: AffectsScopeDto;
}

export interface PassengerInformationActionDto {
  actionRef: SiriReferenceDto;
  recordedAtTime: SiriDateTimeDto;
  sourceRef?: SiriReferenceDto;
  ownerRef?: SiriReferenceDto;
  perspectives: string[];
  publicationWindows?: ClosedTimeIntervalDto[];
  actionPriority?: number;
  version?: number;
  textualContent: TextualContentDto[];
}

export interface TextualContentDto {
  textualContentSize?: TextualContentSizeDto;
  summaryContent: TextPropertyContentDto;
  reasonContent?: TextPropertyContentDto;
  descriptionContents?: TextPropertyContentDto[];
  consequenceContents?: TextPropertyContentDto[];
  recommendationContents?: TextPropertyContentDto[];
  durationContent?: TextPropertyContentDto;
  remarkContents?: TextPropertyContentDto[];
  infoLinks?: InfoLinkDto[];
}

export interface TextPropertyContentDto {
  values: DefaultedTextDto[];
}

export interface PtConsequencesDto {
  consequences: PtConsequenceDto[];
}

export interface PtConsequenceDto {
  periods?: TimeIntervalDto[];
  conditions?: SituationConditionDto[];
  severity?: SeverityDto;
  affects?: AffectsScopeDto;
  advice?: PtAdviceDto;
}

export interface PtAdviceDto {
  adviceRef?: SiriReferenceDto;
  details?: NaturalLanguageStringDto[];
}
