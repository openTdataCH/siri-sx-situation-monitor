import { App_Stage } from "../config/app_config";
import { DOM_Helpers } from "../helpers/DOM_Helpers";
import { LangEnum, ScopeType, TextualContentSizeEnum } from "../models/pt_all.interface";
import Messages_Embed_Controller from "./messages_embed_controller";

type EventListenerCompletion = (ev: any) => void;
type EventListenerType = 'ChangeForm' | 'ReloadData'

export default class Messages_Embed_Filter_Controller {
    private messages_embed_controller: Messages_Embed_Controller

    private map_elements: Record<string, HTMLElement>;
    private map_listeners: Record<EventListenerType, EventListenerCompletion[]>;

    constructor(messages_embed_controller: Messages_Embed_Controller) {
        this.messages_embed_controller = messages_embed_controller;

        this.map_elements = {
            'stage_select': document.getElementById('filter_stage') as HTMLSelectElement,
            'lang_select': document.getElementById('filter_lang') as HTMLSelectElement,
            'owner_refs_input': document.getElementById('filter_owner_refs') as HTMLInputElement,
            'scope_type_select': document.getElementById('filter_scope_type') as HTMLSelectElement,
            'text_size_select': document.getElementById('filter_text_size') as HTMLSelectElement,
            'filter_active': document.getElementById('filter_active') as HTMLSelectElement,
            'response_source': document.getElementById('response_source') as HTMLSpanElement,
        };
        this._init_GUI_Elements();

        this.map_listeners = {
            'ChangeForm': [],
            'ReloadData': [],
        };

        this._build_filter_url();

        document.querySelectorAll('.debug-container').forEach(el => {
            const htmlEl = el as HTMLElement;
            DOM_Helpers.removeClassName(htmlEl, 'd-none');
        });
    }

    public init() {
        this._init_listeners();
        this._updateResponseSource();

        this.addListener('ChangeForm', (ev) => {
            this.messages_embed_controller.renderLatest();
        });

        this.addListener('ReloadData', (app_stage: App_Stage) => {
            this.messages_embed_controller.messages_fetch_controller.app_stage = app_stage;
            this.messages_embed_controller.fetchAndRenderLatest();
        });

        this.messages_embed_controller.addListener('NewData', ev => {
            this._updateResponseSource();
        });
    }

    private _init_GUI_Elements() {
        (this.map_elements['stage_select'] as HTMLSelectElement).value = this.messages_embed_controller.filter_app_stage;
        (this.map_elements['lang_select'] as HTMLSelectElement).value = this.messages_embed_controller.filter_lang;
        (this.map_elements['text_size_select'] as HTMLSelectElement).value = this.messages_embed_controller.filter_text_size;
        (this.map_elements['filter_active'] as HTMLSelectElement).value = this.messages_embed_controller.filter_is_active ? 'active' : 'all';

        let filter_owner_refs = '';
        if (this.messages_embed_controller.filter_owner_refs) {
            filter_owner_refs = this.messages_embed_controller.filter_owner_refs.join(',');
        const filter_scope_type_s = this.messages_embed_controller.filter_scope_type ?? 'all';
        (this.map_elements['scope_type_select'] as HTMLSelectElement).value = filter_scope_type_s;
        }
        (this.map_elements['owner_refs_input'] as HTMLInputElement).value = filter_owner_refs;
    }

    private _init_listeners() {
        const stage_select = this.map_elements['stage_select'] as HTMLSelectElement;
        stage_select.addEventListener('change', ev => {
            this.messages_embed_controller.filter_app_stage = stage_select.value as App_Stage;
            this._build_filter_url();
            
            this.map_listeners['ReloadData'].forEach(completion => {
                completion(stage_select.value);
            });
        });

        const lang_select = this.map_elements['lang_select'] as HTMLSelectElement;
        lang_select.addEventListener('change', ev => {
            this.messages_embed_controller.filter_lang = lang_select.value as LangEnum;
            this._update_on_change();
        });

        const owner_refs_input = this.map_elements['owner_refs_input'] as HTMLInputElement;
        owner_refs_input.addEventListener('change', ev => {
            this._update_filter_owner_refs(owner_refs_input);
            this._update_on_change();
        });

        const text_size_select = this.map_elements['text_size_select'] as HTMLSelectElement;
        text_size_select.addEventListener('change', ev => {
            this.messages_embed_controller.filter_text_size = text_size_select.value as TextualContentSizeEnum;
            this._update_on_change();
        });

        const active_elements_select = this.map_elements['filter_active'] as HTMLSelectElement;
        active_elements_select.addEventListener('change', ev => {
            this.messages_embed_controller.filter_is_active = active_elements_select.value === 'active'
            this._update_on_change();
        });

        const scope_type_select = this.map_elements['scope_type_select'] as HTMLSelectElement;
        scope_type_select.addEventListener('change', ev => {
            const filter_value = scope_type_select.value === 'all' ? null : scope_type_select.value as ScopeType;
            this.messages_embed_controller.filter_scope_type = filter_value;
            this._update_on_change();
        });
    }

    private _updateResponseSource() {
        const response_source = this.messages_embed_controller.messages_fetch_controller.response_source;
        this.map_elements['response_source'].innerHTML = response_source;
    }

    private _update_filter_owner_refs(input_el: HTMLInputElement) {
        const owner_refs_s = input_el.value.trim();
        if (owner_refs_s === '') {
            this.messages_embed_controller.filter_owner_refs = null;
        } else {
            this.messages_embed_controller.filter_owner_refs = owner_refs_s.split(',');
        }
    }

    private _build_filter_url() {
        const query_string_params: Record<string, string> = {};

        query_string_params['app_stage'] = this.messages_embed_controller.filter_app_stage;
        query_string_params['lang'] = this.messages_embed_controller.filter_lang;

        if (this.messages_embed_controller.filter_owner_refs) {
            query_string_params['owner_refs'] = this.messages_embed_controller.filter_owner_refs.join(',');
        }

        if (this.messages_embed_controller.filter_is_active) {
            query_string_params['active'] = '1';
        }

        query_string_params['text_size'] = this.messages_embed_controller.filter_text_size;
        
        const qs = new URLSearchParams(query_string_params).toString();

        const url_button_el = document.getElementById('filter_url_builder') as HTMLAnchorElement;
        url_button_el.href = 'embed.html?' + qs;
    }

    public addListener(type: EventListenerType, completion: EventListenerCompletion) {
        this.map_listeners[type].push(completion);
    }

    private _update_on_change() {
        this._build_filter_url();
        this.map_listeners['ChangeForm'].forEach(completion => {
            completion(null);
        });
    }
}
