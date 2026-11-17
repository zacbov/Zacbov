let embedded;
export async function readData(name, url) {
    if (embedded === undefined) {
        try {
            const node = document.getElementById('camelot-data');
            embedded = node ? JSON.parse(node.textContent ?? 'null') : null;
        } catch  {
            embedded = null;
        }
    }
    if (embedded && name in embedded) return embedded[name];
    return (await fetch(url)).json();
}
