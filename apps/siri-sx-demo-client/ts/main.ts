import Messages_Fetch_Controller from "./controllers/messages_fetch_controller";
import Messages_Render_Controller from "./controllers/messages_render_controller";
import Message_Embed_Controller from './controllers/messages_embed_controller';
import Messages_Embed_Filter_Controller from "./controllers/messages_embed_filter_controller";
import { App_Stage } from "./config/app_config";
import LocalStorageService from "./controllers/local_storage_service";

const urlParams = new URLSearchParams(window.location.search);
const app_stage: App_Stage = (urlParams.get('app_stage') as App_Stage) ?? 'INT';

type PageType = 'home' | 'embed';
const page_type: PageType = (<any>window).APP_VARS['page_type'] ?? 'home';

const local_storage_service = new LocalStorageService('siri-sx-poc-v1-');

const messages_fetch_controller = new Messages_Fetch_Controller(app_stage, local_storage_service);

if (page_type === 'home') {
    const messages_render_controller = new Messages_Render_Controller();

    messages_fetch_controller.fetch_latest(situationElements => {
        messages_render_controller.renderHTML(situationElements);
    });
}

if (page_type === 'embed') {
    const messages_embed_controller = new Message_Embed_Controller(messages_fetch_controller);
    messages_fetch_controller.app_stage = messages_embed_controller.filter_app_stage;
    
    if (messages_embed_controller.has_debug_mode) {
        let gui_filter_controller = new Messages_Embed_Filter_Controller(messages_embed_controller);
        gui_filter_controller.init();
    }

    messages_embed_controller.fetchAndRenderLatest();
}
