import { DateHelpers } from "../helpers/date-helpers"
import Logger from "../helpers/logger"
import { XPathHelpers } from "../helpers/xpath"
import { MapTextualContent, PublishingAction, TextualContent, TextualContentSizeEnum, TextualPropertyContent, TimeInterval, LangEnum } from "./pt_all.interface"
import PtSituationSource from "./pt_situation_source"

export default class PtSituationElement {
    public situationNumber: string
    public creationTime: Date 
    public countryRef: string 
    public participantRef: string 
    public version: number 
    public source: PtSituationSource
    public progress: string
    public validityPeriods: TimeInterval[]
    public alertCause: string
    public priority: number
    public publishingActions: PublishingAction[]
    public isPlanned: boolean
    
    public nodeXML: Node | null

    constructor(
        situationNumber: string, 
        creationTime: Date, 
        countryRef: string, 
        participantRef: string, 
        version: number, 
        source: PtSituationSource, 
        progress: string, 
        validityPeriods: TimeInterval[], 
        alertCause: string, 
        priority: number, 
        publishingActions: PublishingAction[],
        isPlanned: boolean
    ) {
        this.situationNumber = situationNumber
        this.creationTime = creationTime
        this.countryRef = countryRef
        this.participantRef = participantRef
        this.version = version
        this.source = source
        this.progress = progress
        this.validityPeriods = validityPeriods
        this.alertCause = alertCause
        this.priority = priority
        this.publishingActions = publishingActions
        this.isPlanned = isPlanned
        
        this.nodeXML = null;
    }

    public static initFromSituationNode(node: Node): PtSituationElement | null {
        const situationNumber = XPathHelpers.queryText('siri:SituationNumber', node);
        
        const creationTimeS = XPathHelpers.queryText('siri:CreationTime', node);
        if (creationTimeS === null) {
            Logger.logMessage('ERROR - creationTimeS is null', 'PtSituationElement.initFromSituationNode');
            Logger.log(node);
            return null;
        }
        const creationTime = new Date(creationTimeS);
        
        const countryRef = XPathHelpers.queryText('siri:CountryRef', node);
        const participantRef = XPathHelpers.queryText('siri:ParticipantRef', node);
        
        const versionS = XPathHelpers.queryText('siri:Version', node);
        if (versionS === null) {
            Logger.logMessage('ERROR - Version is NULL', 'PtSituationElement.initFromSituationNode');
            Logger.log(node);
            return null;
        }
        const version = parseInt(versionS)

        const situationSource = PtSituationSource.initFromSituationNode(node);

        const situationProgress = XPathHelpers.queryText('siri:Progress', node);

        const validityPeriods: TimeInterval[] = [];
        const validityPeriodNodes = XPathHelpers.queryNodes('siri:ValidityPeriod', node);
        validityPeriodNodes.forEach(validityPeriodNode => {
            const validityPeriodStartDateS = XPathHelpers.queryText('siri:StartTime', validityPeriodNode);
            const validityPeriodEndDateS = XPathHelpers.queryText('siri:EndTime', validityPeriodNode);
            if (!(validityPeriodStartDateS && validityPeriodEndDateS)) {
                return;
            }
            const validityPeriod: TimeInterval = {
                startDate: new Date(validityPeriodStartDateS),
                endDate: new Date(validityPeriodEndDateS)
            };
            validityPeriods.push(validityPeriod);
        });

        if (validityPeriods.length === 0) {
            console.error('initFromSituationNode: EMPTY <ValidityPeriod>')
            console.log(situationNumber);
            console.log(node);
            return null;            
        }

        const alertCause = XPathHelpers.queryText('siri:AlertCause', node);
        
        const situationPriorityS = XPathHelpers.queryText('siri:Priority', node);
        if (situationPriorityS === null) {
            Logger.logMessage('ERROR - Priority is NULL', 'PtSituationElement.initFromSituationNode');
            Logger.log(node);
            return null;
        }
        const situationPriority = parseInt(situationPriorityS)

        if (!(situationNumber && countryRef && participantRef && situationSource && situationProgress && alertCause)) {
            Logger.logMessage('ERROR - cant init', 'PtSituationElement.initFromSituationNode');
            Logger.log(node);
            return null;
        }

        const plannedS = XPathHelpers.queryText('siri:Planned', node);
        const isPlanned = plannedS === 'true';

        const publishingActions = PtSituationElement.computePublishingActionsFromSituationNode(situationNumber, node);

        const situationElement = new PtSituationElement(
            situationNumber, creationTime, countryRef, participantRef, version, situationSource, situationProgress, validityPeriods, alertCause, situationPriority, publishingActions, isPlanned,
        );
        situationElement.nodeXML = node;

        return situationElement;
    }

