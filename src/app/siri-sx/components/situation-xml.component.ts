import { ChangeDetectionStrategy, Component, computed, effect, input, signal } from '@angular/core';

@Component({
  selector: 'app-situation-xml',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (xml() !== undefined) {
      <div class="d-flex flex-wrap flex-shrink-0 align-items-center gap-2 mb-3">
        <button type="button" class="btn btn-sm btn-outline-primary" (click)="copy()">Copy XML</button>
        <button type="button" class="btn btn-sm btn-outline-primary" (click)="download()">Download XML</button>
        <span class="small" role="status">{{ copyStatus() }}</span>
      </div>
      <pre class="border rounded bg-light p-3" tabindex="0" aria-label="Situation XML"><code>{{ formattedXml() }}</code></pre>
    } @else {
      <p class="text-secondary">Situation XML is unavailable. Reload the feed to capture it.</p>
    }
  `,
  styles: `
    :host { display: flex; flex-direction: column; flex: 1 1 0; min-width: 0; min-height: 0; }
    pre { flex: 1 1 0; min-height: 0; margin-bottom: 0; overflow: auto; font-size: .75rem; white-space: pre; }
  `
})
export class SituationXmlComponent {
  public readonly xml = input<string>();
  public readonly situationId = input.required<string>();
  public readonly version = input.required<number>();
  protected readonly formattedXml = computed(() => formatSituationXml(this.xml() ?? ''));
  protected readonly copyStatus = signal('');
  private readonly resetCopyStatus = effect(() => {
    this.xml();
    this.situationId();
    this.version();
    this.copyStatus.set('');
  });

  protected async copy(): Promise<void> {
    const xml = this.formattedXml();
    try {
      await navigator.clipboard.writeText(xml);
      if (this.formattedXml() === xml) this.copyStatus.set('XML copied.');
    } catch {
      if (this.formattedXml() === xml) this.copyStatus.set('Could not copy XML. Try Download XML.');
    }
  }

  protected download(): void {
    const blob = new Blob([this.formattedXml()], { type: 'application/xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const safeId = this.situationId().replace(/[^a-zA-Z0-9._-]/g, '_');
    link.href = url;
    link.download = `situation-${safeId}-v${this.version()}.xml`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

/** Indent element-only content, preserving mixed text, CDATA and xml:space. */
export function formatSituationXml(xml: string): string {
  const document = new DOMParser().parseFromString(xml, 'application/xml');
  if (document.querySelector('parsererror')) return xml;
  const indent = (element: Element, depth: number): void => {
    const children = Array.from(element.childNodes);
    const hasText = children.some((node) => node.nodeType === Node.CDATA_SECTION_NODE
      || (node.nodeType === Node.TEXT_NODE && !!node.textContent?.trim()));
    if (element.getAttribute('xml:space') === 'preserve' || hasText) return;
    const significant = children.filter((node) => node.nodeType !== Node.TEXT_NODE);
    if (significant.length === 0) return;
    for (const child of children) {
      if (child.nodeType === Node.TEXT_NODE) element.removeChild(child);
    }
    for (const child of significant) {
      element.insertBefore(document.createTextNode('\n' + '  '.repeat(depth + 1)), child);
      if (child.nodeType === Node.ELEMENT_NODE) indent(child as Element, depth + 1);
    }
    element.appendChild(document.createTextNode('\n' + '  '.repeat(depth)));
  };
  indent(document.documentElement, 0);
  return new XMLSerializer().serializeToString(document.documentElement);
}
