const mustacheRegex = /\{\{\s*(.+?)\s*\}\}/gu;

const parser = new DOMParser();

function _template(str, ...exprs) {
    const doc = parser.parseFromString(
        str.reduce((a, c, i) => a + exprs[i] + c),
        "text/html"
    );
    const iterator = doc.createNodeIterator(doc.body, NodeFilter.SHOW_ALL);
    const postProcess = [];
    const props = new Map();
    let cNode;
    while ((cNode = iterator.nextNode())) {
        const node = cNode;
        if (node instanceof Text) {
            const fullText = node.textContent;
            let newNodes = [];
            let lastIndex = 0;
            for (const match of fullText.matchAll(mustacheRegex)) {
                const name = match[1].trim();
                newNodes.push(
                    doc.createTextNode(fullText.slice(lastIndex, match.index))
                );

                const reactiveNode = doc.createTextNode("");
                newNodes.push(reactiveNode);

                const propHandlers = props.get(name) ?? new Set();
                propHandlers.add(
                    (data) => (reactiveNode.textContent = data?.[name] ?? "")
                );
                props.set(name, propHandlers);

                lastIndex = match.index + match[0].length;
            }
            newNodes.push(doc.createTextNode(fullText.slice(lastIndex)));
            postProcess.push(() => node.replaceWith(...newNodes));
        } else if (node instanceof HTMLElement) {
            const attributes = node.getAttributeNames();
            for (const attr of attributes) {
                const value = node.getAttribute(attr);
                if (value.match(mustacheRegex)) {
                    const handlers = (data = {}) =>
                        node.setAttribute(
                            attr,
                            value.replace(mustacheRegex, (_, x) => {
                                const trimmed = x.trim();
                                if (
                                    typeof data === "object" &&
                                    trimmed in data
                                ) {
                                    return data[trimmed];
                                }
                                return "";
                            })
                        );
                    for (const [, rawName] of value.matchAll(mustacheRegex)) {
                        const name = rawName.trim();
                        const propHandlers = props.get(name) ?? new Set();
                        propHandlers.add(handlers);
                        props.set(name, propHandlers);
                    }
                }
            }
        }
    }

    postProcess.forEach((fn) => fn());

    const frag = document.createDocumentFragment();
    frag.append(...doc.body.childNodes);
    return { frag, props };
}

export function reactiveEl(str, ...exprs) {
    const { frag, props } = _template(str, exprs);
    if (frag.childNodes.length > 1)
        throw new Error("There can only be one root element");
    const child = frag.childNodes[0];
    let oldData = null;

    const forceUpdate = (data) => {
        for (const [, values] of props) {
            for (const fn of values) {
                fn(data);
            }
        }

        const event = new CustomEvent("update", {
            detail: { data, oldData },
        });

        oldData = data;
        child.dispatchEvent(event);

        return child;
    };

    const update = (data) => {
        if (data === oldData) return;
        return forceUpdate(data);
    };

    child.update = update;
    child.forceUpdate = forceUpdate;

    return child;
}

export function template(str, ...exprs) {
    const { frag, props } = _template(str, exprs);

    for (const [, values] of props) {
        for (const fn of values) {
            fn(data);
        }
    }

    return frag.cloneNode();
}
