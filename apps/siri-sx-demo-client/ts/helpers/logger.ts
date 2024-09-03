export default class Logger {
    public static logMessage(message: string, section: string = 'DEFAULT') {
        const logLineParts = [
            section,
            message
        ]

        const logLineS = logLineParts.join(' - ');
        console.log(logLineS)
    }

    public static log(anyObject: any) {
        console.log(anyObject);
    }
}