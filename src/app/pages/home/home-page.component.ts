import { ChangeDetectionStrategy, Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';

import {
  InfoLink,
  LocalizedText,
  PassengerTextContent,
  PtSituation,
  PublishingAction,
  SupportedLanguage,
  TextContentSize,
  localizedValue
} from '../../siri-sx/models';
import { SiriSxStage, SiriSxStreamService } from '../../siri-sx/services';

@Component({
  selector: 'app-home-page',
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomePageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly stream = inject(SiriSxStreamService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly owner = this.route.snapshot.queryParamMap.get('owner')?.trim() ?? '';
  protected readonly language = queryLanguage(this.route.snapshot.queryParamMap.get('lang'));
  protected readonly textSize = queryTextSize(this.route.snapshot.queryParamMap.get('text_size'));
  protected readonly stage = queryStage(this.route.snapshot.queryParamMap.get('stage'));
  protected readonly loadingMessagesText = LOADING_MESSAGES_TEXT[this.language];
  protected readonly noMessagesText = NO_MESSAGES_TEXT[this.language];
  protected readonly messages = signal<readonly EmbeddedMessage[]>([]);
  protected readonly state = signal<EmbedState>(
    !this.owner
      ? { status: 'error', message: 'Missing required owner query parameter.' }
      : !this.stage
        ? { status: 'error', message: 'Invalid stage query parameter. Use prod or int.' }
        : { status: 'loading' }
  );

  public ngOnInit(): void {
    if (!this.owner || !this.stage) {
      return;
    }

    this.stream.streamSituations(this.owner, this.stage)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (event) => {
          if (event.type === 'situation') {
            this.appendOwnedMessages(event.situation);
          } else if (event.type === 'complete') {
            this.state.set({ status: 'complete' });
          }
        },
        error: (error: unknown) => this.state.set({
          status: 'error',
          message: error instanceof Error ? error.message : 'Unable to load SIRI-SX messages.'
        })
      });
  }

  protected content(message: EmbeddedMessage): PassengerTextContent | undefined {
    return message.action.content[this.textSize];
  }

  protected title(message: EmbeddedMessage): string {
    for (const size of ['small', 'medium', 'large'] as const) {
      const summary = message.action.content[size]?.summary;
      const value = summary ? localizedValue(summary, this.language) : undefined;
      if (value) return value;
    }
    return message.situation.id;
  }

  protected localized(text: LocalizedText): string | undefined {
    return localizedValue(text, this.language);
  }

  protected infoLinkLabel(link: InfoLink): string {
    return (this.localized(link.labels) ?? link.uri).replace(/<[^>]*>/g, '').trim();
  }

  private appendOwnedMessages(situation: PtSituation): void {
    const owned = situation.publishingActions
      .map((action, actionIndex) => ({ action, actionIndex }))
      .filter(({ action }) => action.ownerRef === this.owner)
      .map(({ action, actionIndex }) => ({
        key: `${situation.id}|${situation.version}|${action.actionRef}|${actionIndex}`,
        situation,
        action
      }));
    if (owned.length > 0) {
      this.messages.update((messages) => [...messages, ...owned]);
    }
  }
}

function queryStage(value: string | null): SiriSxStage | undefined {
  if (value === null || value.trim() === '') {
    return 'prod';
  }
  const stage = value.trim().toLowerCase();
  return stage === 'prod' || stage === 'int' ? stage : undefined;
}

interface EmbeddedMessage {
  key: string;
  situation: PtSituation;
  action: PublishingAction;
}

type EmbedState =
  | { status: 'loading' }
  | { status: 'complete' }
  | { status: 'error'; message: string };

function queryLanguage(value: string | null): SupportedLanguage {
  return value === 'de' || value === 'fr' || value === 'it' || value === 'en' ? value : 'de';
}

function queryTextSize(value: string | null): TextContentSize {
  return value === 'small' || value === 'medium' || value === 'large' ? value : 'large';
}

const NO_MESSAGES_TEXT: Readonly<Record<SupportedLanguage, string>> = {
  de: 'Keine Meldungen gefunden',
  en: 'No messages found',
  fr: 'Aucun message trouvé',
  it: 'Nessun messaggio trovato'
};

const LOADING_MESSAGES_TEXT: Readonly<Record<SupportedLanguage, string>> = {
  de: 'Meldungen werden geladen…',
  en: 'Loading messages…',
  fr: 'Chargement des messages…',
  it: 'Caricamento dei messaggi…'
};
