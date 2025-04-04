export class DOM_Helpers {
    static addClassName(dom_node: HTMLElement, input_class_name: string) {
        const input_class_names = input_class_name.split(' ');

        input_class_names.forEach(class_name => {
            const class_names = dom_node.className.split(' ');
            const class_name_idx = class_names.indexOf(class_name);
            const has_class_name = class_name_idx !== -1;

            if (has_class_name) {
                return;
            }

            class_names.push(class_name);
            dom_node.className = class_names.join(' ');
        });
    }

    static removeClassName(dom_node: HTMLElement, input_class_name: string) {
        const input_class_names = input_class_name.split(' ');

        input_class_names.forEach(class_name => {
            const class_names = dom_node.className.split(' ');
            const class_name_idx = class_names.indexOf(class_name);
            const has_class_name = class_name_idx !== -1;
    
            if (!has_class_name) {
                return;
            }
    
            class_names.splice(class_name_idx, 1);
            dom_node.className = class_names.join(' ');
        });
    }

    static hasClassName(el: HTMLElement, class_name: string) {
        const has_class_name = el.className.indexOf(class_name) !== -1;
        return has_class_name;
    }
    
    public static findParentWithClass(element: HTMLElement, className: string): HTMLElement | null {
        let currentElement: HTMLElement | null = element;
    
        while (currentElement) {
            if (DOM_Helpers.hasClassName(currentElement, className)) {
                return currentElement;
            }
            currentElement = currentElement.parentElement;
        }
    
        return null;
    }

    public static findChildrenWithClassName(el: HTMLElement, className: string): HTMLElement[] {
        const matchingElements = el.querySelectorAll('.' + className);
        const elements = Array.from(matchingElements) as HTMLElement[];
        return elements;
    }

    public static formatNodeXML(node: Node): string {
        const serializer = new XMLSerializer();
        const xmlString = serializer.serializeToString(node);
        const xmlStringF = DOM_Helpers.formatXMLString(xmlString);

        return xmlStringF;
    }

    private static formatXMLString(xml: string): string {
        const PADDING = ' '; // Define the indentation
        const reg = /(>)(<)(\/*)/g;
        let formatted = "";
        let pad = 0;
      
        // Add new lines and indentation
        xml = xml.replace(reg, "$1\r\n$2$3");
        xml.split("\r\n").forEach((node) => {
            let indent = 0;
            if (node.match(/.+<\/\w[^>]*>$/)) {
                indent = 0;
            } else if (node.match(/^<\/\w/)) {
                if (pad !== 0) {
                    pad -= 1;
                }
            } else if (node.match(/^<\w([^>]*[^\/])?>.*$/)) {
                indent = 1;
            } else {
                indent = 0;
            }
      
            formatted += PADDING.repeat(pad) + node + "\r\n";
            pad += indent;
        });
      
        return formatted.trim();
    }
}