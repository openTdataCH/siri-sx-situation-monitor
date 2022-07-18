# Embed Siri Response

This page explains how to integrate SIRI request and consume the response in an web IFRAME.

## URLs

https://tools.odpch.ch/siri-sx-poc/embed.html

- by default all `//PtSituationElement/` response nodes having a `//PassengerInformationAction/Perspective` of value `general` are shown
- the messages can be filtered also by `OwnerRef`, see below

## Query Parameters

| Param | Values | Default | Description |
|-|-|-|-|
| lang | `de`, `en`, `fr`, `it`  | `de` | Messages textual content language |
| text_size | `small`, `medium`, `large`  | `large` | Messages textual content text size |
| owner_refs | String |  | Comma separated strings of the `OwnerRef` |
| app_stage | `TEST`, `INT`  | `TEST` | Backend API configuration, `TEST` for `siri-sx_test`, `INT` for `siri-sx_int` API endpoints |

## Example Integration

- [link1 on TEST](https://tools.odpch.ch/siri-sx-poc/embed.html?app_stage=TEST&lang=fr&owner_refs=100626&text_size=medium) - messages in **french**, with text context size **medium**, for `OwnerRef` 100626

---

## Document Revisions

- 2022-07-18 - created first version