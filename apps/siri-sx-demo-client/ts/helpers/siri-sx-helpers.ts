export class SIRI_SX_Helpers {
  public static matchText(filterTexts: string[] | null, situationNumber: string, ownerRef: string | null): boolean {
    if (filterTexts === null) {
      return true;
    }

    if (filterTexts.includes(situationNumber)) {
      return true;
    }

    if (ownerRef === null) {
      return false;
    }

    const sanitizeOwnerRef = (s: string): string => {
      return s.trim().toLowerCase().replace('ch:1:sboid:', '');
    };

    ownerRef = sanitizeOwnerRef(ownerRef);

    const foundOwnerRef = filterTexts.find(filter_text => {
      filter_text = sanitizeOwnerRef(filter_text);
      return ownerRef === filter_text;
    }) ?? null;

    return foundOwnerRef !== null;
  }
}
