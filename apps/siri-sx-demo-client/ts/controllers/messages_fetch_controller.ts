import { APP_CONFIG, App_Stage } from "../config/app_config";
import { XPathHelpers } from "../helpers/xpath";
import PtSituationElement from "../models/pt_situation_element";
import LocalStorageService from "./local_storage_service";

type Response_Completion = (response: PtSituationElement[], error: string | null) => void

export default class Messages_Fetch_Controller {
    public app_stage: App_Stage
    public local_storage_service: LocalStorageService

    public response_source: string;

    public current_situation_elements: PtSituationElement[]

    constructor(app_stage: App_Stage = 'INT', local_storage_service: LocalStorageService) {
        this.app_stage = app_stage;
        this.local_storage_service = local_storage_service;
        
        this.response_source = 'n/a';

        this.current_situation_elements = [];
    }

    public fetch_latest(completion: Response_Completion) {
        const stage_data = APP_CONFIG.map_stages[this.app_stage]
        let api_url = stage_data.api_url;
        
        const requestHeaders = {
            "Content-Type": "application/xml",
            "Authorization": 'Bearer ' + stage_data.bearer_key,
        };

        const request = new Request(api_url, {
            headers: requestHeaders
        });

        fetch(request).then(response => {
            if (response.ok) {
                this.response_source = 'API: ' + api_url;
                this._parse_response(response, completion);
            } else {
                const errorMessage = 'Failed to fetch from ' + api_url + ' . ERROR: ' + response.status;
                this.response_source = 'ERROR: fetch error';
                completion([], errorMessage);
            }
        });
    }

    private _parse_response(response: Response, completion: Response_Completion): void {
        response.text().then(responseXMLText => {
            const situationElements: PtSituationElement[] = [];

            const responseDocument = new DOMParser().parseFromString(responseXMLText, 'application/xml');
            const situationsRootNode = XPathHelpers.queryNode('//siri:SituationExchangeDelivery', responseDocument);
            if (situationsRootNode === null) {
                const errorMessage = 'Failed to parse, check console for the responseText';
                console.error('ERROR - responseText:');
                console.log(responseXMLText);
                completion([], errorMessage);
                return;
            }
            
            const situationNodes = XPathHelpers.queryNodes('siri:Situations/siri:PtSituationElement', situationsRootNode);
            situationNodes.forEach(situationNode => {
                const situationElement = PtSituationElement.initFromSituationNode(situationNode);
                if (situationElement) {
                    situationElements.push(situationElement);
                }
            });

            situationElements.sort((a,b) => b.creationTime.getDate() - a.creationTime.getDate()); 

            this.current_situation_elements = situationElements;

            completion(situationElements, null);
        });
    }
}
