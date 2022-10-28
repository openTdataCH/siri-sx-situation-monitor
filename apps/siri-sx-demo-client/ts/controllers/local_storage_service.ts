export default class LocalStorageService {
    private keyPrefix: string;

    constructor(keyPrefix: string = 'FILL_LocalStorageService_PREFIX') {
        this.keyPrefix = keyPrefix;
    }

    public saveData(key: string, value: string) {
        localStorage.setItem(this.keyPrefix + '-' + key, value);
    }

    public saveJSON(key: string, value: any) {
        localStorage.setItem(this.keyPrefix + '-' + key, JSON.stringify(value));
    }

    public getData(key: string) {
        return localStorage.getItem(this.keyPrefix + '-' + key)
    }

    public getDate(key: string): Date | null {
        const dateS = this.getData(key);
        if (dateS) {
            const date = new Date(dateS);
            if (date && typeof date.getMonth === 'function') {
                return date;
            }
        }

        return null;
    }

    public getJSON(key: string, fallback: any = {}) {
        const jsonS = localStorage.getItem(this.keyPrefix + '-' + key);
        if (jsonS === null) {
            return fallback;
        }
        
        return JSON.parse(jsonS);
    }
    
    public removeData(key: string) {
        localStorage.removeItem(this.keyPrefix + '-' + key);
    }

    public clearData() {
        localStorage.clear();
    }
}
