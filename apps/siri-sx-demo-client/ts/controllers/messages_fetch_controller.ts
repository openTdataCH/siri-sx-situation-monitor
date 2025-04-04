import { APP_CONFIG, App_Stage } from "../config/app_config";
import { XPathHelpers } from "../helpers/xpath";
import PtSituationElement from "../models/pt_situation_element";
import LocalStorageService from "./local_storage_service";

type Response_Completion = (response: PtSituationElement[], error: string | null) => void

export default class Messages_Fetch_Controller {
    public app_stage: App_Stage
    public local_storage_service: LocalStorageService

    public response_source: string;

    public current_situation_elements: PtSituationElement[];

    private map_elements: Record<string, HTMLElement>;

    constructor(app_stage: App_Stage = 'INT', local_storage_service: LocalStorageService) {
        this.app_stage = app_stage;
        this.local_storage_service = local_storage_service;
        
        this.response_source = 'n/a';

        this.current_situation_elements = [];

        this.map_elements = {
            'stats_situation_nodes_no': document.getElementById('stats_situation_nodes_no') as HTMLSpanElement,
            'stats_situations_no': document.getElementById('stats_situations_no') as HTMLSpanElement,
            'stats_actions_no': document.getElementById('stats_actions_no') as HTMLSpanElement,
        };
    }

    public fetch_latest(completion: Response_Completion) {
        const stage_data = APP_CONFIG.map_stages[this.app_stage]
        let api_url = stage_data.api_url + '?rand=' + Date.now().toString();
        
        const requestHeaders = {
            "Content-Type": "application/xml",
            "Authorization": 'Bearer ' + stage_data.bearer_key,
        };

        const request = new Request(api_url, {
            headers: requestHeaders
        });

        console.log('STATS response: START fetch from ' + api_url);

        fetch(request).then(response => {
            if (response.ok) {
                this.response_source = 'API: ' + api_url;
                console.log('STATS response: DONE FETCH from ' + api_url);
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
            console.log('STATS response: DONE PARSE text()');

            const situationElementMatches: string[] = responseXMLText.match(/<PtSituationElement\b[^>]*>.*?<\/PtSituationElement>/gs) ?? [];
            console.log('STATS response: found ' + situationElementMatches.length + ' PtSituationElement nodes');
            this.map_elements['stats_situation_nodes_no'].innerHTML = '' + situationElementMatches.length;

            const situationElements: PtSituationElement[] = [];
            situationElementMatches.forEach(situationElementMatch => {
                const dom = new DOMParser().parseFromString(situationElementMatch, 'application/xml');
                const node = XPathHelpers.queryNode('/PtSituationElement', dom);
                if (node === null) {
                    return;
                }

                const situationElement = PtSituationElement.initFromSituationNode(node);
                if (situationElement) {
                    situationElements.push(situationElement);
                }
            });

            situationElements.sort((a,b) => b.creationTime.getDate() - a.creationTime.getDate()); 

            console.log('STATS response: generated ' + situationElements.length + ' PtSituationElement objects');
            this.map_elements['stats_situations_no'].innerHTML = '' + situationElements.length;

            const actionsNo = situationElements.reduce((acc, item) => acc + item.publishingActions.length, 0);
            this.map_elements['stats_actions_no'].innerHTML = '' + actionsNo;

            console.log('STATS response: generated ' + actionsNo + ' PublishingAction objects');

            this.current_situation_elements = situationElements;

            completion(situationElements, null);
        });
    }
}
