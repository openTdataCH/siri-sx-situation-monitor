import { AffectsScopeDto } from './situation-affects.dto';
import { PtConsequencesDto, PublishingActionsDto } from './situation-actions.dto';
import {
  DefaultedTextDto,
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
 */
export interface PtSituationElementDto {
  creationTime: SiriDateTimeDto;
  countryRef: SiriReferenceDto;
  participantRef: SiriReferenceDto;
  situationNumber: SiriReferenceDto;
  updateCountryRef?: SiriReferenceDto;
  updateParticipantRef?: SiriReferenceDto;
  version?: number;

  source: SituationSourceDto;
  versionedAtTime?: SiriDateTimeDto;

  progress?: ProgressDto;
  qualityIndex?: string;
  reality?: string;

  validityPeriods: TimeIntervalDto[];
  publicationWindows: TimeIntervalDto[];

  alertCause?: string;
  unknownReason?: string;
  miscellaneousReason?: string;
  personnelReason?: string;
  equipmentReason?: string;
  environmentReason?: string;
  undefinedReason?: string;
  publicEventReason?: string;
  reasonName?: string;
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
