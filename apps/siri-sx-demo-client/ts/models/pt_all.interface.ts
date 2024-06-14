export type TextualContentSizeEnum = 'small' | 'medium' | 'large'
export type LangEnum = 'de' | 'fr' | 'it' | 'en'
export type ScopeType = 'line' | 'stopPlace' | 'vehicleJourney'

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
