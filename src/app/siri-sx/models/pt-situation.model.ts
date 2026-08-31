const SIRI_NAMESPACE = 'http://www.siri.org.uk/siri';
const XML_NAMESPACE = 'http://www.w3.org/XML/1998/namespace';

export type SupportedLanguage = 'de' | 'en' | 'fr' | 'it';
export type LocalizedText = Partial<Record<SupportedLanguage, string>>;
export type TextContentSize = 'small' | 'medium' | 'large';

export interface SituationSource {
  countryRef: string;
  sourceType: string;
  name: string;
  externalCode?: string;
}

export class PtSituation {
  private constructor(
    public readonly id: string,
    public readonly version: number,
    public readonly creationTime: Date,
    public readonly versionedAtTime: Date,
    public readonly countryRef: string,
    public readonly participantRef: string,
    public readonly source: SituationSource,
    public readonly progress: string,
    public readonly alertCause: string,
    public readonly priority: number,
    public readonly planned: boolean,
    public readonly validityPeriods: readonly TimeInterval[],
    public readonly publicationWindows: readonly TimeInterval[],
    public readonly publishingActions: readonly PublishingAction[],
    public readonly validationIssues: readonly PtSituationValidationIssue[],
    public readonly language?: string,
    public readonly scopeType?: string,
    public readonly severity?: string,
    public readonly summaries: LocalizedText = {},
    public readonly descriptions: LocalizedText = {},
    public readonly affects: readonly SituationAffect[] = [],
    public readonly consequences: readonly SituationConsequence[] = []
  ) {}

  /** Creates one model from XML containing exactly one PtSituationElement. */
  public static initFromXml(xml: string): PtSituation {
    const elements = this.parseSituationElements(xml);
    if (elements.length !== 1) {
      throw new Error(`Expected exactly one PtSituationElement, found ${elements.length}.`);
    }

    return this._initFromSchema(elements[0]);
  }

  public isActive(at: Date = new Date()): boolean {
    return this.validityPeriods.some((period) => period.contains(at));
  }

  public activePeriods(at: Date = new Date()): readonly TimeInterval[] {
    return this.validityPeriods.filter((period) => period.contains(at));
  }

  public summary(language: SupportedLanguage, fallback: SupportedLanguage = 'de'): string | undefined {
    return this.summaries[language]
      ?? this.summaries[fallback]
      ?? Object.values(this.summaries).find((value) => value !== undefined);
  }

  private static parseSituationElements(xml: string): Element[] {
    const document = new DOMParser().parseFromString(xml, 'application/xml');
    const parserError = document.getElementsByTagName('parsererror').item(0);
    if (parserError) {
      throw new Error(`Invalid SIRI-SX XML: ${parserError.textContent?.trim() ?? 'unknown parse error'}`);
    }

    if (document.documentElement.localName === 'PtSituationElement') {
      return [document.documentElement];
    }

    return Array.from(document.getElementsByTagNameNS(SIRI_NAMESPACE, 'PtSituationElement'));
  }

  /** Maps one schema-shaped XML element into a validated rich model. */
  private static _initFromSchema(element: Element): PtSituation {
    const validityPeriods = children(element, 'ValidityPeriod').map(parseTimeInterval);
    const publicationWindows = children(element, 'PublicationWindow').map(parseTimeInterval);
    const publishingActions = children(requiredChild(element, 'PublishingActions'), 'PublishingAction')
      .map(parsePublishingAction);
    const consequences = parseConsequences(optionalChild(element, 'Consequences'));

    requireNonEmpty(validityPeriods, 'ValidityPeriod');
    requireNonEmpty(publicationWindows, 'PublicationWindow');
    requireNonEmpty(publishingActions, 'PublishingAction');

    return new PtSituation(
      requiredText(element, 'SituationNumber'),
      requiredInteger(element, 'Version'),
      requiredDate(element, 'CreationTime'),
      requiredDate(element, 'VersionedAtTime'),
      requiredText(element, 'CountryRef'),
      requiredText(element, 'ParticipantRef'),
      parseSource(requiredChild(element, 'Source')),
      requiredText(element, 'Progress'),
      requiredText(element, 'AlertCause'),
      requiredInteger(element, 'Priority'),
      optionalBoolean(element, 'Planned') === true,
      validityPeriods,
      publicationWindows,
      publishingActions,
      collectValidationIssues(validityPeriods, publicationWindows, publishingActions),
      optionalText(element, 'Language')?.toLowerCase(),
      optionalText(element, 'ScopeType'),
      optionalText(element, 'Severity'),
      parseLocalizedChildren(element, 'Summary'),
      parseLocalizedChildren(element, 'Description'),
      optionalChild(element, 'Affects') ? parseAffects(requiredChild(element, 'Affects')) : [],
      consequences
    );
  }
}

