import { App_Stage } from "../config/app_config";
import { DateHelpers } from "../helpers/date-helpers";
import { DOM_Helpers } from "../helpers/DOM_Helpers";
import { GTFS_DB_Trips_Response, GTFS_Trip } from "../models/gtfs_db";
import { AffectedLineNetworkWithStops, AffectedVehicleJourney, LangEnum, LineNetwork, PublishingAction, PublishingActionAffect, ScopeType, StopPlace, TextualContentSizeEnum, TimeInterval } from "../models/pt_all.interface";
import PtSituationElement from "../models/pt_situation_element";
import Messages_Fetch_Controller from "./messages_fetch_controller";

interface MatchedAction {
    action: PublishingAction,
    situation: PtSituationElement,
}

type EventListenerCompletion = (ev: any) => void;
type EventListenerType = 'NewData'

export default class Messages_Embed_Controller {
    public messages_fetch_controller: Messages_Fetch_Controller

    private map_elements: Record<string, HTMLElement>;

    public has_debug_mode: boolean

    public filter_app_stage: App_Stage
    public filter_texts: string[] | null
    public filter_lang: LangEnum
    public filter_text_size: TextualContentSizeEnum
    public filter_is_active: boolean
    public filter_scope_type: ScopeType | null

    private map_html_templates: Record<string, string>;

    private map_listeners: Record<EventListenerType, EventListenerCompletion[]>;

    private map_i18n_keys: Record<string, Record<LangEnum, string>>;

    private renderModelAffects: PublishingActionAffect[][];
    private renderModelActions: MatchedAction[];

    constructor(messages_fetch_controller: Messages_Fetch_Controller) {
        this.messages_fetch_controller = messages_fetch_controller;

        this.map_elements = {
            'loading_status': document.getElementById('loading_status') as HTMLDivElement,
            'siri_sx_container': document.getElementById('siri_sx_container') as HTMLDivElement,
            'results_header': document.getElementById('results_header') as HTMLDivElement,
        };

        this.has_debug_mode = false;
        
        this.filter_app_stage = 'PROD';
        this.filter_texts = null;
        this.filter_lang = 'de';
        this.filter_text_size = 'large';
        this.filter_is_active = false;
        this.filter_scope_type = null;
        
        this._update_params_from_QueryString();

        this.map_html_templates = {
            card_situation_element: (document.getElementById('template_situation_element_card') as HTMLElement).innerHTML,
            situation_debug_info: (document.getElementById('template_situation_debug_info') as HTMLElement).innerHTML,
            content_entire_line_affect: (document.getElementById('template_affect_entire_line') as HTMLElement).innerHTML,
            content_stop_place_affect: (document.getElementById('template_affect_stop_place') as HTMLElement).innerHTML,
            content_partial_line_affect: (document.getElementById('template_affect_partial_line') as HTMLElement).innerHTML,
            content_vehicle_journey_affect: (document.getElementById('template_affect_vehicle_journey') as HTMLElement).innerHTML,
        };

        this.map_listeners = {
            'NewData': [],
        };

        this.map_i18n_keys = {
            'unplanned_header': {
                'de': 'UNGEPLANT',
                'en': 'UNPLANNED',
                'fr': 'NON PLANIFIÉ',
                'it': 'NON PIANIFICATO',
            }
        }

        this.renderModelAffects = [];
        this.renderModelActions = [];

        this.map_elements['siri_sx_container'].addEventListener('click', (ev) => {
            if (ev.target === null) {
                return;
            }
            if (ev.target instanceof HTMLElement) {
                const el = ev.target as HTMLElement;
                if (DOM_Helpers.hasClassName(ev.target, 'build-affect-link-btn')) {
                    const buttonEl = el as HTMLButtonElement;
                    const affect_id = el.getAttribute('data-id');
                    this._build_affect_link_for_id(affect_id, buttonEl);
                }
            }
        });
    }

