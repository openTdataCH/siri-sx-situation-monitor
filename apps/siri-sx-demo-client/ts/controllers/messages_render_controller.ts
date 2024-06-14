import { DateHelpers } from "../helpers/date-helpers";
import { LangEnum, PublishingAction } from "../models/pt_all.interface";
import PtSituationElement from "../models/pt_situation_element";

export default class Messages_Render_Controller {
    private clientLang: LangEnum;
    private map_html_templates: Record<string, string>;

    constructor() {
        this.clientLang = 'de';

        this.map_html_templates = {
            card_situation_element: (document.getElementById('template_situation_element_card') as HTMLElement).innerHTML,
            card_publishing_action: (document.getElementById('template_publishing_action') as HTMLElement).innerHTML,
        };
    }

    public renderHTML(situationElements: PtSituationElement[]) {
        const situation_element_cards: string[] = [];

        situationElements.forEach((situationElement, group_idx) => {
            const collapse_level1_id = '' + group_idx;
            const situation_element_card_HTML = this._compute_situation_element_card_HTML(situationElement, collapse_level1_id);
            situation_element_cards.push(situation_element_card_HTML);
        });

        const siri_sx_container = document.getElementById('siri_sx_container') as HTMLDivElement;
        siri_sx_container.innerHTML = situation_element_cards.join('');
    }

    _compute_situation_element_card_HTML(situationElement: PtSituationElement, collapse_level1_id: string) {
        let card_HTML = this.map_html_templates.card_situation_element.slice();

        const firstValidityPeriod = situationElement.validityPeriods[0];
        const situationDateS = DateHelpers.formatDate(situationElement.creationTime);
        const situationIntervalFromS = DateHelpers.formatValidityPeriodDuration(firstValidityPeriod);
        
        const lastValidityPeriod = situationElement.validityPeriods[situationElement.validityPeriods.length - 1];
        const situationIntervalToS = DateHelpers.formatValidityPeriodDuration(lastValidityPeriod);
        const situationIntervalS = situationIntervalFromS + ' - ' + situationIntervalToS;

        const situation_header: string = (() => {
            const default_text = situationDateS;

            if (situationElement.publishingActions.length === 0) {
                return default_text;
            }
            
            const firstAction = situationElement.publishingActions[0];
            const smallTextualContent = firstAction.passengerInformation.mapTextualContent['small'];

            if (smallTextualContent) {
                const summaryTextS = smallTextualContent.summary[this.clientLang] as string;
                return summaryTextS;
            }
            
            return default_text;
        })();

        const plannedText = situationElement.isPlanned ? 'YES'  : 'NO (unplanned)';
        
        card_HTML = card_HTML.replace(/\[SITUATION_HEADER\]/g, situation_header);
        card_HTML = card_HTML.replace(/\[SITUATION_CREATE_DATE\]/g, situationDateS);
        
        card_HTML = card_HTML.replace('[SITUATION_NUMBER]', situationElement.situationNumber);
        card_HTML = card_HTML.replace('[SOURCE_NAME]', situationElement.source.name ?? 'n/a');
        card_HTML = card_HTML.replace('[SOURCE_TYPE]', situationElement.source.sourceType);
        card_HTML = card_HTML.replace('[SITUATION_INTERVAL]', situationIntervalS);
        card_HTML = card_HTML.replace('[PRIORITY]', situationElement.priority.toString());

        card_HTML = card_HTML.replace(/\[ALERT_CAUSE\]/g, situationElement.alertCause);
        card_HTML = card_HTML.replace('[SITUATION_PLANNED]', plannedText);
        card_HTML = card_HTML.replace(/\[PARTICIPANT_REF\]/g, situationElement.participantRef);
        card_HTML = card_HTML.replace(/\[CARD_LEVEL1_ID\]/g, collapse_level1_id.toString());

        card_HTML = card_HTML.replace('[VALID_FROM_DATE]', situationIntervalFromS);
        card_HTML = card_HTML.replace('[VALID_TO_DATE]', situationIntervalToS);

        const publishing_action_items: string[] = [];
        situationElement.publishingActions.forEach(publishingAction => {
            const publishing_action_item = this._compute_publishing_action_card_HTML(publishingAction);
            publishing_action_items.push(publishing_action_item);
        });

        const publishing_action_items_HTML = publishing_action_items.join('');
        card_HTML = card_HTML.replace('[PUBLISHING_ACTIONS_CONTAINER]', publishing_action_items_HTML);
        
        return card_HTML;
    }

    _compute_publishing_action_card_HTML(publishingAction: PublishingAction) {
        let card_HTML = this.map_html_templates.card_publishing_action.slice();

        card_HTML = card_HTML.replace(/\[SCOPE_TYPE\]/g, publishingAction.scopeType);
        card_HTML = card_HTML.replace(/\[OWNER_REF\]/g, publishingAction.passengerInformation.ownerRef ?? 'n/a');

        const perspective_html_items: string[] = [];
        const perspective_items: string[] = [];
        publishingAction.passengerInformation.perspectives.forEach(perspective => {
            const perspective_item = '<span class="badge bg-info text-dark" style="margin-right: 2px">' + perspective + '</span>';
            perspective_html_items.push(perspective_item);
            perspective_items.push(perspective);
        });
        
        card_HTML = card_HTML.replace('[PERSPECTIVES_HTML]', perspective_html_items.join(''));
        card_HTML = card_HTML.replace('[PERSPECTIVES]', perspective_items.join(', '));

        const textual_content_value_items: string[] = [];
        const textualContent = publishingAction.passengerInformation.mapTextualContent['large'];

        const contentItemsOrder = ['Summary', 'Reason', 'Duration', 'Description', 'Consequence', 'Recommendation', 'Remark', 'InfoLink'];

        contentItemsOrder.forEach(contentKey => {
            if (contentKey in textualContent.mapTextData) {
                const contentProperties = textualContent.mapTextData[contentKey];
                if (contentProperties.length === 1) {
                    const contentProperty = contentProperties[0];
                    const contentValue_item = '<li><strong>' + contentKey + '</strong>: ' + (contentProperty[this.clientLang] ?? 'n/a') + '</li>';
                    textual_content_value_items.push(contentValue_item);
                } else {
                    const level2_items: string[] = [];
                    contentProperties.forEach(contentProperty => {
                        const level2_item = '<li>' + (contentProperty[this.clientLang] ?? 'n/a') + '</li>';
                        level2_items.push(level2_item);
                    });

                    const level1_list = '<ul>' + level2_items.join('') + '</ul>';

                    const contentValue_item = '<li><strong>' + contentKey + '</strong> ' + level1_list + '</li>';
                    textual_content_value_items.push(contentValue_item);
                }
            }
        });

        const textual_content_HTML = '<ul>' + textual_content_value_items.join('') + '</ul>';
        card_HTML = card_HTML.replace('[TEXTUAL_CONTENT_CONTAINER]', textual_content_HTML);

        return card_HTML;
    }
}
