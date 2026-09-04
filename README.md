# SIRI-SX Situation Monitor

Angular application for inspecting SIRI-SX situation messages and embedding the
passenger information published by one action owner.

The application downloads and parses SIRI-SX XML in a Web Worker so that large
feeds do not block the user interface. In PROD, the unplanned feed is parsed
before the planned feed. Invalid situations are kept separately for inspection.

## References

The DTOs and application model are based on the SIRI-SX schema used by the Swiss
public-transport implementation and the following official resources:

- [Realization Guide SIRI-SX ÖV Schweiz, version 1.1](https://www.oev-info.ch/sites/default/files/2026-02/realization_guide_siri-sx_oev_schweiz_v1.1.pdf)
- [ÖV-info.ch: Ereignisdaten](https://www.oev-info.ch/de/branchenstandard/technische-standards/ereignisdaten)

TypeScript developers can browse the
[SIRI-SX DTO definitions](https://github.com/openTdataCH/siri-sx-situation-monitor/tree/feature/v2/src/app/siri-sx/dto)
used by this application. They are application-scoped source definitions, not a
separately published npm package.

## Application pages

### Embedded message page (`/`)

The minimal, iframe-friendly message view. It has no application header or
footer and renders one card for every `PublishingAction` belonging to the owner
specified in the URL.

The feed is filtered by `OwnerRef` while it is streamed. Matching actions are
then checked against the parsed model before being displayed. Unplanned
situations have an **Unplanned** badge. The data is refreshed every minute.

An `owner` query parameter is required. Without it, the page displays an error.

### Setup and explorer (`/setup`)

The full SIRI-SX explorer used to find and preview messages. It provides:

- PROD and INT feed selection
- message and invalid-situation views
- filters for priority, operator, action owner, source, cause, scope and
  perspective
- language and passenger-text-size selection
- validation, active-now and unplanned filters
- free-text search
- situation, publishing-action, passenger-information and affected-entity
  details
- a **Preview messages** link beside each action owner

Preview links open `/` with the selected owner. Non-default stage, language and
text-size selections are included in the URL. Filters can be collapsed with the
caret on small screens.

## Embedding the message view

Hosted example:

```text
https://opentdatach.github.io/siri-sx/monitor/?owner=ch:1:sboid:100170
```

HTML iframe example:

```html
<iframe
  src="https://opentdatach.github.io/siri-sx/monitor/?owner=ch%3A1%3Asboid%3A100170&amp;lang=fr&amp;text_size=small"
  title="Passenger information"
  width="100%"
  height="600"
  loading="lazy"
></iframe>
```

### Query parameters

| Parameter | Required | Accepted values | Default | Description |
| --- | --- | --- | --- | --- |
| `owner` | Yes | A SIRI `OwnerRef`, for example `ch:1:sboid:100170` | None | Displays only publishing actions owned by this organisation. Missing or empty values produce an error. |
| `stage` | No | `prod`, `int` (case-insensitive) | `prod` | Selects the SIRI-SX environment. Invalid values produce an error. |
| `lang` | No | `de`, `en`, `fr`, `it` | `de` | Selects the localized passenger-information text. Missing or invalid values use German. |
| `text_size` | No | `small`, `medium`, `large` | `large` | Selects the passenger-information content size. Missing or invalid values use large. |

Default parameters may be omitted. For example, the following URLs are
equivalent:

```text
/?owner=ch:1:sboid:100170
/?owner=ch:1:sboid:100170&stage=prod&lang=de&text_size=large
```

## Local development

Install dependencies and start the development server:

```bash
npm install
npm start
```

The application is then available at:

```text
http://localhost:4200/
http://localhost:4200/setup
```

To preview a specific owner's messages locally:

```text
http://localhost:4200/?owner=ch:1:sboid:100170
```

## Build

```bash
npm run build
```