    public static initFromJSON(json: Record<string, any>): PtSituationElement | null {
        const situationNumber = json['situationNumber'] ?? null;
        
        const creationTime = DateHelpers.initDateFromString(json['creationTime']);
        if (creationTime === null) {
            return null;
        }

        const countryRef = json['countryRef'] ?? null;
        const participantRef = json['participantRef'] ?? null;

        const version = json['version'] ?? null;
        if (version === null) {
            return null;
        }

        const situationSource = PtSituationSource.initFromJSON(json['source'] ?? null);

        const situationProgress = json['progress'] ?? null;

        const validityPeriodsJSONo = json['validityPeriod'] ?? null;
        if (validityPeriodsJSONo === null) {
            return null;
        }

        const validityPeriodsJSON = validityPeriodsJSONo as Record<string, any>[];

        const validityPeriods: TimeInterval[] = [];
        validityPeriodsJSON.forEach(validityPeriodJSON  => {
            const validityPeriodStartDate = DateHelpers.initDateFromString(validityPeriodJSON['startDate']);
            const validityPeriodEndDate = DateHelpers.initDateFromString(validityPeriodJSON['endDate']);
            if (validityPeriodStartDate === null || validityPeriodEndDate === null) {
                return;
            }
            const validityPeriod: TimeInterval = {
                startDate: validityPeriodStartDate,
                endDate: validityPeriodEndDate,
            };

            validityPeriods.push(validityPeriod);
        });

        const alertCause = json['alertCause'] ?? null;

        const situationPriority = json['priority'] ?? null;
        if (situationPriority === null) {
            return null;
        }

        if (!(situationNumber && countryRef && participantRef && situationSource && situationProgress && alertCause)) {
            Logger.logMessage('ERROR - cant init', 'PtSituationElement.initFromJSON');
            Logger.log(json);
            return null;
        }

        const isPlanned = json['isPlanned'] ?? false;

        const publishingActionsList: Record<string, any>[] | null = json['publishingActions'] ?? null;
        if (publishingActionsList === null) {
            return null;
        }

        const publishingActions: PublishingAction[] = [];
        publishingActionsList.forEach(publishingActionJSON => {
            const publishingAction = PtSituationElement.initPublishingActionFromJSON(publishingActionJSON);
            if (publishingAction) {
                publishingActions.push(publishingAction);
            }
        });

        const situationElement = new PtSituationElement(
            situationNumber, creationTime, countryRef, participantRef, version, situationSource, situationProgress, validityPeriods, alertCause, situationPriority, publishingActions, isPlanned,
        );
        situationElement.nodeXML = null;

        return situationElement;
    }

    private static computePublishingActionsFromSituationNode(situationNumber: string, node: Node): PublishingAction[] {
        const publishingActions: PublishingAction[] = [];

        const publishingActionNodes = XPathHelpers.queryNodes('siri:PublishingActions/siri:PublishingAction', node);
        publishingActionNodes.forEach(publishingActionNode => {
            const publishingAction = PtSituationElement.computePublishingAction(situationNumber, publishingActionNode);
            if (publishingAction === null) {
                Logger.logMessage('ERROR - cant compute PublishingAction', 'PtSituationElement.initFromSituationNode');
                Logger.log(publishingActionNode);
                return;
            }

            publishingActions.push(publishingAction);
        });

        return publishingActions;
    }

    private static computePublishingAction(situationNumber: string, publishingActionNode: Node): PublishingAction | null {
        const infoActionNode = XPathHelpers.queryNode('siri:PassengerInformationAction', publishingActionNode);
        if (infoActionNode === null) {
            console.error('computePublishingAction: NO <PassengerInformationAction>');
            console.log(situationNumber);
            console.log(publishingActionNode);
            return null;
        }

        const actionRef = XPathHelpers.queryText('siri:ActionRef', infoActionNode)
        if (actionRef === null) {
            console.error('computePublishingAction: NULL actionRef');
            console.log(situationNumber);
            console.log(publishingActionNode);
            return null;
        }

        const ownerRef = XPathHelpers.queryText('siri:OwnerRef', infoActionNode);

        const scopeType = XPathHelpers.queryText('siri:PublishAtScope/siri:ScopeType', publishingActionNode) as ScopeType;
        if (scopeType === null) {
            console.error('computePublishingAction: NULL scopeType');
            console.log(situationNumber);
            console.log(publishingActionNode);
            return null;
        }

        const perspectives: string[] = [];
        const perspectiveNodes = XPathHelpers.queryNodes('siri:Perspective', infoActionNode)
        perspectiveNodes.forEach(perspectiveNode => {
            const perspectiveText = perspectiveNode.textContent;
            if (perspectiveText) {
                perspectives.push(perspectiveText);
            }
        });

        const mapTextualContent: MapTextualContent = {} as MapTextualContent;
        const textualContentNodes = XPathHelpers.queryNodes('siri:TextualContent', infoActionNode)
        textualContentNodes.forEach(textualContentNode => {
            const sizeKey: TextualContentSizeEnum | null = (() => {
                const sizeS = XPathHelpers.queryText('siri:TextualContentSize', textualContentNode);
                if (sizeS === 'S') {
                    return 'small'
                }
                if (sizeS === 'M') {
                    return 'medium'
                }
                if (sizeS === 'L') {
                    return 'large';
                }
                
                return null
            })();
            if (sizeKey === null) {
                Logger.logMessage('ERROR: cant compute size', 'computePublishingAction');
                Logger.log(textualContentNode);
                return;
            }

            const textualContentItem = PtSituationElement.computeTextualContent(textualContentNode);
            if (textualContentItem === null) {
                Logger.logMessage('ERROR: cant compute textual content', 'computePublishingAction');
                Logger.log(textualContentNode);
                return;
            }

            mapTextualContent[sizeKey] = textualContentItem;
        });


        const publishingAction = <PublishingAction>{
            scopeType: scopeType,
            passengerInformation: {
                actionRef: actionRef,
                ownerRef: ownerRef,
                perspectives: perspectives,
                mapTextualContent: mapTextualContent
            }
        }

        return publishingAction;
    }