    private _show_loading_status() {
        DOM_Helpers.removeClassName(this.map_elements['loading_status'], 'd-none');
        DOM_Helpers.addClassName(this.map_elements['results_header'], 'd-none');
    }

    private _hide_loading_status() {
        DOM_Helpers.addClassName(this.map_elements['loading_status'], 'd-none');
        DOM_Helpers.removeClassName(this.map_elements['results_header'], 'd-none');
    }

    private _update_params_from_QueryString() {
        const urlParams = new URLSearchParams(window.location.search);

        this.has_debug_mode = urlParams.get('debug') === '1';

        const app_stage = urlParams.get('app_stage') as App_Stage;
        if (app_stage) {
            this.filter_app_stage = app_stage;
        }
        
        const filterLang = urlParams.get('lang') as LangEnum;
        if (filterLang) {
            this.filter_lang = filterLang;
        }
        
        const textSize = urlParams.get('text_size') as TextualContentSizeEnum;
        if (textSize) {
            this.filter_text_size = textSize;
        }

        const filter_texts_s = urlParams.get('text') ?? '';
        if (filter_texts_s.trim() !== '') {
            this.filter_texts = filter_texts_s.split(',');
        } else {
            this.filter_texts = null;
        }

        const filterIsActive = urlParams.get('active');
        if (filterIsActive) {
            this.filter_is_active = filterIsActive !== '0';
        }

        const filterScopeType = urlParams.get('scopeType') ?? null;
        if (filterScopeType !== null) {
            this.filter_scope_type = filterScopeType.trim() as ScopeType;
        }
    }

    public fetchAndRenderLatest() {
        this.map_elements['siri_sx_container'].innerHTML = '';
        this._show_loading_status();

        this.messages_fetch_controller.fetch_latest((situationElements, error) => {
            this.map_listeners['NewData'].forEach(completion => {
                completion(null);
            });
            
            this.renderHTML(situationElements, error);

            if (!this.has_debug_mode) {
                setTimeout(() => {
                    this.fetchAndRenderLatest();
                }, 60 * 1000);
            }
        });
    }

    public addListener(type: EventListenerType, completion: EventListenerCompletion) {
        this.map_listeners[type].push(completion);
    }

    public renderLatest() {
        const situationElements = this.messages_fetch_controller.current_situation_elements;
        this.renderHTML(situationElements, null);
    }

    private renderHTML(situationElements: PtSituationElement[], error: string | null) {
        const matchedActionsData = this._prepareSituationElements(situationElements);
        console.log('STATS response: FILTER actions: ' + matchedActionsData.length + ' PublishingAction objects');

        const situation_element_cards: string[] = [];
        this.renderModelAffects = [];
        this.renderModelActions = [];

        matchedActionsData.forEach((matchedActionData, rowIDx) => {
            const situation_element_card_HTML = this._compute_situation_element_card_HTML(matchedActionData, rowIDx, matchedActionsData.length);
            situation_element_cards.push(situation_element_card_HTML);
        });

        this._hide_loading_status();
        
        let messagesContainerHTML = situation_element_cards.join('');
        if (matchedActionsData.length === 0) {
            messagesContainerHTML = 'No messages found';
            if (error) {
                messagesContainerHTML = 'ERROR: ' + error;
            }
        }

        this.map_elements['siri_sx_container'].innerHTML = messagesContainerHTML;
    }

