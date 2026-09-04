import {
  InfoLink,
  LocalizedText,
  PassengerTextContent,
  PtSituation,
  PtSituationValidationIssue,
  SituationAffect,
  SituationConsequence,
  SituationSource,
  SupportedLanguage,
  TextContentSize,
  TimeInterval
} from './pt-situation.model';

export interface PassengerMessageView {
  actionRef: string;
  ownerRef: string;
  scopeType: string;
  perspectives: readonly string[];
  content: Readonly<Partial<Record<TextContentSize, PassengerTextContent>>>;
}

export interface AffectedJourneyView {
  key: string;
  dataFrameRef: string;
  journeyRef: string;
  originRef: string;
  originName: string;
  destinationRef: string;
  destinationName: string;
  originAimedDepartureTime: Date;
  destinationAimedArrivalTime: Date;
}

export interface AffectedStopView {
  ref: string;
  name: string;
}

export interface AffectedLineView {
  key: string;
  ref: string;
  name: string;
  operatorRef: string;
  affectedStopRefs: readonly string[];
}

export type SituationTemporalStatus = 'active' | 'upcoming' | 'expired' | 'invalid';

export class PtSituationListItem {
  private constructor(
    public readonly id: string,
    public readonly version: number,
    public readonly priority: number,
    public readonly planned: boolean,
    public readonly progress: string,
    public readonly alertCause: string,
    public readonly source: SituationSource,
    public readonly severity: string | undefined,
    public readonly validityPeriods: readonly TimeInterval[],
    public readonly publicationWindows: readonly TimeInterval[],
    public readonly summaries: LocalizedText,
    public readonly descriptions: LocalizedText,
    public readonly messages: readonly PassengerMessageView[],
    public readonly affectedOperatorRefs: readonly string[],
    public readonly affectedLines: readonly AffectedLineView[],
    public readonly affectedLineNames: readonly string[],
    public readonly affectedStops: readonly AffectedStopView[],
    public readonly affectedStopNames: readonly string[],
    public readonly affectedJourneys: readonly AffectedJourneyView[],
    public readonly affectedJourneyCount: number,
    public readonly consequences: readonly SituationConsequence[],
    public readonly consequenceCount: number,
    public readonly validationIssues: readonly PtSituationValidationIssue[]
  ) {}

  public static initFromSituation(situation: PtSituation): PtSituationListItem {
    const affects = collectAffects(situation);
    const lineNames = new Set<string>();
    const lines = new Map<string, AffectedLineView>();
    const operatorRefs = new Set<string>();
    const stops = new Map<string, AffectedStopView>();
    const journeys = new Map<string, AffectedJourneyView>();

    for (const affect of affects) {
      if (affect.type === 'line' || affect.type === 'partial-line') {
        lineNames.add(affect.line.name || affect.line.ref);
        operatorRefs.add(affect.line.operatorRef);
        const key = `${affect.line.operatorRef}|${affect.line.ref}|${affect.line.name}`;
        const existing = lines.get(key);
        const affectedStopRefs = affect.type === 'partial-line'
          ? affect.stops.map((stop) => stop.ref)
          : [];
        lines.set(key, {
          key,
          ref: affect.line.ref,
          name: affect.line.name || affect.line.ref,
          operatorRef: affect.line.operatorRef,
          affectedStopRefs: [...new Set([
            ...(existing?.affectedStopRefs ?? []),
            ...affectedStopRefs
          ])]
        });
      }
      if (affect.type === 'partial-line') {
        affect.stops.forEach((stop) => stops.set(stop.ref, { ref: stop.ref, name: stop.name || stop.ref }));
      }
      if (affect.type === 'stop-place') {
        stops.set(affect.stopPlace.ref, {
          ref: affect.stopPlace.ref,
          name: affect.stopPlace.name || affect.stopPlace.ref
        });
      }
      if (affect.type === 'stop-point') {
        stops.set(affect.stopPoint.ref, {
          ref: affect.stopPoint.ref,
          name: affect.stopPoint.name || affect.stopPoint.ref
        });
      }
      if (affect.type === 'vehicle-journey') {
        const key = `${affect.journey.dataFrameRef} · ${affect.journey.datedVehicleJourneyRef}`;
        journeys.set(key, {
          key,
          dataFrameRef: affect.journey.dataFrameRef,
          journeyRef: affect.journey.datedVehicleJourneyRef,
          originRef: affect.journey.origin.ref,
          originName: affect.journey.origin.name || affect.journey.origin.ref,
          destinationRef: affect.journey.destination.ref,
          destinationName: affect.journey.destination.name || affect.journey.destination.ref,
          originAimedDepartureTime: affect.journey.originAimedDepartureTime,
          destinationAimedArrivalTime: affect.journey.destinationAimedArrivalTime
        });
      }
    }

    return new PtSituationListItem(
      situation.id,
      situation.version,
      situation.priority,
      situation.planned,
      situation.progress,
      situation.alertCause,
      situation.source,
      situation.severity,
      situation.validityPeriods,
      situation.publicationWindows,
      situation.summaries,
      situation.descriptions,
      situation.publishingActions.map((action) => ({
        actionRef: action.actionRef,
        ownerRef: action.ownerRef,
        scopeType: action.scopeType,
        perspectives: action.perspectives,
        content: action.content
      })),
      [...operatorRefs],
      [...lines.values()],
      [...lineNames],
      [...stops.values()].sort((left, right) => left.name.localeCompare(right.name)),
      [...stops.values()].map((stop) => stop.name).sort(),
      [...journeys.values()],
      journeys.size,
      situation.consequences,
      situation.consequences.length,
      situation.validationIssues
    );
  }

  public summary(language: SupportedLanguage): string {
    return localizedValue(this.summaries, language)
      ?? this.messageText(language, 'summary')
      ?? this.id;
  }

  public description(language: SupportedLanguage): string | undefined {
    return localizedValue(this.descriptions, language)
      ?? this.messageText(language, 'description');
  }

  public temporalStatus(at: Date): SituationTemporalStatus {
    const validPeriods = this.validityPeriods.filter((period) => period.isChronologicallyValid);
    if (validPeriods.length === 0) return 'invalid';
    if (validPeriods.some((period) => period.contains(at))) return 'active';
    if (validPeriods.some((period) => period.start > at)) return 'upcoming';
    return 'expired';
  }

  private messageText(
    language: SupportedLanguage,
    property: keyof Pick<PassengerTextContent, 'summary' | 'description'>
  ): string | undefined {
    for (const message of this.messages) {
      for (const size of ['medium', 'small', 'large'] as const) {
        const value = message.content[size];
        const text = value ? localizedValue(value[property], language) : undefined;
        if (text) return text;
      }
    }
    return undefined;
  }
}

export function localizedValue(
  text: LocalizedText,
  language: SupportedLanguage,
  fallback: SupportedLanguage = 'de'
): string | undefined {
  return text[language]
    ?? text[fallback]
    ?? Object.values(text).find((value) => value !== undefined);
}

export function messageContentLinks(content: PassengerTextContent): readonly InfoLink[] {
  return content.infoLinks;
}

function collectAffects(situation: PtSituation): readonly SituationAffect[] {
  return [
    ...situation.affects,
    ...situation.publishingActions.flatMap((action) => action.affects),
    ...situation.consequences.flatMap((consequence) => consequence.affects)
  ];
}
