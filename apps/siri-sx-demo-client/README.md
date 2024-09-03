# siri-sx-demo-client

This is a sample application to get started embedding SIRI SX Response, please refer to [Embed SIRI SX Response](../../docs/embed_siri.md) document for more information.

## URLs

https://tools.odpch.ch/siri-sx-poc/embed.html?debug=1

## Installation

- checkout this repo locally
- cd `./apps/siri-sx-demo-client`
- run `$ npm install`

## Local Develop

- if needed, update SIRI SX keys in [app_config.ts](./ts/config/app_config.ts)
- run `$ npm run tscw & npm run buildw`
- open `index.html` or `embed.html` in any browser (i.e. Chrome)
  - or use a webserver (i.e. Apache) to serve the current folder content (preffered method)

## Additional Resources

- [Service Interface for Real Time Information](https://en.wikipedia.org/wiki/Service_Interface_for_Real_Time_Information) wiki page