    private _prepareSituationElements(situationElements: PtSituationElement[]): MatchedAction[] {
        situationElements.sort(sortSituationElements);

        const now = new Date();

        const matchedActionsData: MatchedAction[] = [];
        situationElements.forEach(situationElement => {
            if (situationElement.publishingActions.length === 0) {
                return;
            }

            if (this.filter_is_active) {
                const isActive = situationElement.isActive(now);
                if (!isActive) {
                    return;
                }
            }

            const matchedActions = situationElement.publishingActions.filter(action => {
                const hasOwnerRef = this._match_text(situationElement.situationNumber, action.passengerInformation.ownerRef);
                if (!hasOwnerRef) {
                    return false;
                }

                const hasScopeType = this.filter_scope_type === null || action.scopeType === this.filter_scope_type;
                if (!hasScopeType) {
                    return false;
                }

                return true;
            });

            if (matchedActions.length === 0) {
                return null;
            }

            matchedActions.forEach(matchedAction => {
                const matchedActionData = <MatchedAction>{
                    action: matchedAction,
                    situation: situationElement
                }
                matchedActionsData.push(matchedActionData);
            });
        });

        return matchedActionsData;
    }

    private _match_text(situationNumber: string, ownerRef: string | null): boolean {
        if (this.filter_texts === null) {
            return true;
        }

        if (this.filter_texts.includes(situationNumber)) {
            return true;
        }

        if (ownerRef === null) {
            return false;
        }

        const sanitizeOwnerRef = (s: string): string => {
            return s.trim().toLowerCase().replace('ch:1:sboid:', '');
        };

        ownerRef = sanitizeOwnerRef(ownerRef);

        const foundOwnerRef = this.filter_texts.find(filter_text => {
            filter_text = sanitizeOwnerRef(filter_text);
            return ownerRef === filter_text;
        }) ?? null;

        return foundOwnerRef !== null;
    }

    private _compute_situation_element_card_HTML(matchedActionData: MatchedAction, rowIDX: number, totalRowsNo: number): string {
        let card_HTML = this.map_html_templates.card_situation_element.slice();

        const situationElement = matchedActionData.situation;
        const situationDateS = DateHelpers.formatDate(situationElement.creationTime);

        const situation_header: string = (() => {
            const firstAction = situationElement.publishingActions[0];
            const smallTextualContent = firstAction.passengerInformation.mapTextualContent['small'];

            let content_text = situationDateS;

            if (smallTextualContent) {
                content_text = smallTextualContent.summary[this.filter_lang] as string;
            }

            if (!situationElement.isPlanned) {
                const header_text = this.map_i18n_keys['unplanned_header'][this.filter_lang];
                content_text = content_text + ' <span class="badge bg-warning text-dark">' + header_text + '</span>';
            }
            
            return content_text;
        })();

        const matchedAction = matchedActionData.action;

        card_HTML = card_HTML.replace('[SITUATION_HEADER]', situation_header);
        card_HTML = card_HTML.replace('[SITUATION_CONTENT]', this._compute_publishing_action_content(matchedAction));
        card_HTML = card_HTML.replace('[DEBUG_INFO]', this._compute_situation_element_debug_info_HTML(matchedActionData, rowIDX, totalRowsNo));

        return card_HTML;
    }

