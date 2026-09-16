import { AffectsScopeDto } from './situation-affects.dto';
import { PtConsequencesDto, PublishingActionsDto } from './situation-actions.dto';
import {
  DefaultedTextDto,
  NaturalLanguageStringDto,
  InfoLinkDto,
  ProgressDto,
  ScopeTypeDto,
  SeverityDto,
  SiriDateTimeDto,
  SiriReferenceDto,
  SituationSourceDto,
  TimeIntervalDto
} from './situation-common.dto';

/**
 * Transport representation of a SIRI-SX 2.0 PtSituationElement.
 *
 * Property cardinality follows the XSD: optional elements use `?` and
 * repeatable elements use arrays. Values are not normalized for the UI here.
 *
 * Swiss SIRI-SX implementation references:
 * @see https://www.oev-info.ch/sites/default/files/2026-02/realization_guide_siri-sx_oev_schweiz_v1.1.pdf
 * @see https://www.oev-info.ch/de/branchenstandard/technische-standards/ereignisdaten
 */
export type PtSituationElementDto = PtSituationElementBaseDto & SituationReasonDto;

interface PtSituationElementBaseDto {
  creationTime: SiriDateTimeDto;
  countryRef?: SiriReferenceDto;
  participantRef: SiriReferenceDto;
  situationNumber: SiriReferenceDto;
  updateCountryRef?: SiriReferenceDto;
  updateParticipantRef?: SiriReferenceDto;
  version?: number;

  source: SituationSourceDto;
  versionedAtTime?: SiriDateTimeDto;

  progress: ProgressDto;
  qualityIndex?: string;
  reality?: string;

  validityPeriods: TimeIntervalDto[];
  publicationWindows?: TimeIntervalDto[];

  publicEventReason?: string;
  reasonNames?: NaturalLanguageStringDto[];
  severity?: SeverityDto;
  priority?: number;
  sensitivity?: string;
  audience?: string;
  scopeType?: ScopeTypeDto;
  reportType?: string;
  planned?: boolean;

  language?: string;
  summaries?: DefaultedTextDto[];
  descriptions?: DefaultedTextDto[];
  details?: DefaultedTextDto[];
  advice?: DefaultedTextDto[];
  internal?: DefaultedTextDto;
  infoLinks?: InfoLinkDto[];

  affects?: AffectsScopeDto;
  consequences?: PtConsequencesDto;
  publishingActions?: PublishingActionsDto;

  /** Vendor- or profile-specific extension content. */
  extensions?: unknown;
}

type SituationReasonField =
  | 'alertCause'
  | 'unknownReason'
  | 'miscellaneousReason'
  | 'personnelReason'
  | 'equipmentReason'
  | 'environmentReason'
  | 'undefinedReason';

export type SituationReasonDto = {
  [Field in SituationReasonField]:
    & Record<Field, string>
    & Partial<Record<Exclude<SituationReasonField, Field>, never>>;
}[SituationReasonField];
