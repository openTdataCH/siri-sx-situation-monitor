import Logger from "../helpers/logger"
import { XPathHelpers } from "../helpers/xpath"
import { MapTextualContent, PublishingAction, TextualContent, TextualContentSizeEnum, TextualPropertyContent, TimeInterval, LangEnum, ScopeType, PublishingActionAffect, LineNetwork, AffectedLineNetworkWithStops, StopPlace, AffectedVehicleJourney, AffectedStopPlace, FramedVehicleJourneyRef } from "./pt_all.interface"
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
        const situationNumber = XPathHelpers.queryText('SituationNumber', node);
        
        const creationTimeS = XPathHelpers.queryText('CreationTime', node);
        if (creationTimeS === null) {
            Logger.logMessage('ERROR - creationTimeS is null', 'PtSituationElement.initFromSituationNode');
            Logger.log(node);
            return null;
        }
        const creationTime = new Date(creationTimeS);
        
        const countryRef = XPathHelpers.queryText('CountryRef', node);
        const participantRef = XPathHelpers.queryText('ParticipantRef', node);
        
        const versionS = XPathHelpers.queryText('Version', node);
        if (versionS === null) {
            Logger.logMessage('ERROR - Version is NULL', 'PtSituationElement.initFromSituationNode');
            Logger.log(node);
            return null;
        }
        const version = parseInt(versionS)

        const situationSource = PtSituationSource.initFromSituationNode(node);

        const situationProgress = XPathHelpers.queryText('Progress', node);

        const validityPeriods: TimeInterval[] = [];
        const validityPeriodNodes = XPathHelpers.queryNodes('ValidityPeriod', node);
        validityPeriodNodes.forEach(validityPeriodNode => {
            const validityPeriodStartDateS = XPathHelpers.queryText('StartTime', validityPeriodNode);
            const validityPeriodEndDateS = XPathHelpers.queryText('EndTime', validityPeriodNode);
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

        const alertCause = XPathHelpers.queryText('AlertCause', node);
        
        const situationPriorityS = XPathHelpers.queryText('Priority', node);
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

        const plannedS = XPathHelpers.queryText('Planned', node);
        const isPlanned = plannedS === 'true';

        const publishingActions = PtSituationElement.computePublishingActionsFromSituationNode(situationNumber, node);

        const situationElement = new PtSituationElement(
            situationNumber, creationTime, countryRef, participantRef, version, situationSource, situationProgress, validityPeriods, alertCause, situationPriority, publishingActions, isPlanned,
        );
        situationElement.nodeXML = node;

        return situationElement;
    }

    private static computePublishingActionsFromSituationNode(situationNumber: string, node: Node): PublishingAction[] {
        const publishingActions: PublishingAction[] = [];

        const publishingActionNodes = XPathHelpers.queryNodes('PublishingActions/PublishingAction', node);
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
        const infoActionNode = XPathHelpers.queryNode('PassengerInformationAction', publishingActionNode);
        if (infoActionNode === null) {
            console.error('computePublishingAction: NO <PassengerInformationAction>');
            console.log(situationNumber);
            console.log(publishingActionNode);
            return null;
        }

        const actionRef = XPathHelpers.queryText('ActionRef', infoActionNode)
        if (actionRef === null) {
            console.error('computePublishingAction: NULL actionRef');
            console.log(situationNumber);
            console.log(publishingActionNode);
            return null;
        }

        const ownerRef = XPathHelpers.queryText('OwnerRef', infoActionNode);

        const scopeType = XPathHelpers.queryText('PublishAtScope/ScopeType', publishingActionNode) as ScopeType;
        if (scopeType === null) {
            console.error('computePublishingAction: NULL scopeType');
            console.log(situationNumber);
            console.log(publishingActionNode);
            return null;
        }

        const perspectives: string[] = [];
        const perspectiveNodes = XPathHelpers.queryNodes('Perspective', infoActionNode)
        perspectiveNodes.forEach(perspectiveNode => {
            const perspectiveText = perspectiveNode.textContent;
            if (perspectiveText) {
                perspectives.push(perspectiveText);
            }
        });

        const mapTextualContent: MapTextualContent = {} as MapTextualContent;
        const textualContentNodes = XPathHelpers.queryNodes('TextualContent', infoActionNode)
        textualContentNodes.forEach(textualContentNode => {
            const sizeKey: TextualContentSizeEnum | null = (() => {
                const sizeS = XPathHelpers.queryText('TextualContentSize', textualContentNode);
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

        const actionAffects = PtSituationElement.computeAffects(situationNumber, scopeType, publishingActionNode);

        const publishingAction: PublishingAction = {
            scopeType: scopeType,
            affects: actionAffects,
            passengerInformation: {
                actionRef: actionRef,
                ownerRef: ownerRef,
                perspectives: perspectives,
                mapTextualContent: mapTextualContent
            },
        }

        return publishingAction;
    }

    private static computeAffects(situationNumber: string, scopeType: ScopeType, publishingActionNode: Node): PublishingActionAffect[] {
        const actionAffects: PublishingActionAffect[] = [];

        const affectedLineNetworkNodes = XPathHelpers.queryNodes('PublishAtScope/Affects/Networks/AffectedNetwork/AffectedLine', publishingActionNode);
        affectedLineNetworkNodes.forEach(affectedLineNetworkNode => {
            const lineNetwork = PtSituationElement.computeLineNetwork(affectedLineNetworkNode);
            if (lineNetwork === null) {
                return
            }

            if (scopeType === 'line') {
                actionAffects.push({
                    type: 'entire-line',
                    affect: lineNetwork
                });
            }

            if (scopeType === 'stopPlace') {
                const directionRef = XPathHelpers.queryText('Direction/DirectionRef', affectedLineNetworkNode) ?? 'n/a';

                const stopPlacesNodes = XPathHelpers.queryNodes('StopPlaces/AffectedStopPlace', affectedLineNetworkNode);
                const stopPlaces = PtSituationElement.computeAffectedStopPlaces(stopPlacesNodes);

                const affectedPartialLine: AffectedLineNetworkWithStops = {
                    lineNetwork: lineNetwork,
                    directionRef: directionRef,
                    stopPlaces: stopPlaces,
                }

                actionAffects.push({
                    type: 'partial-line',
                    affect: affectedPartialLine
                });
            }
        });

        if (scopeType === 'stopPlace') {
            const stopPlacesNodes = XPathHelpers.queryNodes('PublishAtScope/Affects/StopPlaces/AffectedStopPlace', publishingActionNode);
            const stopPlaces = PtSituationElement.computeAffectedStopPlaces(stopPlacesNodes)
            stopPlaces.forEach(stopPlace => {
                actionAffects.push({
                    type: 'stop',
                    affect: stopPlace
                });
            });
        }

        if (scopeType === 'vehicleJourney') {
            const affectedVehicleJourneys = PtSituationElement.computeAffectedJourneys(situationNumber, publishingActionNode);
            affectedVehicleJourneys.forEach(affectedVehicleJourney => {
                actionAffects.push({
                    type: 'vehicle-journey',
                    affect: affectedVehicleJourney
                });
            });
        }

        if (actionAffects.length === 0) {
            console.error('computeAffects: EMPTY affects?');
            console.log(situationNumber);
            console.log(publishingActionNode);
        } else {
            if (scopeType === 'vehicleJourney') {
                // debugger;
            }
        }

        return actionAffects;
    }

    private static computeLineNetwork(lineNetworkNode: Node): LineNetwork | null {
        const operatorRef = XPathHelpers.queryText('AffectedOperator/OperatorRef', lineNetworkNode);
        const lineRef = XPathHelpers.queryText('LineRef', lineNetworkNode);
        const publishedLineName = XPathHelpers.queryText('PublishedLineName', lineNetworkNode);

        if ((operatorRef === null) || (lineRef === null) || (publishedLineName === null)) {
            console.log('ERROR: LineNetwork cant init');
            console.log(lineNetworkNode);
            return null;
        }

        const directionRef = XPathHelpers.queryText('Direction/DirectionRef', lineNetworkNode);

        const stopPlaceNodes = XPathHelpers.queryNodes('StopPlaces/AffectedStopPlace', lineNetworkNode);
        const stopPlaces = PtSituationElement.computeAffectedStopPlaces(stopPlaceNodes);

        const lineNetwork: LineNetwork = {
            operator: {
                operatorRef: operatorRef
            },
            lineRef: lineRef,
            directionRef: directionRef,
            publishedLineName: publishedLineName,
            stopPlaces: stopPlaces
        };

        return lineNetwork;
    }

    private static computeAffectedStopPlaces(stopPlaceNodes: Node[]): StopPlace[] {
        const stopPlaces: StopPlace[] = []

        stopPlaceNodes.forEach(stopPlaceNode => {
            const stopPlaceRef = XPathHelpers.queryText('StopPlaceRef', stopPlaceNode);
            const placeName = XPathHelpers.queryText('PlaceName', stopPlaceNode);

            if ((stopPlaceRef === null) || (placeName === null)) {
                console.log('ERROR: StopPlace cant init');
                console.log(stopPlaceNode);
                return null;
            }

            const stopPlace: StopPlace = {
                stopPlaceRef: stopPlaceRef,
                placeName: placeName,
            }
            stopPlaces.push(stopPlace);
        });

        return stopPlaces;
    }

    private static computeAffectedJourneys(situationNumber: string, publishingActionNode: Node): AffectedVehicleJourney[] {
        const affectedVehicleJourneys: AffectedVehicleJourney[] = [];

        const affectedVehicleJourneyNodes = XPathHelpers.queryNodes('siri:PublishAtScope/siri:Affects/siri:VehicleJourneys/siri:AffectedVehicleJourney', publishingActionNode);
        affectedVehicleJourneyNodes.forEach((vehicleJourneyNode, idx) => {
            const framedVehicleJourneyRefNode = XPathHelpers.queryNode('FramedVehicleJourneyRef', vehicleJourneyNode);
            if (framedVehicleJourneyRefNode === null) {
                console.error('computeAffectedJourneys - NULL FramedVehicleJourneyRef');
                console.log(situationNumber);
                console.log(vehicleJourneyNode);
                return;
            }

            const dataFrameRef = XPathHelpers.queryText('DataFrameRef', framedVehicleJourneyRefNode);
            const datedVehicleJourneyRef = XPathHelpers.queryText('DatedVehicleJourneyRef', framedVehicleJourneyRefNode);
            if (dataFrameRef === null || datedVehicleJourneyRef === null) {
                console.error('computeAffectedJourneys - NULL FramedVehicleJourneyRef members');
                console.log(situationNumber);
                console.log(framedVehicleJourneyRefNode);
                return;
            }

            const framedVehicleJourneyRef: FramedVehicleJourneyRef = {
                dataFrameRef: dataFrameRef,
                datedVehicleJourneyRef: datedVehicleJourneyRef,
            }
            
            const operatorRef = XPathHelpers.queryText('Operator/OperatorRef', vehicleJourneyNode);
            if (operatorRef === null) {
                console.error('computeAffectedJourneys - NULL operatorRef');
                console.log(situationNumber);
                console.log(vehicleJourneyNode);
                return;
            }

            let origin: AffectedStopPlace | null = null;
            const orginRef = XPathHelpers.queryText('Origins/StopPlaceRef', vehicleJourneyNode);
            if (orginRef !== null) {
                origin = {
                    stopPlaceRef: orginRef,
                    placeName: XPathHelpers.queryText('Origins/PlaceName', vehicleJourneyNode)
                }
            }

            let destination: AffectedStopPlace | null = null;
            const destinationRef = XPathHelpers.queryText('Destinations/StopPlaceRef', vehicleJourneyNode);
            if (destinationRef !== null) {
                destination = {
                    stopPlaceRef: destinationRef,
                    placeName: XPathHelpers.queryText('Destinations/PlaceName', vehicleJourneyNode)
                }
            }
            
            const stopCallNodes = XPathHelpers.queryNodes('Calls/Call', vehicleJourneyNode);
            const callStopsRef: string[] = [];
            stopCallNodes.forEach(stopCallNode => {
                const stopPlaceRef = XPathHelpers.queryText('StopPlaceRef', stopCallNode);
                if (stopPlaceRef === null) {
                    return
                }
                
                callStopsRef.push(stopPlaceRef);
            });

            const lineRef = XPathHelpers.queryText('LineRef', vehicleJourneyNode);
            const publishedLineName = XPathHelpers.queryText('PublishedLineName', vehicleJourneyNode);

            const affectedVehicleJourney: AffectedVehicleJourney = {
                framedVehicleJourneyRef: framedVehicleJourneyRef,
                operator: {
                    operatorRef: operatorRef
                },
                origin: origin,
                destination: destination,
                callStopsRef: callStopsRef,
                lineRef: lineRef,
                publishedLineName: publishedLineName,
            };

            affectedVehicleJourneys.push(affectedVehicleJourney);
        });

        return affectedVehicleJourneys;
    }

    private static computeTextualContent(textualContentNode: Node): TextualContent | null {
        const summaryNode = XPathHelpers.queryNode('SummaryContent', textualContentNode);
        if (summaryNode === null) {
            console.log('No SummaryText found');
            console.log(textualContentNode);
            return null;
        }

        const mapTextData: Record<string, TextualPropertyContent[]> = {};
        const childNodes = XPathHelpers.queryNodes('*', textualContentNode);
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

        const textLangNodes = XPathHelpers.queryNodes('*', textualPropertyContentNode);
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

    public isActive(date: Date = new Date()): boolean {
        const activePeriod = this.validityPeriods.find(el => {
            return (el.startDate < date) && (el.endDate > date);
        }) ?? null;

        return activePeriod !== null;
    }
}