    _compute_situation_element_debug_info_HTML(matchedActionData: MatchedAction, rowIDX: number, totalRowsNo: number): string {
        if (!this.has_debug_mode) {
            return '';
        }

        let container_HTML = this.map_html_templates.situation_debug_info.slice();

        const situationElement = matchedActionData.situation;

        const situationDateS = DateHelpers.formatDate(situationElement.creationTime);

        const validityPeriodRows: string[] = (() => {
            const rows: string[] = [];

            if (situationElement.validityPeriods.length === 0) {
                rows.push('<li>NO VALIDITY PERIOD</li>');
                return rows;
            }

            const validityPeriodsNo = situationElement.validityPeriods.length;
            if (validityPeriodsNo > 1) {
                rows.push('<li>total: ' + validityPeriodsNo + '</li>');

                const firstValidityPeriod = situationElement.validityPeriods[0];
                rows.push('<li>first: ' + DateHelpers.formatValidityPeriodDuration(firstValidityPeriod) + '</li>');

                if ((validityPeriodsNo - 2) > 0) {
                    rows.push('<li>...................................................</li>');
                }
                
                const lastValidityPeriod = situationElement.validityPeriods[situationElement.validityPeriods.length - 1];
                rows.push('<li>last: ' + DateHelpers.formatValidityPeriodDuration(lastValidityPeriod) + '</li>');
            } else {
                const firstValidityPeriod = situationElement.validityPeriods[0];
                rows.push('<li>' + DateHelpers.formatValidityPeriodDuration(firstValidityPeriod) + '</li>');
            }
            
            const isActive = situationElement.isActive();
            const isActiveText = isActive ? 'YES' : 'NO';
            
            rows.push('<li>Active now: ' + isActiveText + '</li>');

            return rows;
        })();

        const matchedAction = matchedActionData.action;

        const ownerRef = matchedAction.passengerInformation.ownerRef ?? '<span class="badge bg-warning text-dark">NO OWNER</span>';

        container_HTML = container_HTML.replace('[CREATION_TIME]', situationDateS);
        container_HTML = container_HTML.replace('[ACTION_OWNER]', ownerRef);
        container_HTML = container_HTML.replace('[ROW_IDX]', (rowIDX + 1).toString());
        container_HTML = container_HTML.replace('[ROWS_NO]', totalRowsNo.toString())
        container_HTML = container_HTML.replace('[SITUATION_ID]', matchedActionData.situation.situationNumber);
        container_HTML = container_HTML.replace('[AFFECT_TYPE]', matchedActionData.action.scopeType);
        container_HTML = container_HTML.replace('[SITUATION_ALERT_CAUSE]', matchedActionData.situation.alertCause);
        container_HTML = container_HTML.replace('[PERSPECTIVES]', matchedActionData.action.passengerInformation.perspectives.join(', '));

        container_HTML = container_HTML.replace('[VALIDITY_PERIOD]', validityPeriodRows.join(''));

        const now = new Date();
        const nowYMD = DateHelpers.formatDate(now).substring(0, 10);

        const affectsNo = matchedActionData.action.affects.length;
        let affectsNoText = '';
        
        let actionAffects = matchedActionData.action.affects.slice();
        if (this.filter_is_active) {
            const totalAffectsNo = actionAffects.length;

            actionAffects = actionAffects.filter(affectData => {
                if (affectData.type === 'vehicle-journey') {
                    const vehicleJourneyAffect = affectData.affect as AffectedVehicleJourney;
                    const isActive = vehicleJourneyAffect.framedVehicleJourneyRef.dataFrameRef === nowYMD;
                    return isActive;
                }

                if (affectData.type === 'entire-line') {
                    return true;
                }

                if (affectData.type === 'partial-line') {
                    return true;
                }

                if (affectData.type === 'stop') {
                    return true;
                }

                return false;
            });
            
            affectsNoText = ' (total ' + totalAffectsNo + ', showing ' + actionAffects.length + ' active)';
        } else {
            if (affectsNo > 10) {
                affectsNoText = ' (' + affectsNo + ', showing top 10)';
                actionAffects = matchedActionData.action.affects.slice(0, 10);
            }
        }    
        
        this.renderModelAffects.push(actionAffects);
        this.renderModelActions.push(matchedActionData);

        container_HTML = container_HTML.replace('[AFFECTS_NO_TEXT]', affectsNoText);

        const affect_rows_HTML: string[] = [];
        actionAffects.forEach((affectData, idx) => {
            let row_HTML: string | null = null;
            const affectModelId = rowIDX + '_' + idx;

            if (affectData.type === 'partial-line') {
                row_HTML = this._compute_partialLine_affect_HTML(affectModelId, affectData);
            }

            if (affectData.type === 'entire-line') {
                row_HTML = this._compute_entireLine_affect_HTML(affectModelId, affectData);
            }

            if (affectData.type === 'stop') {
                row_HTML = this._compute_stopPlace_affect_HTML(affectData.affect as StopPlace);
            }

            if (affectData.type === 'vehicle-journey') {
                row_HTML = this._compute_vehicleJourney_affect_HTML(affectModelId, affectData);
            }

            if (row_HTML === null) {
                debugger;
                return;
            }

            affect_rows_HTML.push(row_HTML);
        });
        container_HTML = container_HTML.replace('[AFFECT_CONTENT]', affect_rows_HTML.join(''));

        return container_HTML;
    }

