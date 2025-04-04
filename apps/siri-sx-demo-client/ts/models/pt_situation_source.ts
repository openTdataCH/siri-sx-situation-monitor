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
        const sourceType = XPathHelpers.queryText('Source/SourceType', node);
        if (!sourceType) {
            console.log('ERROR - cant PtSituationSource.initFromSituationNode')
            console.log(node);
            return null;
        }

        const countryRef = XPathHelpers.queryText('Source/CountryRef', node) ?? 'n/a CountryRef';

        const situationSource = new PtSituationSource(countryRef, sourceType);

        situationSource.name = XPathHelpers.queryText('Source/Name', node)
        situationSource.externalCode = XPathHelpers.queryText('Source/ExternalCode', node)

        return situationSource
    }
}