export class TimeInterval {
  public constructor(
    public readonly start: Date,
    public readonly end: Date
  ) {}

  public get isChronologicallyValid(): boolean {
    return this.end >= this.start;
  }

  public contains(date: Date): boolean {
    return this.isChronologicallyValid && date >= this.start && date < this.end;
  }
}

export interface PtSituationValidationIssue {
  severity: 'error' | 'warning';
  code: 'INTERVAL_END_BEFORE_START';
  path: string;
  message: string;
}

export interface StopPlace {
  ref: string;
  name?: string;
}

export interface StopPoint {
  ref: string;
  name?: string;
}

export interface Line {
  ref: string;
  name: string;
  operatorRef: string;
}

export type SituationAffect =
  | { type: 'line'; line: Line }
  | { type: 'partial-line'; line: Line; directionRef?: string; stops: readonly StopPlace[] }
  | { type: 'stop-place'; stopPlace: StopPlace }
  | { type: 'stop-point'; stopPoint: StopPoint }
  | { type: 'vehicle-journey'; journey: VehicleJourney };

export interface VehicleJourney {
  dataFrameRef: string;
  datedVehicleJourneyRef: string;
  operatorRef: string;
  origin: StopPlace;
  destination: StopPlace;
  callStopRefs: readonly string[];
}

export interface SituationConsequence {
  conditions: readonly string[];
  severity: string;
  affects: readonly SituationAffect[];
}

export interface PublishingAction {
  actionRef: string;
  ownerRef: string;
  recordedAtTime: Date;
  scopeType: string;
  perspectives: readonly string[];
  publicationWindows: readonly TimeInterval[];
  actionPriority?: number;
  version?: number;
  content: Readonly<Partial<Record<TextContentSize, PassengerTextContent>>>;
  affects: readonly SituationAffect[];
}

export interface PassengerTextContent {
  summary: LocalizedText;
  reason: LocalizedText;
  description: LocalizedText;
  consequence: LocalizedText;
  recommendation: LocalizedText;
  duration: LocalizedText;
  remark: LocalizedText;
  infoLinks: readonly InfoLink[];
}

export interface InfoLink {
  uri: string;
  labels: LocalizedText;
}

function parseSource(element: Element): SituationSource {
  return {
    countryRef: requiredText(element, 'CountryRef'),
    sourceType: requiredText(element, 'SourceType'),
    name: requiredText(element, 'Name'),
    externalCode: optionalText(element, 'ExternalCode')
  };
}

function parseTimeInterval(element: Element): TimeInterval {
  return new TimeInterval(requiredDate(element, 'StartTime'), requiredDate(element, 'EndTime'));
}

function parsePublishingAction(element: Element): PublishingAction {
  const scope = requiredChild(element, 'PublishAtScope');
  const passengerInformation = requiredChild(element, 'PassengerInformationAction');
  const content: Partial<Record<TextContentSize, PassengerTextContent>> = {};

  for (const textualContent of children(passengerInformation, 'TextualContent')) {
    content[parseTextSize(requiredText(textualContent, 'TextualContentSize'))] = parsePassengerText(textualContent);
  }

  for (const size of ['small', 'medium', 'large'] as const) {
    if (!content[size]) {
      throw new Error(`PassengerInformationAction is missing ${size} TextualContent.`);
    }
  }

  return {
    actionRef: requiredText(passengerInformation, 'ActionRef'),
    ownerRef: requiredText(passengerInformation, 'OwnerRef'),
    recordedAtTime: requiredDate(passengerInformation, 'RecordedAtTime'),
    scopeType: requiredText(scope, 'ScopeType'),
    perspectives: children(passengerInformation, 'Perspective').map(textContent),
    publicationWindows: children(passengerInformation, 'PublicationWindow').map(parseTimeInterval),
    actionPriority: optionalInteger(passengerInformation, 'ActionPriority'),
    version: optionalInteger(passengerInformation, 'Version'),
    content,
    affects: optionalChild(scope, 'Affects') ? parseAffects(requiredChild(scope, 'Affects')) : []
  };
}

