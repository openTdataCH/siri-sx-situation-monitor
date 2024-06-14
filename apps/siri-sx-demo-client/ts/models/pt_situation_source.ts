import { XPathHelpers } from "../helpers/xpath"

export default class PtSituationSource {
    public countryRef: string
    public sourceType: string
    public name: string | null
    public externalCode: string | null

    constructor(countryRef: string, sourceType: string) {
        this.countryRef = countryRef
        this.sourceType = sourceType
        this.name = null
        this.externalCode = null
    }

    public static initFromSituationNode(node: Node): PtSituationSource | null {
        const countryRef = XPathHelpers.queryText('siri:Source/siri:CountryRef', node)
        const sourceType = XPathHelpers.queryText('siri:Source/siri:SourceType', node)
        
        if (!(countryRef && sourceType)) {
            console.log('ERROR - cant PtSituationSource.initFromSituationNode')
            console.log(node);
            return null;
        }

        const situationSource = new PtSituationSource(countryRef, sourceType);

        situationSource.name = XPathHelpers.queryText('siri:Source/siri:Name', node)
        situationSource.externalCode = XPathHelpers.queryText('siri:Source/siri:ExternalCode', node)

        return situationSource
    }
}
