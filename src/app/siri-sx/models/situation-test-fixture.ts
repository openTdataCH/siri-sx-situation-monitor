export function situationXml(id = 'test-situation', version = 1): string {
  return `
      <PtSituationElement>
        <CreationTime>2026-09-04T08:00:00Z</CreationTime>
        <CountryRef>ch</CountryRef>
        <ParticipantRef>participant</ParticipantRef>
        <SituationNumber>${id}</SituationNumber>
        <Version>${version}</Version>
        <Source>
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
              
              
              <TextualContent><TextualContentSize>S</TextualContentSize><SummaryContent><SummaryText xml:lang="de">Test message</SummaryText></SummaryContent></TextualContent>
<TextualContent><TextualContentSize>M</TextualContentSize><SummaryContent><SummaryText xml:lang="de">Test message</SummaryText></SummaryContent></TextualContent>
<TextualContent><TextualContentSize>L</TextualContentSize><SummaryContent><SummaryText xml:lang="de">Test message</SummaryText></SummaryContent></TextualContent>
            </PassengerInformationAction>
          </PublishingAction>
        </PublishingActions>
      </PtSituationElement>
    `;
}