function parsePassengerText(element: Element): PassengerTextContent {
  return {
    summary: parseTextContainer(requiredChild(element, 'SummaryContent')),
    reason: parseOptionalTextContainer(element, 'ReasonContent'),
    description: parseOptionalTextContainer(element, 'DescriptionContent'),
    consequence: parseOptionalTextContainer(element, 'ConsequenceContent'),
    recommendation: parseOptionalTextContainer(element, 'RecommendationContent'),
    duration: parseOptionalTextContainer(element, 'DurationContent'),
    remark: parseOptionalTextContainer(element, 'RemarkContent'),
    infoLinks: children(element, 'InfoLink').map(parseInfoLink)
  };
}

function parseInfoLink(element: Element): InfoLink {
  return {
    uri: requiredText(element, 'Uri'),
    labels: parseLocalizedChildren(element, 'Label')
  };
}

function parseConsequences(container?: Element): readonly SituationConsequence[] {
  if (!container) {
    return [];
  }

  return children(container, 'Consequence').map((element) => ({
    conditions: children(element, 'Condition').map(textContent),
    severity: requiredText(element, 'Severity'),
    affects: optionalChild(element, 'Affects') ? parseAffects(requiredChild(element, 'Affects')) : []
  }));
}

function parseAffects(element: Element): readonly SituationAffect[] {
  const affects: SituationAffect[] = [];

  const stopPlaces = optionalChild(element, 'StopPlaces');
  if (stopPlaces) {
    for (const stop of children(stopPlaces, 'AffectedStopPlace')) {
      affects.push({ type: 'stop-place', stopPlace: parseStopPlace(stop) });
    }
  }

  const stopPoints = optionalChild(element, 'StopPoints');
  if (stopPoints) {
    for (const stop of children(stopPoints, 'AffectedStopPoint')) {
      affects.push({
        type: 'stop-point',
        stopPoint: {
          ref: requiredText(stop, 'StopPointRef'),
          name: optionalText(stop, 'StopPointName')
        }
      });
    }
  }

  const networks = optionalChild(element, 'Networks');
  if (networks) {
    for (const network of children(networks, 'AffectedNetwork')) {
      for (const lineElement of children(network, 'AffectedLine')) {
        const line = parseLine(lineElement);
        const lineStopsContainer = optionalChild(lineElement, 'StopPlaces');
        const lineStops = lineStopsContainer
          ? children(lineStopsContainer, 'AffectedStopPlace').map(parseStopPlace)
          : [];
        const directionRef = optionalText(optionalChild(lineElement, 'Direction'), 'DirectionRef');

        affects.push(lineStops.length > 0 || directionRef
          ? { type: 'partial-line', line, directionRef, stops: lineStops }
          : { type: 'line', line });
      }
    }
  }

  const journeysContainer = optionalChild(element, 'VehicleJourneys');
  if (journeysContainer) {
    for (const journey of children(journeysContainer, 'AffectedVehicleJourney')) {
      affects.push({ type: 'vehicle-journey', journey: parseVehicleJourney(journey) });
    }
  }

  return affects;
}

function parseLine(element: Element): Line {
  const operator = requiredChild(element, 'AffectedOperator');
  return {
    ref: requiredText(element, 'LineRef'),
    name: requiredText(element, 'PublishedLineName'),
    operatorRef: requiredText(operator, 'OperatorRef')
  };
}

function parseStopPlace(element: Element): StopPlace {
  return {
    ref: requiredText(element, 'StopPlaceRef'),
    name: optionalText(element, 'PlaceName')
  };
}

function parseVehicleJourney(element: Element): VehicleJourney {
  const framedRef = requiredChild(element, 'FramedVehicleJourneyRef');
  const operator = requiredChild(element, 'Operator');
  const calls = optionalChild(element, 'Calls');

  return {
    dataFrameRef: requiredText(framedRef, 'DataFrameRef'),
    datedVehicleJourneyRef: requiredText(framedRef, 'DatedVehicleJourneyRef'),
    operatorRef: requiredText(operator, 'OperatorRef'),
    origin: parseStopPlace(requiredChild(element, 'Origins')),
    destination: parseStopPlace(requiredChild(element, 'Destinations')),
    callStopRefs: calls
      ? children(calls, 'Call')
          .map((call) => optionalText(call, 'StopPlaceRef') ?? optionalText(call, 'StopPointRef'))
          .filter((ref): ref is string => ref !== undefined)
      : []
  };
}

function parseTextSize(value: string): TextContentSize {
  if (value === 'S') return 'small';
  if (value === 'M') return 'medium';
  if (value === 'L') return 'large';
  throw new Error(`Unsupported TextualContentSize: ${value}.`);
}

