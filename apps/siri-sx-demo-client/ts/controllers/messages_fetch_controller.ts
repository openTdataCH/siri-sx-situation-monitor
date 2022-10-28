import { APP_CONFIG, App_Stage } from "../config/app_config";
import { XPathHelpers } from "../helpers/xpath";
import PtSituationElement from "../models/pt_situation_element";
import LocalStorageService from "./local_storage_service";

type Response_Completion = (response: PtSituationElement[], error: string | null) => void
interface  PTCacheResponse {
    cache_age: number
    elements: PtSituationElement[],
}

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
        const cacheResponse = this._load_elements_from_cache();
        if (cacheResponse) {
            this.response_source = 'CACHE ' + cacheResponse.cache_age + 'sec';
            this.current_situation_elements = cacheResponse.elements;
            completion(cacheResponse.elements, null);
            return;
        }

        const stage_data = APP_CONFIG.map_stages[this.app_stage]
        let api_url = stage_data.api_url;
        
        // BYPASS CERTIFICATE, CORS ISSUES
        api_url = 'https://tools.odpch.ch/tmp/cors-proxy?url=' + api_url;

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

    private _load_elements_from_cache(): PTCacheResponse | null {
        const cache_date_key = this._compute_results_date_cache_key();
        const cache_date = this.local_storage_service.getDate(cache_date_key);
        if (cache_date === null) {
            return null;
        }

        const max_cache_age = 55; // seconds
        const now = new Date();

        const diff_seconds = Math.round((now.getTime() - cache_date.getTime()) / 1000);
        if (diff_seconds > max_cache_age) {
            return null;
        }

        const cache_elements_list_key = this._compute_results_cache_key();
        const cache_elements_list: Record<string, any>[] | null = this.local_storage_service.getJSON(cache_elements_list_key, null);
        if (cache_elements_list === null) {
            return null;
        }

        const situation_elements: PtSituationElement[] = [];
        cache_elements_list.forEach(cache_element => {
            const situation_element = PtSituationElement.initFromJSON(cache_element);
            if (situation_element) {
                situation_elements.push(situation_element);
            }
        });

        const cacheResponse = <PTCacheResponse>{
            cache_age: diff_seconds,
            elements: situation_elements,
        }

        return cacheResponse;
    }

    private _compute_results_date_cache_key(): string {
        return 'PT_Situation_Elements_Cache_Date_' + this.app_stage;
    }

    private _compute_results_cache_key(): string {
        return 'PT_Situation_Elements' + this.app_stage;
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
            this._save_elements_to_cache(situationElements);

            completion(situationElements, null);
        });
    }

    private _save_elements_to_cache(situationElements: PtSituationElement[]): void {
        const now = new Date();

        const cache_date_key = this._compute_results_date_cache_key();
        this.local_storage_service.saveData(cache_date_key, now.toISOString());

        const cache_elements_list_key = this._compute_results_cache_key();
        this.local_storage_service.saveJSON(cache_elements_list_key, situationElements);
    }
}
