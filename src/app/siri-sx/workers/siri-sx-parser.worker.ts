/// <reference lib="webworker" />

import { SaxesParser, SaxesTagNS } from 'saxes';

const SIRI_NAMESPACE = 'http://www.siri.org.uk/siri';

interface ParseRequest {
  type: 'parse';
  url: string;
}

addEventListener('message', ({ data }: MessageEvent<ParseRequest>) => {
  if (data.type === 'parse') {
    void parseResponse(data.url);
  }
});

async function parseResponse(url: string): Promise<void> {
  let situationCount = 0;
  let capturedXml = '';
  let captureDepth = 0;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`SIRI-SX request failed: ${response.status} ${response.statusText}`);
    }
    if (!response.body) {
      throw new Error('The browser did not provide a streaming response body.');
    }

    const parser = new SaxesParser({ xmlns: true });

    parser.on('opentag', (tag) => {
      const startsSituation = captureDepth === 0
        && tag.local === 'PtSituationElement'
        && tag.uri === SIRI_NAMESPACE;

      if (startsSituation) {
        capturedXml = '';
        captureDepth = 1;
        appendOpenTag(tag, true);
        return;
      }

      if (captureDepth > 0) {
        captureDepth += 1;
        appendOpenTag(tag, false);
      }
    });

    parser.on('text', (value) => {
      if (captureDepth > 0) capturedXml += escapeText(value);
    });

    parser.on('cdata', (value) => {
      if (captureDepth > 0) capturedXml += `<![CDATA[${value.replaceAll(']]>', ']]]]><![CDATA[>')}]]>`;
    });

    parser.on('closetag', (tag) => {
      if (captureDepth === 0) return;

      capturedXml += `</${tag.name}>`;
      captureDepth -= 1;

      if (captureDepth === 0) {
        situationCount += 1;
        postMessage({ type: 'situation', xml: capturedXml, index: situationCount });
        capturedXml = '';
      }
    });

    const appendOpenTag = (tag: SaxesTagNS, root: boolean): void => {
      capturedXml += `<${tag.name}`;
      const attributes = Object.values(tag.attributes);

      for (const attribute of attributes) {
        capturedXml += ` ${attribute.name}="${escapeAttribute(attribute.value)}"`;
      }

      if (root) {
        if (!attributes.some((attribute) => attribute.name === 'xmlns')) {
          capturedXml += ` xmlns="${SIRI_NAMESPACE}"`;
        }
        if (!attributes.some((attribute) => attribute.name === 'xmlns:xsi')) {
          capturedXml += ' xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"';
        }
        if (!attributes.some((attribute) => attribute.name === 'xmlns:xsd')) {
          capturedXml += ' xmlns:xsd="http://www.w3.org/2001/XMLSchema"';
        }
      }

      capturedXml += '>';
    };

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      parser.write(decoder.decode(value, { stream: true }));
    }

    parser.write(decoder.decode());
    parser.close();
    postMessage({ type: 'complete', count: situationCount });
  } catch (error: unknown) {
    postMessage({
      type: 'error',
      message: error instanceof Error ? error.message : 'Unknown SIRI-SX streaming error.'
    });
  }
}

function escapeText(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function escapeAttribute(value: string): string {
  return escapeText(value).replaceAll('"', '&quot;');
}
