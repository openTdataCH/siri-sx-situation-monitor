export type TextualContentSizeEnum = 'small' | 'medium' | 'large'
export type LangEnum = 'de' | 'fr' | 'it' | 'en'
export type ScopeType = 'line' | 'stopPlace' | 'vehicleJourney'

interface NetworkOperator {
    operatorRef: string
}

export interface LineNetwork {
    operator: NetworkOperator
    lineRef: string
    publishedLineName: string
}

export interface AffectedLineNetworkWithStops {
    lineNetwork: LineNetwork
    directionRef: string
    stopPlaces: StopPlace[]
}

export interface StopPlace {
    stopPlaceRef: string
    placeName: string
}

export interface AffectedStopPlace {
    stopPlaceRef: string
    placeName: string | null
}

export interface FramedVehicleJourneyRef {
    dataFrameRef: string
    datedVehicleJourneyRef: string
}

export interface AffectedVehicleJourney {
    framedVehicleJourneyRef: FramedVehicleJourneyRef
    operator: NetworkOperator
    origin: AffectedStopPlace | null
    destination: AffectedStopPlace | null
    callStopsRef: string[]
    lineRef: string | null
    publishedLineName: string | null
}

export interface PublishingActionAffect {
    type: 'stop' | 'entire-line' | 'partial-line' | 'vehicle-journey'
    affect:  StopPlace | LineNetwork | AffectedLineNetworkWithStops | AffectedVehicleJourney
}

export interface PublishingAction {
    scopeType: ScopeType
    passengerInformation: PassengerInformationAction
}

export interface PassengerInformationAction {
    actionRef: string
    ownerRef: string | null
    perspectives: string[]
    mapTextualContent: MapTextualContent
}

export type MapTextualContent = Record<TextualContentSizeEnum, TextualContent>;

export type TextualPropertyContent = Record<LangEnum, string | null>

export interface TextualContent {
    summary: TextualPropertyContent,
    mapTextData: Record<string, TextualPropertyContent[]>
}

export interface TimeInterval {
    startDate: Date
    endDate: Date
}