    _compute_entireLine_affect_HTML(affectModelId: string, affectData: PublishingActionAffect) {
        let rowHTML = this.map_html_templates.content_entire_line_affect.slice();

        const lineAffect = affectData.affect as LineNetwork
        rowHTML = rowHTML.replace('[OPERATOR_REF]', lineAffect.operator.operatorRef);
        rowHTML = rowHTML.replace('[LINE_INFO]', lineAffect.publishedLineName + ' - ' + lineAffect.lineRef);
        rowHTML = rowHTML.replace('[AFFECT_ID]', affectModelId);

        return rowHTML;
    }

    _compute_stopPlace_affect_HTML(stopAffect: StopPlace) {
        let rowHTML = this.map_html_templates.content_stop_place_affect.slice();

        rowHTML = rowHTML.replace('[STOP_NAME]', stopAffect.placeName);
        rowHTML = rowHTML.replace('[STOP_REF]', stopAffect.stopPlaceRef);

        const stopRefExtID = stopAffect.stopPlaceRef;

        const qsParams: Record<string, string> = {
            'stop_id': stopRefExtID,
        };
        const ojpURL = this._buildOJP_URL('board', qsParams);

        rowHTML = rowHTML.replace('[OJP_SIRI_SX_URL]', ojpURL);
        
        return rowHTML;
    }

    _buildOJP_URL(route: 'search' | 'board', qsParams: Record<string, string>) {
        qsParams['stage'] = this.filter_app_stage.toLowerCase();
        const qs = new URLSearchParams(qsParams);

        const ojpURL = 'https://tools.odpch.ch/beta-ojp-demo/' + route + '?' + qs;
        return ojpURL;
    }

    _compute_partialLine_affect_HTML(affectModelId: string, affectData: PublishingActionAffect) {
        let rowHTML = this.map_html_templates.content_partial_line_affect.slice();

        const lineAffect = affectData.affect as AffectedLineNetworkWithStops
        rowHTML = rowHTML.replace('[OPERATOR_REF]', lineAffect.lineNetwork.operator.operatorRef);
        rowHTML = rowHTML.replace('[LINE_INFO]', lineAffect.lineNetwork.publishedLineName + ' - ' + lineAffect.lineNetwork.lineRef);
        rowHTML = rowHTML.replace('[LINE_DIRECTION]', lineAffect.directionRef);

        const stopPlace_HTML_rows: string[] = [];
        lineAffect.stopPlaces.forEach(stopPlace => {
            const stopPlace_HTML_row = this._compute_stopPlace_affect_HTML(stopPlace);
            stopPlace_HTML_rows.push(stopPlace_HTML_row);
        });
        rowHTML = rowHTML.replace('[LINE_STOPS]', stopPlace_HTML_rows.join(''));

        return rowHTML;
    }

