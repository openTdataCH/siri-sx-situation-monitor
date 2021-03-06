# Embed SIRI SX Response

This page explains how to integrate SIRI request and consume the response in an web IFRAME.

## URLs

https://tools.odpch.ch/siri-sx-poc/embed.html

- by default all `//PtSituationElement/` response nodes having a `//PassengerInformationAction/Perspective` of value `general` are shown
- the messages can be filtered also by `OwnerRef`, see below
- sorting is done by unplanned messages first (using `Planned` node) then most recent messages to oldest (using `CreationTime` node)

## Query Parameters

All parameters are optional, the default values are used instead.

| Param | Values | Default | Description |
|-|-|-|-|
| lang | `de`, `en`, `fr`, `it`  | `de` | Messages textual content language |
| text_size | `small`, `medium`, `large`  | `large` | Messages textual content text size |
| owner_refs | String |  | Comma separated strings of the `OwnerRef`, i.e. `100602` for PostAuto. Full list: [Business Organisations](https://opentransportdata.swiss/en/dataset/goch) dataset.  |
| active | `1` |  | Show only active messages (based on `ValidityPeriod`) |
| app_stage | `TEST`, `INT`  | `TEST` | Backend API configuration, `TEST` for `siri-sx_test`, `INT` for `siri-sx_int` API endpoints |
| debug | `1`  |  | Debug flag to show more information about the messages and also provide a GUI to customise the parameters |

## Example Integration

- [link1 on TEST](https://tools.odpch.ch/siri-sx-poc/embed.html?app_stage=TEST&lang=fr&text_size=medium) - messages in **french** language, with text context size **medium**
- [link2 on TEST](https://tools.odpch.ch/siri-sx-poc/embed.html?app_stage=TEST&lang=fr&owner_refs=100602&text_size=medium) - messages in **french**, with text context size **medium**, for `OwnerRef` 100602

---

## Document Revisions

- 2022-07-21 - documented sorting, added `debug` param
- 2022-07-20 - added `active` query parameter
- 2022-07-18 - created first version