export type App_Stage = 'PROD' | 'INT' | 'TEST'

export interface App_Stage_Data {
    stage: App_Stage
    api_url: string
    bearer_key: string
}

interface AppConfig {
    map_stages: Record<App_Stage, App_Stage_Data>
}

export const APP_CONFIG: AppConfig = {
    map_stages: {
        'PROD': {
            stage: 'PROD',
            api_url: 'https://tools.opentransportdata.swiss/data/siri-sx/siri_sx-latest-prod.xml',
            bearer_key: '',
        },
        'INT': {
            stage: 'INT',
            api_url: 'https://tools.opentransportdata.swiss/data/siri-sx/siri_sx-latest-int.xml',
            bearer_key: '',
        },
        'TEST': {
            stage: 'TEST',
            api_url: 'https://tools.opentransportdata.swiss/data/siri-sx/siri_sx-latest-test.xml',
            bearer_key: '',
        },
    }
}