    private static computeTextualContent(textualContentNode: Node): TextualContent | null {
        const summaryNode = XPathHelpers.queryNode('siri:SummaryContent', textualContentNode);
        if (summaryNode === null) {
            console.log('No SummaryText found');
            console.log(textualContentNode);
            return null;
        }

        const mapTextData: Record<string, TextualPropertyContent[]> = {};
        const childNodes = XPathHelpers.queryNodes('siri:*', textualContentNode);
        childNodes.forEach(childNode => {
            const childEl = childNode as Element;
            const textKey = childEl.tagName.replace('Content', '');

            // TextualContentSize doesnt have any text
            if (childEl.tagName === 'TextualContentSize') {
                return
            }

            if (!(textKey in mapTextData)) {
                mapTextData[textKey] = [];
            }

            const textPropertyContent = PtSituationElement.computeTextualPropertyContent(childNode);
            mapTextData[textKey].push(textPropertyContent);
        });

        const summaryTextContent = PtSituationElement.computeTextualPropertyContent(summaryNode);

        const textualContent: TextualContent = {
            summary: summaryTextContent,
            mapTextData: mapTextData
        }

        return textualContent;
    }

    private static computeTextualPropertyContent(textualPropertyContentNode: Node): TextualPropertyContent {
        const textPropertyData: TextualPropertyContent = {} as TextualPropertyContent;

        const textLangNodes = XPathHelpers.queryNodes('siri:*', textualPropertyContentNode);
            textLangNodes.forEach(textLangNode => {
                const langKey: LangEnum | null = (() => {
                    let langS = (textLangNode as Element).getAttribute('xml:lang');
                    if (langS === null) {
                        return null;
                    }

                    langS = langS.toLowerCase();
                    if (langS === 'de') {
                        return 'de'
                    }
                    if (langS === 'en') {
                        return 'en'
                    }
                    if (langS === 'fr') {
                        return 'fr'
                    }
                    if (langS === 'it') {
                        return 'it'
                    }

                    return null;
                })();
                if (langKey === null) {
                    return;
                }
                
                const textValue = textLangNode.textContent;
                textPropertyData[langKey] = textValue;
            });

        return textPropertyData
    }

    private static initPublishingActionFromJSON(json: Record<string, any>): PublishingAction | null {
        const scopeType = json['scopeType'] ?? null;
        if (scopeType === null) {
            return null;
        }

        const passengerInformationJSON: Record<string, any> = json['passengerInformation'] ?? null;
        if (passengerInformationJSON === null) {
            return null;
        }

        const actionRef = passengerInformationJSON['actionRef'] ?? null;
        const ownerRef = passengerInformationJSON['ownerRef'] ?? null;
        const perspectives: string[] = passengerInformationJSON['perspectives'] ?? null;

        const mapTextualContent: MapTextualContent = passengerInformationJSON['mapTextualContent'] ?? null;

        if (actionRef && ownerRef && perspectives && mapTextualContent) {
            const publishingAction = <PublishingAction>{
                scopeType: scopeType,
                passengerInformation: {
                    actionRef: actionRef,
                    ownerRef: ownerRef,
                    perspectives: perspectives,
                    mapTextualContent: mapTextualContent
                }
            }

            return publishingAction;
        }

        return null;
    }

    public isActive(date: Date = new Date()): boolean {
        const activePeriod = this.validityPeriods.find(el => {
            return (el.startDate < date) && (el.endDate > date);
        }) ?? null;

        return activePeriod !== null;
    }
}
