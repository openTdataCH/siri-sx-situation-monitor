import { App_Stage } from "../config/app_config";
import { DateHelpers } from "../helpers/date-helpers";
import { DOM_Helpers } from "../helpers/DOM_Helpers";
import { LangEnum, PublishingAction, TextualContentSizeEnum } from "../models/pt_all.interface";
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

    constructor(messages_fetch_controller: Messages_Fetch_Controller) {
        this.messages_fetch_controller = messages_fetch_controller;

        this.map_elements = {
            'loading_status': document.getElementById('loading_status') as HTMLDivElement,
            'siri_sx_container': document.getElementById('siri_sx_container') as HTMLDivElement,
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
    }

    private _show_loading_status() {
        DOM_Helpers.removeClassName(this.map_elements['loading_status'], 'd-none');
    }

    private _hide_loading_status() {
        DOM_Helpers.addClassName(this.map_elements['loading_status'], 'd-none');
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

        const situation_element_cards: string[] = [];

        matchedActionsData.forEach((matchedActionData, group_idx) => {
            const situationElement = matchedActionData.situation;

            const situation_element_card_HTML = this._compute_situation_element_card_HTML(matchedActionData, group_idx, matchedActionsData.length);
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

                const hasGeneralPerspective = action.passengerInformation.perspectives.indexOf('general') !== -1;
                if (!hasGeneralPerspective) {
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

            const matchedAction = matchedActions[0];

            const matchedActionData = <MatchedAction>{
                action: matchedAction,
                situation: situationElement
            }

            matchedActionsData.push(matchedActionData);
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

        const situation_subtitle: string = (() => {
            const situationIntervalFromS = DateHelpers.formatDayHHMM(situationElement.validityPeriod.startDate);
            const situationIntervalToS = DateHelpers.formatDayHHMM(situationElement.validityPeriod.endDate);
            const situationIntervalS = 'From ' + situationIntervalFromS + ' to ' + situationIntervalToS;

            return situationIntervalS;
        })();

        const matchedAction = matchedActionData.action;

        container_HTML = container_HTML.replace('[SITUATION_SUBTITLE]', situation_subtitle);
        container_HTML = container_HTML.replace('[CREATION_TIME]', situationDateS);
        container_HTML = container_HTML.replace('[ACTION_OWNER]', matchedAction.passengerInformation.ownerRef);
        container_HTML = container_HTML.replace('[ROW_IDX]', (rowIDX + 1).toString());
        container_HTML = container_HTML.replace('[ROWS_NO]', totalRowsNo.toString())
        container_HTML = container_HTML.replace('[SITUATION_ID]', matchedActionData.situation.situationNumber);

        return container_HTML;
    }

    _compute_entireLine_affect_HTML(affectData: PublishingActionAffect) {
        let rowHTML = this.map_html_templates.content_entire_line_affect.slice();

        const lineAffect = affectData.affect as LineNetwork
        rowHTML = rowHTML.replace('[OPERATOR_REF]', lineAffect.operator.operatorRef);
        rowHTML = rowHTML.replace('[LINE_INFO]', lineAffect.publishedLineName + ' - ' + lineAffect.lineRef);

        return rowHTML;
    }

    _compute_stopPlace_affect_HTML(stopAffect: StopPlace) {
        let rowHTML = this.map_html_templates.content_stop_place_affect.slice();

        rowHTML = rowHTML.replace('[STOP_NAME]', stopAffect.placeName);
        rowHTML = rowHTML.replace('[STOP_REF]', stopAffect.stopPlaceRef);

        const stopRefExtID = stopAffect.stopPlaceRef;

        const ojpURL = 'https://opentdatach.github.io/ojp-demo-app/board?stage=test&stop_id=' + stopRefExtID;
        rowHTML = rowHTML.replace('[OJP_SIRI_SX_URL]', ojpURL);
        
        return rowHTML;
    }

    _compute_partialLine_affect_HTML(affectData: PublishingActionAffect) {
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

    _compute_vehicleJourney_affect_HTML(affectData: PublishingActionAffect) {
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