    _compute_vehicleJourney_affect_HTML(affectModelId: string, affectData: PublishingActionAffect) {
        let rowHTML = this.map_html_templates.content_vehicle_journey_affect.slice();

        const vehicleJourneyAffect = affectData.affect as AffectedVehicleJourney;

        const stopCallIDs: string[] = [];
        vehicleJourneyAffect.callStopsRef.forEach(stopRef => {
            stopCallIDs.push(stopRef);
        });
        rowHTML = rowHTML.replace('[STOP_REFS_S]', stopCallIDs.join(', '));

        const vehicleJourneyAffectRows: string[] = (() => {
            const rows: string[] = [];
            
            const journeyRefS = '<li>JourneyRef: ' + vehicleJourneyAffect.framedVehicleJourneyRef.datedVehicleJourneyRef + ' - ' + vehicleJourneyAffect.framedVehicleJourneyRef.dataFrameRef + '</li>';
            rows.push(journeyRefS);

            const operatorRefS = '<li>Operator: ' + vehicleJourneyAffect.operator.operatorRef + '</li>';
            rows.push(operatorRefS);

            if (vehicleJourneyAffect.lineRef) {
                const lineRefS = '<li>LineRef: ' + vehicleJourneyAffect.lineRef + '</li>';
                rows.push(lineRefS);
            }

            if ((vehicleJourneyAffect.origin !== null) && (vehicleJourneyAffect.destination !== null)) {
                const fromS = vehicleJourneyAffect.origin.placeName + '(' + vehicleJourneyAffect.origin.stopPlaceRef + ')';
                const toS = vehicleJourneyAffect.destination.placeName + '(' + vehicleJourneyAffect.destination.stopPlaceRef + ')';

                const fromToS = '<li>From-To: ' + fromS + ' - ' + toS + '</li>';
                rows.push(fromToS);
            }

            if (vehicleJourneyAffect.callStopsRef.length > 0) {
                const callStopsRefS = '<li>CallStopRefs: ' + vehicleJourneyAffect.callStopsRef.join(', ') + '</li>';
                rows.push(callStopsRefS);
            }

            rows.push('<li>Test in OJP Demo App - <span><button type="button" class="btn btn-primary btn-sm build-affect-link-btn" data-id="' + affectModelId + '">Build Link</button></span></li>');
            
            return rows;
        })();
        
        rowHTML = rowHTML.replace('[AFFECT_VEHICLE_JOURNEY]', vehicleJourneyAffectRows.join(''));

        return rowHTML;
    }

    _compute_publishing_action_content(publishingAction: PublishingAction): string {
        const textualContent = publishingAction.passengerInformation.mapTextualContent[this.filter_text_size];
        if (textualContent === undefined) {
            const errorMessage = 'ERROR - content not available for ' + this.filter_text_size + ' TextualContentSize';
            return errorMessage;
        }

        const textual_content_value_items: string[] = [];

        const contentItemsOrder = ['Summary', 'Reason', 'Duration', 'Description', 'Consequence', 'Recommendation', 'Remark', 'InfoLink'];
        contentItemsOrder.forEach(contentKey => {
            if (!(contentKey in textualContent.mapTextData)) {
                return;
            }

            const contentProperties = textualContent.mapTextData[contentKey];

            contentProperties.forEach(contentProperty => {
                let contentValue = (contentProperty[this.filter_lang] ?? 'n/a');
                if (this.has_debug_mode) {
                    contentValue = '<span class="text-muted">' + contentKey + ':</span> ' + contentValue;
                }

                const contentValue_item = '<li>' + contentValue + '</li>';
                textual_content_value_items.push(contentValue_item);
            });
        });

        const action_content_HTML = '<ul>' + textual_content_value_items.join(' ') + '</ul>';
        return action_content_HTML;
    }
    
