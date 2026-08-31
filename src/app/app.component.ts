import { ScrollingModule } from '@angular/cdk/scrolling';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, effect, inject, OnInit, signal } from '@angular/core';

import { BusinessOrganisationService } from './business-organisations';
import {
  AffectedJourneyView,
  AffectedLineView,
  AffectedStopView,
  InfoLink,
  LocalizedText,
  PassengerMessageView,
  PassengerTextContent,
  PtSituationListItem,
  SituationTemporalStatus,
  SupportedLanguage,
  TextContentSize,
  localizedValue
} from './siri-sx/models';
import { AffectedLineLinkService, PtSituationStore, SiriSxStreamService } from './siri-sx/services';

@Component({
  selector: 'app-siri-sx-browser',
  imports: [ScrollingModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppComponent implements OnInit {
  private readonly siriSxStream = inject(SiriSxStreamService);
  private readonly affectedLineLinks = inject(AffectedLineLinkService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly businessOrganisations = inject(BusinessOrganisationService);
  protected readonly store = inject(PtSituationStore);

  protected readonly title = 'SIRI-SX Browser';
  protected readonly parseState = signal<ParseState>({ status: 'idle' });
  protected readonly searchTerm = signal('');
  protected readonly language = signal<SupportedLanguage>('de');
  protected readonly messageSize = signal<TextContentSize>('large');
  protected readonly priorityFilter = signal<number | null>(null);
  protected readonly operatorFilter = signal('');
  protected readonly ownerFilter = signal('');
  protected readonly sourceFilter = signal('');
  protected readonly causeFilter = signal('');
  protected readonly scopeTypeFilter = signal('');
  protected readonly perspectiveCombinationFilter = signal('');
  protected readonly validationIssuesOnly = signal(false);
  protected readonly activeNowOnly = signal(false);
  protected readonly unplannedOnly = signal(false);
  protected readonly now = signal(new Date());
  protected readonly activeView = signal<'messages' | 'invalid'>('messages');
  protected readonly selectedAction = signal<ActionSelection | null>(null);
  protected readonly affectedLineLinkStates = signal<ReadonlyMap<string, AffectedLineLinkState>>(new Map());
  protected readonly invalidSituations = this.siriSxStream.invalidSituations;
  protected readonly contentSizes: readonly TextContentSize[] = ['large', 'medium', 'small'];

  protected readonly textFilteredItems = computed(() => {
    const query = this.searchTerm().trim().toLocaleLowerCase();
    const language = this.language();
    if (!query) return this.store.items();

    return this.store.items().filter((item) => [
      item.id,
      item.alertCause,
      item.source.name,
      item.source.externalCode,
      item.summary(language),
      item.description(language),
      ...item.affectedOperatorRefs,
      ...item.affectedOperatorRefs.map((ref) =>
        this.businessOrganisations.displayName(ref, language)
      ),
      ...item.messages.map((action) => action.ownerRef),
      ...item.messages.map((action) =>
        this.businessOrganisations.displayName(action.ownerRef, language)
      ),
      ...item.affectedLineNames,
      ...item.affectedStopNames
    ].some((value) => value?.toLocaleLowerCase().includes(query)));
  });

  protected readonly facetBaseItems = computed(() => {
    const now = this.now();
    return this.textFilteredItems().filter((item) =>
      (!this.validationIssuesOnly() || item.validationIssues.length > 0)
      && (!this.activeNowOnly() || item.temporalStatus(now) === 'active')
      && (!this.unplannedOnly() || !item.planned)
    );
  });

  protected readonly operatorFacetItems = computed(() => {
    const priority = this.priorityFilter();
    const owner = this.ownerFilter();
    const source = this.sourceFilter();
    const cause = this.causeFilter();
    const scopeType = this.scopeTypeFilter();
    const perspectiveCombination = this.perspectiveCombinationFilter();
    return this.facetBaseItems().filter((item) =>
      (priority === null || item.priority === priority)
      && (!owner || item.messages.some((action) => action.ownerRef === owner))
      && (!source || item.source.name === source)
      && (!cause || item.alertCause === cause)
      && (!scopeType || item.messages.some((action) => action.scopeType === scopeType))
      && (!perspectiveCombination || item.messages.some((action) =>
        this.perspectiveCombinationKey(action) === perspectiveCombination))
    );
  });

  protected readonly causeFacetItems = computed(() => {
    const priority = this.priorityFilter();
    const operator = this.operatorFilter();
    const owner = this.ownerFilter();
    const source = this.sourceFilter();
    const scopeType = this.scopeTypeFilter();
    const perspectiveCombination = this.perspectiveCombinationFilter();
    return this.facetBaseItems().filter((item) =>
      (priority === null || item.priority === priority)
      && (!operator || item.affectedOperatorRefs.includes(operator))
      && (!owner || item.messages.some((action) => action.ownerRef === owner))
      && (!source || item.source.name === source)
      && (!scopeType || item.messages.some((action) => action.scopeType === scopeType))
      && (!perspectiveCombination || item.messages.some((action) =>
        this.perspectiveCombinationKey(action) === perspectiveCombination))
    );
  });

  protected readonly scopeTypeFacetItems = computed(() => {
    const priority = this.priorityFilter();
    const operator = this.operatorFilter();
    const owner = this.ownerFilter();
    const source = this.sourceFilter();
    const cause = this.causeFilter();
    const perspectiveCombination = this.perspectiveCombinationFilter();
    return this.facetBaseItems().filter((item) =>
      (priority === null || item.priority === priority)
      && (!operator || item.affectedOperatorRefs.includes(operator))
      && (!owner || item.messages.some((action) => action.ownerRef === owner))
      && (!source || item.source.name === source)
      && (!cause || item.alertCause === cause)
      && (!perspectiveCombination || item.messages.some((action) =>
        this.perspectiveCombinationKey(action) === perspectiveCombination))
    );
  });

  protected readonly perspectiveCombinationFacetItems = computed(() => {
    const priority = this.priorityFilter();
    const operator = this.operatorFilter();
    const owner = this.ownerFilter();
    const source = this.sourceFilter();
    const cause = this.causeFilter();
    const scopeType = this.scopeTypeFilter();
    return this.facetBaseItems().filter((item) =>
      (priority === null || item.priority === priority)
      && (!operator || item.affectedOperatorRefs.includes(operator))
      && (!owner || item.messages.some((action) => action.ownerRef === owner))
      && (!source || item.source.name === source)
      && (!cause || item.alertCause === cause)
      && (!scopeType || item.messages.some((action) => action.scopeType === scopeType))
    );
  });

  protected readonly priorityFacetItems = computed(() => {
    const operator = this.operatorFilter();
    const owner = this.ownerFilter();
    const source = this.sourceFilter();
    const cause = this.causeFilter();
    const scopeType = this.scopeTypeFilter();
    const perspectiveCombination = this.perspectiveCombinationFilter();
    return this.facetBaseItems().filter((item) =>
      (!operator || item.affectedOperatorRefs.includes(operator))
      && (!owner || item.messages.some((action) => action.ownerRef === owner))
      && (!source || item.source.name === source)
      && (!cause || item.alertCause === cause)
      && (!scopeType || item.messages.some((action) => action.scopeType === scopeType))
      && (!perspectiveCombination || item.messages.some((action) =>
        this.perspectiveCombinationKey(action) === perspectiveCombination))
    );
  });

  protected readonly ownerFacetItems = computed(() => {
    const priority = this.priorityFilter();
    const operator = this.operatorFilter();
    const source = this.sourceFilter();
    const cause = this.causeFilter();
    const scopeType = this.scopeTypeFilter();
    const perspectiveCombination = this.perspectiveCombinationFilter();
    return this.facetBaseItems().filter((item) =>
      (priority === null || item.priority === priority)
      && (!operator || item.affectedOperatorRefs.includes(operator))
      && (!source || item.source.name === source)
      && (!cause || item.alertCause === cause)
      && (!scopeType || item.messages.some((action) => action.scopeType === scopeType))
      && (!perspectiveCombination || item.messages.some((action) =>
        this.perspectiveCombinationKey(action) === perspectiveCombination))
    );
  });

  protected readonly sourceFacetItems = computed(() => {
    const priority = this.priorityFilter();
    const operator = this.operatorFilter();
    const owner = this.ownerFilter();
    const cause = this.causeFilter();
    const scopeType = this.scopeTypeFilter();
    const perspectiveCombination = this.perspectiveCombinationFilter();
    return this.facetBaseItems().filter((item) =>
      (priority === null || item.priority === priority)
      && (!operator || item.affectedOperatorRefs.includes(operator))
      && (!owner || item.messages.some((action) => action.ownerRef === owner))
      && (!cause || item.alertCause === cause)
      && (!scopeType || item.messages.some((action) => action.scopeType === scopeType))
      && (!perspectiveCombination || item.messages.some((action) =>
        this.perspectiveCombinationKey(action) === perspectiveCombination))
    );
  });

  protected readonly priorityOptions = computed(() => {
    const counts = new Map<number, number>();
    for (const item of this.priorityFacetItems()) {
      counts.set(item.priority, (counts.get(item.priority) ?? 0) + 1);
    }

    return [...counts.entries()]
      .map(([priority, situationCount]) => ({ priority, situationCount }))
      .sort((left, right) => right.priority - left.priority);
  });

  protected readonly operatorOptions = computed(() => {
    const counts = new Map<string, number>();
    const language = this.language();
    for (const item of this.operatorFacetItems()) {
      for (const operator of new Set(item.affectedOperatorRefs)) {
        counts.set(operator, (counts.get(operator) ?? 0) + 1);
      }
    }

    return [...counts.entries()]
      .map(([ref, situationCount]) => ({
        ref,
        label: this.businessOrganisations.displayName(ref, language),
        situationCount
      }))
      .sort((left, right) => left.label.localeCompare(right.label, language));
  });

  protected readonly ownerOptions = computed(() => {
    const counts = new Map<string, number>();
    const language = this.language();
    for (const item of this.ownerFacetItems()) {
      for (const owner of new Set(item.messages.map((action) => action.ownerRef))) {
        counts.set(owner, (counts.get(owner) ?? 0) + 1);
      }
    }

    return [...counts.entries()]
      .map(([ref, situationCount]) => ({
        ref,
        label: this.businessOrganisations.displayName(ref, language),
        situationCount
      }))
      .sort((left, right) => left.label.localeCompare(right.label, language));
  });

  protected readonly sourceOptions = computed(() => {
    const counts = new Map<string, number>();
    for (const item of this.sourceFacetItems()) {
      counts.set(item.source.name, (counts.get(item.source.name) ?? 0) + 1);
    }

    return [...counts.entries()]
      .map(([name, situationCount]) => ({ name, situationCount }))
      .sort((left, right) => left.name.localeCompare(right.name));
  });

  protected readonly causeOptions = computed(() => {
    const counts = new Map<string, number>();
    for (const item of this.causeFacetItems()) {
      counts.set(item.alertCause, (counts.get(item.alertCause) ?? 0) + 1);
    }

    return [...counts.entries()]
      .map(([cause, situationCount]) => ({ cause, situationCount }))
      .sort((left, right) => left.cause.localeCompare(right.cause));
  });

  protected readonly scopeTypeOptions = computed(() => {
    const counts = new Map<string, number>();
    for (const item of this.scopeTypeFacetItems()) {
      for (const scopeType of new Set(item.messages.map((action) => action.scopeType))) {
        counts.set(scopeType, (counts.get(scopeType) ?? 0) + 1);
      }
    }

    return [...counts.entries()]
      .map(([scopeType, situationCount]) => ({ scopeType, situationCount }))
      .sort((left, right) => left.scopeType.localeCompare(right.scopeType));
  });

  protected readonly perspectiveCombinationOptions = computed(() => {
    const counts = new Map<string, number>();
    for (const item of this.perspectiveCombinationFacetItems()) {
      const combinations = new Set(
        item.messages.map((action) => this.perspectiveCombinationKey(action))
      );
      for (const combination of combinations) {
        counts.set(combination, (counts.get(combination) ?? 0) + 1);
      }
    }

    return [...counts.entries()]
      .map(([combination, situationCount]) => ({
        combination,
        label: this.perspectiveCombinationLabel(combination),
        situationCount
      }))
      .sort((left, right) => left.label.localeCompare(right.label));
  });

  protected readonly filteredItems = computed(() => {
    const priority = this.priorityFilter();
    const operator = this.operatorFilter();
    const owner = this.ownerFilter();
    const source = this.sourceFilter();
    const cause = this.causeFilter();
    const scopeType = this.scopeTypeFilter();
    const perspectiveCombination = this.perspectiveCombinationFilter();
    return this.facetBaseItems().filter((item) =>
      (priority === null || item.priority === priority)
      && (!operator || item.affectedOperatorRefs.includes(operator))
      && (!owner || item.messages.some((action) => action.ownerRef === owner))
      && (!source || item.source.name === source)
      && (!cause || item.alertCause === cause)
      && (!scopeType || item.messages.some((action) => action.scopeType === scopeType))
      && (!perspectiveCombination || item.messages.some((action) =>
        this.perspectiveCombinationKey(action) === perspectiveCombination))
    );
  });

  protected readonly resultRows = computed<SituationResultRow[]>(() =>
    this.filteredItems().map((situation) => ({
      kind: 'situation' as const,
      key: `situation:${situation.id}`,
      situation
    }))
  );

  protected readonly selectedActionView = computed(() => {
    const selection = this.selectedAction();
    if (!selection) return undefined;
    const situation = this.store.items().find((item) => item.id === selection.parentId);
    const action = situation?.messages[selection.actionIndex];
    return situation && action?.actionRef === selection.actionRef
      ? { situation, action }
      : undefined;
  });

  protected readonly detailMessages = computed(() => {
    const selectedAction = this.selectedActionView();
    return selectedAction ? [selectedAction.action] : (this.store.selected()?.messages ?? []);
  });

  protected readonly affectedJourneysToday = computed(() => {
    const item = this.store.selected();
    if (!item) return [];
    const today = this.formatDateKey(this.now());
    return item.affectedJourneys.filter((journey) => journey.dataFrameRef === today);
  });

  protected readonly affectedJourneysOtherDates = computed(() => {
    const item = this.store.selected();
    if (!item) return [];
    const today = this.formatDateKey(this.now());
    return item.affectedJourneys.filter((journey) => journey.dataFrameRef !== today);
  });

  private readonly synchronizeFilteredSelection = effect(() => {
    const items = this.filteredItems();
    const selectedId = this.store.selectedId();
    if (selectedId && items.some((item) => item.id === selectedId)) return;

    this.store.select(items[0]?.id ?? null);
    this.selectedAction.set(null);
  });

  public constructor() {
    const clock = setInterval(() => this.now.set(new Date()), 60_000);
    this.destroyRef.onDestroy(() => clearInterval(clock));
  }

  public ngOnInit(): void {
    void this.loadInitialData();
  }

  private async loadInitialData(): Promise<void> {
    await this.businessOrganisations.load();
    this.parseFeed();
  }

  protected parseFeed(): void {
    this.store.reset();
    this.activeView.set('messages');
    this.parseState.set({
      status: 'loading',
      situationCount: 0,
      invalidSituationCount: 0,
      validationIssueCount: 0
    });

    this.siriSxStream.streamSituations().subscribe({
      next: (event) => {
        if (event.type === 'situation') {
          this.store.enqueue(event.situation);
          this.parseState.update((state) => ({
            status: 'loading',
            situationCount: event.index,
            invalidSituationCount: state.invalidSituationCount ?? 0,
            validationIssueCount:
              (state.validationIssueCount ?? 0) + event.situation.validationIssues.length
          }));
        } else if (event.type === 'invalid-situation') {
          this.parseState.update((state) => ({
            ...state,
            status: 'loading',
            situationCount: event.invalid.index,
            invalidSituationCount: (state.invalidSituationCount ?? 0) + 1
          }));
        } else {
          this.store.flush();
          this.parseState.update((state) => ({
            status: 'success',
            situationCount: event.validCount,
            invalidSituationCount: event.invalidCount,
            validationIssueCount: state.validationIssueCount ?? 0
          }));
        }
      },
      error: (error: unknown) => {
        this.store.flush();
        this.parseState.set({
          status: 'error',
          message: error instanceof Error ? error.message : 'Unable to parse the SIRI-SX response.'
        });
      }
    });
  }

  protected updateSearch(event: Event): void {
    this.searchTerm.set((event.target as HTMLInputElement).value);
    this.reconcileFacetSelections();
  }

  protected updateLanguage(event: Event): void {
    this.language.set((event.target as HTMLSelectElement).value as SupportedLanguage);
  }

  protected updateMessageSize(event: Event): void {
    this.messageSize.set((event.target as HTMLSelectElement).value as TextContentSize);
  }

  protected updateOperator(event: Event): void {
    this.operatorFilter.set((event.target as HTMLSelectElement).value);
    this.reconcileFacetSelections();
  }

  protected updateOwner(event: Event): void {
    this.ownerFilter.set((event.target as HTMLSelectElement).value);
    this.reconcileFacetSelections();
  }

  protected updateSource(event: Event): void {
    this.sourceFilter.set((event.target as HTMLSelectElement).value);
    this.reconcileFacetSelections();
  }

  protected updatePriority(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.priorityFilter.set(value === '' ? null : Number(value));
    this.reconcileFacetSelections();
  }

  protected updateCause(event: Event): void {
    this.causeFilter.set((event.target as HTMLSelectElement).value);
    this.reconcileFacetSelections();
  }

  protected updateScopeType(event: Event): void {
    this.scopeTypeFilter.set((event.target as HTMLSelectElement).value);
    this.reconcileFacetSelections();
  }

  protected updatePerspectiveCombination(event: Event): void {
    this.perspectiveCombinationFilter.set((event.target as HTMLSelectElement).value);
    this.reconcileFacetSelections();
  }

  protected updateValidationIssuesOnly(event: Event): void {
    this.validationIssuesOnly.set((event.target as HTMLInputElement).checked);
    this.reconcileFacetSelections();
  }

  protected updateActiveNowOnly(event: Event): void {
    this.activeNowOnly.set((event.target as HTMLInputElement).checked);
    this.reconcileFacetSelections();
  }

  protected updateUnplannedOnly(event: Event): void {
    this.unplannedOnly.set((event.target as HTMLInputElement).checked);
    this.reconcileFacetSelections();
  }

  private reconcileFacetSelections(): void {
    for (let pass = 0; pass < 3; pass += 1) {
      let changed = false;
      const priority = this.priorityFilter();
      if (priority !== null
        && !this.priorityOptions().some((option) => option.priority === priority)) {
        this.priorityFilter.set(null);
        changed = true;
      }

      const operator = this.operatorFilter();
      if (operator && !this.operatorOptions().some((option) => option.ref === operator)) {
        this.operatorFilter.set('');
        changed = true;
      }

      const owner = this.ownerFilter();
      if (owner && !this.ownerOptions().some((option) => option.ref === owner)) {
        this.ownerFilter.set('');
        changed = true;
      }

      const source = this.sourceFilter();
      if (source && !this.sourceOptions().some((option) => option.name === source)) {
        this.sourceFilter.set('');
        changed = true;
      }

      const cause = this.causeFilter();
      if (cause && !this.causeOptions().some((option) => option.cause === cause)) {
        this.causeFilter.set('');
        changed = true;
      }

      const scopeType = this.scopeTypeFilter();
      if (scopeType
        && !this.scopeTypeOptions().some((option) => option.scopeType === scopeType)) {
        this.scopeTypeFilter.set('');
        changed = true;
      }

      const perspectiveCombination = this.perspectiveCombinationFilter();
      if (perspectiveCombination
        && !this.perspectiveCombinationOptions().some((option) =>
          option.combination === perspectiveCombination)) {
        this.perspectiveCombinationFilter.set('');
        changed = true;
      }

      if (!changed) return;
    }
  }

  protected operatorName(sboid: string): string {
    return this.businessOrganisations.displayName(sboid, this.language());
  }

  protected operatorAtlasUrl(sboid: string): string {
    return `https://atlas.app.sbb.ch/business-organisation-directory/business-organisations/${sboid}`;
  }

  protected operatorCodes(item: PtSituationListItem): string {
    return item.affectedOperatorRefs
      .map((sboid) => this.businessOrganisations.shortName(sboid, this.language()))
      .filter((value, index, values) => values.indexOf(value) === index)
      .join(', ');
  }

  protected actionOwnerCode(action: PassengerMessageView): string {
    return this.businessOrganisations.shortName(action.ownerRef, this.language());
  }

  protected actionOwnerRefs(item: PtSituationListItem): readonly string[] {
    return item.messages
      .map((action) => action.ownerRef)
      .filter((owner, index, owners) => owners.indexOf(owner) === index);
  }

  protected select(item: PtSituationListItem): void {
    this.store.select(item.id);
    this.selectedAction.set(null);
  }

  protected selectAction(row: PublishingActionResultRow): void {
    this.store.select(row.parentId);
    this.selectedAction.set({
      parentId: row.parentId,
      actionRef: row.action.actionRef,
      actionIndex: row.actionIndex
    });
  }

  protected summary(item: PtSituationListItem): string {
    return item.summary(this.language());
  }

  protected description(item: PtSituationListItem): string | undefined {
    return item.description(this.language());
  }

  protected localized(text: LocalizedText | undefined): string | undefined {
    return text ? localizedValue(text, this.language()) : undefined;
  }

  protected infoLinkLabel(link: InfoLink): string {
    return (this.localized(link.labels) ?? link.uri).replace(/<[^>]*>/g, '').trim();
  }

  protected messageContent(
    message: PassengerMessageView,
    size: TextContentSize
  ): PassengerTextContent | undefined {
    return message.content[size];
  }

  protected actionSummary(action: PassengerMessageView): string {
    for (const size of ['medium', 'small', 'large'] as const) {
      const summary = action.content[size]?.summary;
      const value = summary ? localizedValue(summary, this.language()) : undefined;
      if (value) return value;
    }
    return action.actionRef;
  }

  protected perspectiveCombinationKey(action: PassengerMessageView): string {
    return [...new Set(action.perspectives)].sort().join('|');
  }

  protected perspectiveCombinationLabel(combination: string): string {
    return combination.split('|').join(' + ');
  }

  protected situationPerspectives(item: PtSituationListItem): string {
    return [...new Set(item.messages.flatMap((action) => action.perspectives))].join(' · ');
  }

  protected isActionSelected(row: PublishingActionResultRow): boolean {
    const selected = this.selectedAction();
    return selected?.parentId === row.parentId
      && selected.actionRef === row.action.actionRef
      && selected.actionIndex === row.actionIndex;
  }

  protected temporalStatus(item: PtSituationListItem): SituationTemporalStatus {
    return item.temporalStatus(this.now());
  }

  protected temporalStatusLabel(status: SituationTemporalStatus): string {
    if (status === 'active') return 'Active now';
    if (status === 'upcoming') return 'Upcoming';
    if (status === 'expired') return 'Expired';
    return 'Invalid validity';
  }

  protected formatPeriod(periods: readonly { start: Date; end: Date }[]): string {
    if (periods.length === 0) return 'No period';
    const start = periods.reduce((value, period) => period.start < value ? period.start : value, periods[0].start);
    const end = periods.reduce((value, period) => period.end > value ? period.end : value, periods[0].end);
    return `${this.formatDateTime(start)} – ${this.formatDateTime(end)}`;
  }

  protected formatInterval(period: { start: Date; end: Date }): string {
    return `${this.formatDateTime(period.start)} – ${this.formatDateTime(period.end)}`;
  }

  protected affectedJourneyTripUrl(journey: AffectedJourneyView): string {
    const parameters = new URLSearchParams({
      from: journey.originRef,
      to: journey.destinationRef,
      trip_datetime: this.formatDateTime(journey.originAimedDepartureTime),
      lang: this.language(),
      do_search: 'yes'
    });
    return `https://opentdatach.github.io/ojp-demo-app/search?${parameters.toString()}`;
  }

  protected affectedJourneyDetailsUrl(journey: AffectedJourneyView): string {
    const parameters = new URLSearchParams({
      ref: journey.journeyRef,
      day: journey.dataFrameRef
    });
    return `https://opentdatach.github.io/ojp-demo-app/trip?${parameters.toString()}`;
  }

  protected affectedStopBoardUrl(stop: AffectedStopView, item: PtSituationListItem): string {
    const parameters = new URLSearchParams({
      stop_id: stop.ref,
      day: this.affectedObjectDay(item)
    });
    return `https://opentdatach.github.io/ojp-demo-app/board?${parameters.toString()}`;
  }

  protected affectedLineLinkState(
    item: PtSituationListItem,
    line: AffectedLineView
  ): AffectedLineLinkState | undefined {
    return this.affectedLineLinkStates().get(this.affectedLineKey(item, line));
  }

  protected async buildAffectedLineLink(
    item: PtSituationListItem,
    line: AffectedLineView
  ): Promise<void> {
    const key = this.affectedLineKey(item, line);
    this.setAffectedLineLinkState(key, { status: 'loading' });
    try {
      const url = await this.affectedLineLinks.build(
        line,
        item,
        this.affectedObjectDay(item),
        this.language(),
        this.now()
      );
      this.setAffectedLineLinkState(key, { status: 'ready', url });
    } catch (error: unknown) {
      this.setAffectedLineLinkState(key, {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unable to build the OJP link.'
      });
    }
  }

  private affectedLineKey(item: PtSituationListItem, line: AffectedLineView): string {
    return `${item.id}|${line.key}`;
  }

  private setAffectedLineLinkState(key: string, state: AffectedLineLinkState): void {
    this.affectedLineLinkStates.update((states) => {
      const updated = new Map(states);
      updated.set(key, state);
      return updated;
    });
  }

  private affectedObjectDay(item: PtSituationListItem): string {
    const now = this.now();
    const active = item.validityPeriods.find((period) => period.start <= now && now <= period.end);
    if (active) return this.formatDateKey(now);

    const next = item.validityPeriods.find((period) => period.start > now);
    const period = next ?? item.validityPeriods.at(-1);
    return this.formatDateKey(period?.start ?? now);
  }

  protected formatDateTime(date: Date): string {
    return `${this.formatDateKey(date)}`
      + ` ${this.datePart(date.getHours())}:${this.datePart(date.getMinutes())}`;
  }

  private formatDateKey(date: Date): string {
    return `${date.getFullYear()}-${this.datePart(date.getMonth() + 1)}-${this.datePart(date.getDate())}`;
  }

  private datePart(value: number): string {
    return value.toString().padStart(2, '0');
  }

  protected sharedValidityTime(
    periods: readonly { start: Date; end: Date }[]
  ): string | undefined {
    if (periods.length < 2) return undefined;
    const time = (date: Date): string => date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
    const start = time(periods[0].start);
    const end = time(periods[0].end);
    const isDailySequence = periods.every((period, index) => {
      if (index === 0) return true;
      const expected = new Date(periods[index - 1].start);
      expected.setDate(expected.getDate() + 1);
      return period.start.getFullYear() === expected.getFullYear()
        && period.start.getMonth() === expected.getMonth()
        && period.start.getDate() === expected.getDate();
    });
    return isDailySequence
      && periods.every((period) => time(period.start) === start && time(period.end) === end)
      ? `${start}–${end}`
      : undefined;
  }

  protected readonly trackItem = (_index: number, item: PtSituationListItem): string => item.id;
  protected readonly trackResultRow = (_index: number, row: SituationResultRow): string => row.key;
}

interface SituationParentResultRow {
  kind: 'situation';
  key: string;
  situation: PtSituationListItem;
}

interface PublishingActionResultRow {
  kind: 'publishing-action';
  key: string;
  parentId: string;
  situation: PtSituationListItem;
  action: PassengerMessageView;
  actionIndex: number;
}

type SituationResultRow = SituationParentResultRow | PublishingActionResultRow;

interface ActionSelection {
  parentId: string;
  actionRef: string;
  actionIndex: number;
}

interface ParseState {
  status: 'idle' | 'loading' | 'success' | 'error';
  situationCount?: number;
  invalidSituationCount?: number;
  validationIssueCount?: number;
  message?: string;
}

type AffectedLineLinkState =
  | { status: 'loading' }
  | { status: 'ready'; url: string }
  | { status: 'error'; message: string };
