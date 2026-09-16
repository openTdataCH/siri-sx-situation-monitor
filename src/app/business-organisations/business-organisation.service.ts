import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { SupportedLanguage } from '../siri-sx/models';
import { BusinessOrganisation, BusinessOrganisationCsvRecord } from './business-organisation.model';

export const BUSINESS_ORGANISATIONS_URL =
  'https://tools.opentransportdata.swiss/data/actual_date_business_organisation_versions_LATEST.csv';

const CSV_FIELDS: readonly (keyof BusinessOrganisationCsvRecord)[] = [
  'sboid', 'said', 'validFrom', 'validTo', 'organisationNumber', 'status',
  'descriptionDe', 'descriptionFr', 'descriptionIt', 'descriptionEn',
  'abbreviationDe', 'abbreviationFr', 'abbreviationIt', 'abbreviationEn',
  'businessTypesId', 'businessTypesDe', 'businessTypesIt', 'businessTypesFr',
  'transportCompanyNumber', 'transportCompanyAbbreviation',
  'transportCompanyBusinessRegisterName', 'creationTime', 'editionTime'
];

@Injectable({ providedIn: 'root' })
export class BusinessOrganisationService {
  private readonly http = inject(HttpClient);
  private readonly organisationsState = signal<readonly BusinessOrganisation[]>([]);
  private readonly loadingState = signal(false);
  private readonly errorState = signal<string | undefined>(undefined);
  private loadPromise: Promise<void> | undefined;

  public readonly organisations = this.organisationsState.asReadonly();
  public readonly loading = this.loadingState.asReadonly();
  public readonly error = this.errorState.asReadonly();
  public readonly bySboid = computed(() => new Map(
    this.organisationsState().map((organisation) => [organisation.sboid, organisation])
  ));

  public load(): Promise<void> {
    if (this.loadPromise) return this.loadPromise;

    this.loadingState.set(true);
    this.errorState.set(undefined);
    this.loadPromise = firstValueFrom(this.http.get(BUSINESS_ORGANISATIONS_URL, { responseType: 'text' }))
      .then((csv) => {
        this.organisationsState.set(parseBusinessOrganisations(csv));
      })
      .catch((error: unknown) => {
        this.errorState.set(
          error instanceof Error ? error.message : 'Unable to load business organisations.'
        );
      })
      .finally(() => this.loadingState.set(false));

    return this.loadPromise;
  }

  public displayName(sboid: string, language: SupportedLanguage): string {
    const organisation = this.bySboid().get(sboid);
    if (!organisation) return sboid;
    const abbreviation = organisation.abbreviation(language);
    const description = organisation.description(language);
    return abbreviation && abbreviation !== description
      ? `${abbreviation} — ${description}`
      : description;
  }

  public shortName(sboid: string, language: SupportedLanguage): string {
    const organisation = this.bySboid().get(sboid);
    return organisation?.transportCompanyAbbreviation
      || organisation?.abbreviation(language)
      || sboid;
  }
}

export function parseBusinessOrganisations(csv: string): readonly BusinessOrganisation[] {
  const rows = parseDelimited(csv.replace(/^\uFEFF/, ''), ';');
  const header = rows.shift();
  if (!header || header.join(';') !== CSV_FIELDS.join(';')) {
    throw new Error('Unexpected business-organisation CSV header.');
  }

  return rows
    .filter((row) => row.some((value) => value.length > 0))
    .map((row, rowIndex) => {
      if (row.length !== CSV_FIELDS.length) {
        throw new Error(`Business-organisation CSV row ${rowIndex + 2} has ${row.length} columns; expected ${CSV_FIELDS.length}.`);
      }

      const record = Object.fromEntries(
        CSV_FIELDS.map((field, index) => [field, row[index]])
      ) as unknown as BusinessOrganisationCsvRecord;
      return BusinessOrganisation.initFromCsvRecord(record);
    });
}

function parseDelimited(input: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    if (char === '"') {
      if (quoted && input[index + 1] === '"') {
        field += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === delimiter && !quoted) {
      row.push(field);
      field = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && input[index + 1] === '\n') index += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }

  if (quoted) throw new Error('Business-organisation CSV contains an unterminated quoted field.');
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}