function parseOptionalTextContainer(parent: Element, name: string): LocalizedText {
  const container = optionalChild(parent, name);
  return container ? parseTextContainer(container) : {};
}

function parseTextContainer(container: Element): LocalizedText {
  const result: LocalizedText = {};
  for (const child of Array.from(container.children)) {
    addLocalizedValue(result, child);
  }
  return result;
}

function parseLocalizedChildren(parent: Element, name: string): LocalizedText {
  const result: LocalizedText = {};
  for (const element of children(parent, name)) {
    addLocalizedValue(result, element);
  }
  return result;
}

function addLocalizedValue(target: LocalizedText, element: Element): void {
  const language = element.getAttributeNS(XML_NAMESPACE, 'lang')?.toLowerCase();
  if (isSupportedLanguage(language)) {
    target[language] = textContent(element);
  }
}

function isSupportedLanguage(value: string | undefined): value is SupportedLanguage {
  return value === 'de' || value === 'en' || value === 'fr' || value === 'it';
}

function children(parent: Element, name: string): Element[] {
  return Array.from(parent.children).filter((element) => element.localName === name);
}

function optionalChild(parent: Element | undefined, name: string): Element | undefined {
  return parent ? children(parent, name)[0] : undefined;
}

function requiredChild(parent: Element, name: string): Element {
  const element = optionalChild(parent, name);
  if (!element) {
    throw new Error(`${parent.localName} is missing required ${name}.`);
  }
  return element;
}

function optionalText(parent: Element | undefined, name: string): string | undefined {
  const element = optionalChild(parent, name);
  return element ? textContent(element) : undefined;
}

function requiredText(parent: Element, name: string): string {
  const value = optionalText(parent, name);
  if (value === undefined || value.length === 0) {
    throw new Error(`${parent.localName}.${name} is required.`);
  }
  return value;
}

function textContent(element: Element): string {
  return element.textContent?.trim() ?? '';
}

function requiredInteger(parent: Element, name: string): number {
  const value = Number(requiredText(parent, name));
  if (!Number.isInteger(value)) {
    throw new Error(`${parent.localName}.${name} must be an integer.`);
  }
  return value;
}

function optionalInteger(parent: Element, name: string): number | undefined {
  const text = optionalText(parent, name);
  if (text === undefined) return undefined;
  const value = Number(text);
  if (!Number.isInteger(value)) {
    throw new Error(`${parent.localName}.${name} must be an integer.`);
  }
  return value;
}

function requiredDate(parent: Element, name: string): Date {
  const text = requiredText(parent, name);
  const value = new Date(text);
  if (Number.isNaN(value.getTime())) {
    throw new Error(`${parent.localName}.${name} is not a valid date/time.`);
  }
  return value;
}

function optionalBoolean(parent: Element, name: string): boolean | undefined {
  const value = optionalText(parent, name);
  if (value === undefined) return undefined;
  if (value === 'true' || value === '1') return true;
  if (value === 'false' || value === '0') return false;
  throw new Error(`${parent.localName}.${name} is not a valid boolean.`);
}

function requireNonEmpty<T>(values: readonly T[], name: string): void {
  if (values.length === 0) {
    throw new Error(`At least one ${name} is required.`);
  }
}

function collectValidationIssues(
  validityPeriods: readonly TimeInterval[],
  publicationWindows: readonly TimeInterval[],
  publishingActions: readonly PublishingAction[]
): readonly PtSituationValidationIssue[] {
  const issues: PtSituationValidationIssue[] = [];

  addIntervalIssues(issues, validityPeriods, 'validityPeriods');
  addIntervalIssues(issues, publicationWindows, 'publicationWindows');
  publishingActions.forEach((action, actionIndex) => {
    addIntervalIssues(
      issues,
      action.publicationWindows,
      `publishingActions[${actionIndex}].publicationWindows`
    );
  });
  return issues;
}

function addIntervalIssues(
  issues: PtSituationValidationIssue[],
  intervals: readonly TimeInterval[],
  path: string
): void {
  intervals.forEach((interval, index) => {
    if (!interval.isChronologicallyValid) {
      issues.push({
        severity: 'error',
        code: 'INTERVAL_END_BEFORE_START',
        path: `${path}[${index}]`,
        message: `End ${interval.end.toISOString()} precedes start ${interval.start.toISOString()}.`
      });
    }
  });
}
