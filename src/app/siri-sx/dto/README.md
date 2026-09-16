# SIRI-SX DTOs

This directory contains the XML transport types used to describe the SIRI-SX
data consumed by the application. The DTOs preserve XML-oriented values and
cardinality; conversion into dates and other UI-oriented values belongs in the
rich model layer.

## Sources

The active UMS integration XSD is the source of truth for element structure,
required and optional elements, cardinality, scalar types, and enumerations.
The Swiss realization guide and event-data page provide the implementation
context:

- [Realization Guide SIRI-SX ÖV Schweiz, version 1.1](https://www.oev-info.ch/sites/default/files/2026-02/realization_guide_siri-sx_oev_schweiz_v1.1.pdf)
- [ÖV-info.ch: Ereignisdaten](https://www.oev-info.ch/de/branchenstandard/technische-standards/ereignisdaten)

When examples or observed feeds differ from the active XSD, the XSD determines
whether a field is valid and whether it is required.

## Modeling conventions

- Optional XML elements use optional TypeScript properties.
- Repeatable XML elements use arrays.
- XML date and time values remain strings at the DTO boundary.
- Localized XML text retains its value and language.
- XML choices are represented with TypeScript unions where practical.
- Closed timestamp ranges require both start and end; half-open ranges allow an
  omitted end.
- Enum types list known XSD values while retaining the open-string fallback
  needed for extensions and forward compatibility.

These DTOs intentionally cover the SIRI-SX structures used by this application.
They are not a complete generated representation of every type in the full SIRI
2.0 schema.

All public DTO types are exported from [`index.ts`](./index.ts).
