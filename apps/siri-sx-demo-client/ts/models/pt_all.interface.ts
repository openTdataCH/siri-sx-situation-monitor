export type TextualContentSizeEnum = 'small' | 'medium' | 'large'
export type LangEnum = 'de' | 'fr' | 'it' | 'en'

export interface PublishingAction {
    scopeType: string // TODO - use an enum?
    passengerInformation: PassengerInformationAction
}

export interface PassengerInformationAction {
    actionRef: string
    ownerRef: string
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
