export type App_Stage = 'PROD' | 'INT' | 'TEST'

interface App_Stage_Data {
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
            api_url: 'https://api.opentransportdata.swiss/siri-sx',
            bearer_key: '57c5dbbbf1fe4d0001000018d335e64dd98e45919a81f62f051262b5',
        },
        'INT': {
            stage: 'INT',
            api_url: 'https://odpch-api.clients.liip.ch/siri-sx_int',
            bearer_key: '57c5dadd5e6307000100005ed14310e6a3664bd981d5ae2703689890',
        },
        'TEST': {
            stage: 'TEST',
            api_url: 'https://odpch-api.clients.liip.ch/siri-sx_test',
            bearer_key: '57c5dadd5e6307000100005eaafedab248ab4a0bb48e7dfb3d5df696',
        },
    }
}