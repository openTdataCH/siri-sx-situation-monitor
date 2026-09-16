import { SupportedLanguage } from '../siri-sx/models';

export type BusinessOrganisationStatus = 'VALIDATED' | 'IN_REVIEW' | 'REVOKED' | (string & {});

export interface BusinessOrganisationCsvRecord {
  sboid: string;
  said: string;
  validFrom: string;
  validTo: string;
  organisationNumber: string;
  status: string;
  descriptionDe: string;
  descriptionFr: string;
  descriptionIt: string;
  descriptionEn: string;
  abbreviationDe: string;
  abbreviationFr: string;
  abbreviationIt: string;
  abbreviationEn: string;
  businessTypesId: string;
  businessTypesDe: string;
  businessTypesIt: string;
  businessTypesFr: string;
  transportCompanyNumber: string;
  transportCompanyAbbreviation: string;
  transportCompanyBusinessRegisterName: string;
  creationTime: string;
  editionTime: string;
}

export class BusinessOrganisation {
  private constructor(
    public readonly sboid: string,
    public readonly said: number,
    public readonly validFrom: Date,
    public readonly validTo: Date,
    public readonly organisationNumber: number,
    public readonly status: BusinessOrganisationStatus,
    public readonly descriptions: Readonly<Record<SupportedLanguage, string>>,
    public readonly abbreviations: Readonly<Record<SupportedLanguage, string>>,
    public readonly businessTypeIds: readonly number[],
    public readonly businessTypeDescriptions: Readonly<Partial<Record<SupportedLanguage, string>>>,
    public readonly transportCompanyNumber: string | undefined,
    public readonly transportCompanyAbbreviation: string | undefined,
    public readonly transportCompanyBusinessRegisterName: string | undefined,
    public readonly creationTime: Date,
    public readonly editionTime: Date
  ) {}

  public static initFromCsvRecord(record: BusinessOrganisationCsvRecord): BusinessOrganisation {
    return new BusinessOrganisation(
      required(record.sboid, 'sboid'),
      integer(record.said, 'said'),
      date(record.validFrom, 'validFrom'),
      date(record.validTo, 'validTo'),
      integer(record.organisationNumber, 'organisationNumber'),
      required(record.status, 'status'),
      {
        de: record.descriptionDe,
        fr: record.descriptionFr,
        it: record.descriptionIt,
        en: record.descriptionEn
      },
      {
        de: record.abbreviationDe,
        fr: record.abbreviationFr,
        it: record.abbreviationIt,
        en: record.abbreviationEn
      },
      integerList(record.businessTypesId, 'businessTypesId'),
      {
        de: emptyToUndefined(record.businessTypesDe),
        fr: emptyToUndefined(record.businessTypesFr),
        it: emptyToUndefined(record.businessTypesIt)
      },
      emptyToUndefined(record.transportCompanyNumber),
      emptyToUndefined(record.transportCompanyAbbreviation),
      emptyToUndefined(record.transportCompanyBusinessRegisterName),
      date(record.creationTime, 'creationTime'),
      date(record.editionTime, 'editionTime')
    );
  }

  public description(language: SupportedLanguage): string {
    return this.descriptions[language] || this.descriptions.de || this.sboid;
  }

  public abbreviation(language: SupportedLanguage): string {
    return this.abbreviations[language] || this.abbreviations.de || this.sboid;
  }
}

function required(value: string, field: string): string {
  if (!value) throw new Error(`BusinessOrganisation.${field} is required.`);
  return value;
}

function integer(value: string, field: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) throw new Error(`BusinessOrganisation.${field} must be an integer.`);
  return parsed;
}

function integerList(value: string, field: string): readonly number[] {
  return value
    ? value.split(',').map((item) => integer(item.trim(), field))
    : [];
}

function date(value: string, field: string): Date {
  const normalized = value.includes(' ') && !value.includes('T') ? value.replace(' ', 'T') : value;
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) throw new Error(`BusinessOrganisation.${field} must be a date.`);
  return parsed;
}

function emptyToUndefined(value: string): string | undefined {
  return value || undefined;
}
