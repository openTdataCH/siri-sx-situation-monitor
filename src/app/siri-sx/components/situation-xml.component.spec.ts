import { TestBed } from '@angular/core/testing';
import { SituationXmlComponent, formatSituationXml } from './situation-xml.component';

describe('SituationXmlComponent', () => {
  it('indents XML while preserving mixed content, CDATA and preserved whitespace', () => {
    const xml = '<PtSituationElement xmlns="http://www.siri.org.uk/siri"><Text>A <b>bold</b> B &amp; C</Text><Data><![CDATA[<test>]]></Data><Space xml:space="preserve">  <x/>  </Space></PtSituationElement>';
    const formatted = formatSituationXml(xml);
    expect(formatted).toContain('\n  <Text');
    const document = new DOMParser().parseFromString(formatted, 'application/xml');
    expect(document.querySelector('parsererror')).toBeNull();
    expect(document.querySelector('Text')?.textContent).toBe('A bold B & C');
    expect(document.querySelector('Data')?.textContent).toBe('<test>');
    expect(document.querySelector('Space')?.textContent).toBe('    ');
  });

  it('copies and downloads the displayed XML using the current version', async () => {
    const fixture = TestBed.createComponent(SituationXmlComponent);
    fixture.componentRef.setInput('xml', '<PtSituationElement><Version>2</Version></PtSituationElement>');
    fixture.componentRef.setInput('situationId', 'ch:test/id');
    fixture.componentRef.setInput('version', 2);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const buttons = element.querySelectorAll<HTMLButtonElement>('button');
    const clipboard = spyOn(navigator.clipboard, 'writeText').and.resolveTo();
    buttons[0].click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(clipboard).toHaveBeenCalledWith(element.querySelector('code')!.textContent!);
    expect(element.textContent).toContain('XML copied.');
    let downloaded: Blob | undefined;
    spyOn(URL, 'createObjectURL').and.callFake((blob) => { downloaded = blob as Blob; return 'blob:test'; });
    const click = spyOn(HTMLAnchorElement.prototype, 'click');
    buttons[1].click();
    const anchor = click.calls.mostRecent().object as HTMLAnchorElement;
    expect(anchor.download).toBe('situation-ch_test_id-v2.xml');
    expect(await downloaded!.text()).toBe(element.querySelector('code')!.textContent!);
    fixture.componentRef.setInput('xml', '<PtSituationElement><Version>3</Version></PtSituationElement>');
    fixture.detectChanges();
    expect(element.textContent).not.toContain('XML copied.');
  });
});