    private async _build_affect_link_for_id(affect_id: string | null, btn_el: HTMLButtonElement) {
        if (affect_id === null) {
            return;
        }

        const affect_id_parts = affect_id.split('_');
        if (affect_id_parts.length !== 2) {
            return;
        }

        const parentEl = btn_el.parentElement ?? null;
        if (parentEl === null) {
            return;
        }
        
        const actionIDx = Number(affect_id_parts[0]);
        const affectIDx = Number(affect_id_parts[1]);
        const affectData = this.renderModelAffects[actionIDx][affectIDx];
        const matchedAction = this.renderModelActions[actionIDx];

        btn_el.textContent = '... fetching';
        btn_el.disabled = true;

        const now = new Date();
        let serviceDay = DateHelpers.formatDate(now).substring(0, 10);

        const serviceQueryParams: Record<string, string> | null = (() => {
            if (affectData.type === 'entire-line' || affectData.type === 'partial-line') {
                const lineNetwork: LineNetwork | null = (() => {
                    if (affectData.type === 'entire-line') {
                        return affectData.affect as LineNetwork;
                    }
                    if (affectData.type === 'partial-line') {
                        const lineAffect = affectData.affect as AffectedLineNetworkWithStops;
                        return lineAffect.lineNetwork;
                    }

                    return null;
                })();

                if (lineNetwork === null) {
                    return null;
                }

                const routeShortName = lineNetwork.publishedLineName;
                const lineRef = lineNetwork.lineRef;

                const queryParams: Record<string, string> = {
                    'route_short_name': routeShortName,
                    'line_ref': lineRef,
                };

                return queryParams;
            }

            if (affectData.type === 'vehicle-journey') {
                const vehicleJourneyAffect = affectData.affect as AffectedVehicleJourney;
                
                serviceDay = vehicleJourneyAffect.framedVehicleJourneyRef.dataFrameRef;
                const journeyRef = vehicleJourneyAffect.framedVehicleJourneyRef.datedVehicleJourneyRef;
                
                const queryParams: Record<string, string> = {
                    'journey_ref': journeyRef,
                };
                
                return queryParams;
            }

            debugger;
            return null;
        })();

        if (serviceQueryParams === null) {
            btn_el.textContent = 'ERROR queryParams';
            btn_el.disabled = false;

            console.error('CANT compute serviceQueryParams');
            console.log(affectData);

            return;
        }

        serviceQueryParams['service_day'] = serviceDay;
        
        const qs = new URLSearchParams(serviceQueryParams);
        const gtfsTripsURL = 'https://tools.odpch.ch/gtfs-rt-status/api/gtfs-query/trips?' + qs;

        const gtfsTripsJSON = await (await fetch(gtfsTripsURL)).json() as GTFS_DB_Trips_Response;

        if (gtfsTripsJSON.rows.length === 0) {
            btn_el.textContent = 'ERROR - no trips';
            btn_el.disabled = false;

            console.error('NO trip found');
            console.log(affectData);
            return;
        }

        let gtfsTrips: GTFS_Trip[] = [];
        gtfsTripsJSON.rows.forEach(tripJSON => {
            const gtfsTrip = GTFS_Trip.initWithTrip_Flat_JSON(tripJSON);
            if (gtfsTrip) {
                gtfsTrips.push(gtfsTrip);
            }
        });

        // Sort all trips by departure time
        gtfsTrips.sort((a, b) => a.departure.timeMins - b.departure.timeMins);

        const affectedStopIDs: string[] | null = (() => {
            if (affectData.type === 'entire-line' || affectData.type === 'partial-line') {
                const lineNetwork: LineNetwork | null = (() => {
                    if (affectData.type === 'entire-line') {
                        return affectData.affect as LineNetwork;
                    }
                    if (affectData.type === 'partial-line') {
                        const lineAffect = affectData.affect as AffectedLineNetworkWithStops;
                        return lineAffect.lineNetwork;
                    }

                    return null;
                })();

                if (lineNetwork === null) {
                    return null;
                }

                const stopIDs: string[] = [];
                lineNetwork.stopPlaces.forEach(stopPlace => {
                    const stopPlaceRef = stopPlace.stopPlaceRef;
                    const stopId: string = (() => {
                        const sloidParts = stopPlaceRef.split(':sloid:');
                        if (sloidParts.length === 0) {
                            return stopPlaceRef;
                        } else {
                            const sloidStopId = sloidParts[1].padStart(5, '0');
                            return '85' + sloidStopId;
                        }
                    })();
                    
                    stopIDs.push(stopId);
                });

                return stopIDs;
            }
            
            return null;
        })();

        const matchedTrip: GTFS_Trip = (() => {
            const defaultTrip = gtfsTrips[0];

            if (gtfsTrips.length === 1) {
                return defaultTrip;
            }

            // if present, filter the trips having only affected stops
            if (affectedStopIDs !== null && (affectedStopIDs.length > 0)) {
                gtfsTrips = gtfsTrips.filter(gtfsTrip => {
                    const tripStopIDs = gtfsTrip.stopTimes.map(stopTime => {
                        const stopIdParts = stopTime.stop.stop_id.split(':');
                        return stopIdParts[0];
                    });

                    const tripStopIDsIntersected = tripStopIDs.filter(tripStopID => affectedStopIDs.includes(tripStopID));
                    return tripStopIDsIntersected.length > 0;
                });
            }

            // Try to get the validity period to match the service day
            let validityPeriod = matchedAction.situation.validityPeriods.find(validityPeriod => {
                const validityPeriodDay = DateHelpers.formatDate(validityPeriod.startDate);
                return validityPeriodDay === serviceDay;
            }) ?? null;
            // If not found, use the first validity period
            if (validityPeriod === null) {
                validityPeriod = matchedAction.situation.validityPeriods[0];
            }

            const now = new Date();
            const nowHHMM = DateHelpers.formatTimeHHMM(now);

            // Try to get the start of validity period (in HH:MM format)
            let serviceFromHHMM = nowHHMM;
            const validityPeriodFromHHMM = DateHelpers.formatTimeHHMM(validityPeriod.startDate);
            const validityPeriodToHHMM = DateHelpers.formatTimeHHMM(validityPeriod.endDate);
            if ((nowHHMM < validityPeriodFromHHMM) || (nowHHMM > validityPeriodToHHMM)) {
                serviceFromHHMM = validityPeriodFromHHMM;
            }

            const selectedTrip = gtfsTrips.find(gtfsTrip => {
                const gtfsTripFromHHMM = gtfsTrip.departure.timeS.substring(0, 5);
                return gtfsTripFromHHMM >= serviceFromHHMM;
            }) ?? defaultTrip;

            return selectedTrip;
        })();

        const stopIDs = matchedTrip.stopTimes.map(stopTime => {
            const stopIdParts = stopTime.stop.stop_id.split(':');
            return stopIdParts[0];
        });

        const stop1_Id = stopIDs[0];
        const stop2_Id: string = (() => {
            const defaultStop2_Id = stopIDs[stopIDs.length - 1];

            if (affectedStopIDs === null || (affectedStopIDs.length === 0)) {
                return defaultStop2_Id;
            }

            if (affectedStopIDs.includes(stop1_Id)) {
                return defaultStop2_Id;
            }

            return affectedStopIDs[0];
        })();

        const tripHHMM: string = (() => {
            const hhmm = matchedTrip.departure.timeS.substring(0, 5);
            if (hhmm <= '24:00') {
                return hhmm;
            }

            const hhmmParts = hhmm.split(':');
            const timeH = Number(hhmmParts[0]) - 24;
            const timeH_f = timeH.toString(10).padStart(2, '0');
            const newHHMM = timeH_f + ':' + hhmmParts[1];

            return newHHMM;
        })();
        
        const tripDateTime = serviceDay + ' ' + tripHHMM;

        const qsParams: Record<string, string> = {
            'from': stop1_Id,
            'to': stop2_Id,
            'trip_datetime': tripDateTime,
            'do_search': 'yes',
        };

        const url = this._buildOJP_URL('search', qsParams);
        parentEl.innerHTML = '<a href="' + url + '" target="_blank">Link</a>';
    }
}

function sortSituationElements(a: PtSituationElement, b: PtSituationElement) {
    let a_key = '';
    let b_key = '';

    [a, b].forEach(c => {
        const planned_key = c.isPlanned ? '1' : '2';
        const creation_time_key = DateHelpers.formatDate(c.creationTime);
        const sort_key = planned_key + '_' + creation_time_key;

        if (c === a) {
            a_key = sort_key;
        } else {
            b_key = sort_key;
        }
    });

    return b_key.localeCompare(a_key);
}
