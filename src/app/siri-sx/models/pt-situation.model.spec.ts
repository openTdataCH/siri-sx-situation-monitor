import { PtSituation } from './pt-situation.model';

describe('PtSituation', () => {
  it('accepts a consequence without Severity', () => {
    const situation = PtSituation.initFromXml(`
      <PtSituationElement>
        <CreationTime>2026-09-04T08:00:00Z</CreationTime>
        <CountryRef>ch</CountryRef>
        <ParticipantRef>participant</ParticipantRef>
        <SituationNumber>situation-with-optional-consequence-severity</SituationNumber>
        <Version>1</Version>
        <Source>
          <CountryRef>ch</CountryRef>
          <SourceType>directReport</SourceType>
          <Name>Test source</Name>
        </Source>
        <VersionedAtTime>2026-09-04T08:00:00Z</VersionedAtTime>
        <Progress>published</Progress>
        <ValidityPeriod>
          <StartTime>2026-09-04T08:00:00Z</StartTime>
          <EndTime>2026-09-05T08:00:00Z</EndTime>
        </ValidityPeriod>
        <PublicationWindow>
          <StartTime>2026-09-04T08:00:00Z</StartTime>
          <EndTime>2026-09-05T08:00:00Z</EndTime>
        </PublicationWindow>
        <AlertCause>unknown</AlertCause>
        <Priority>1</Priority>
        <Consequences>
          <Consequence>
            <Condition>cancelled</Condition>
            <Affects />
          </Consequence>
        </Consequences>
        <PublishingActions>
          <PublishingAction>
            <PublishAtScope>
              <ScopeType>general</ScopeType>
            </PublishAtScope>
            <PassengerInformationAction>
              <PublicationWindow>
                <StartTime>2026-09-04T08:00:00Z</StartTime>
                <EndTime>2026-09-05T08:00:00Z</EndTime>
              </PublicationWindow>
              <ActionRef>action-1</ActionRef>
              <RecordedAtTime>2026-09-04T08:00:00Z</RecordedAtTime>
              <OwnerRef>owner-1</OwnerRef>
              ${textualContent('S')}
              ${textualContent('M')}
              ${textualContent('L')}
            </PassengerInformationAction>
          </PublishingAction>
        </PublishingActions>
      </PtSituationElement>
    `);

    expect(situation.consequences).toEqual([{
      conditions: ['cancelled'],
      severity: undefined,
      affects: []
    }]);
  });
});

function textualContent(size: 'S' | 'M' | 'L'): string {
  return `
    <TextualContent>
      <TextualContentSize>${size}</TextualContentSize>
      <SummaryContent>
        <SummaryText xml:lang="de">Test message</SummaryText>
      </SummaryContent>
    </TextualContent>
  `;
}
