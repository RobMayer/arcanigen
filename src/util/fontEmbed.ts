import { Fonts } from "../definitions/fonts";

const cache = new Map<string, string>();

const fetchFontAsBase64 = async (family: string, url: string): Promise<string> => {
    const cached = cache.get(family);
    if (cached) return cached;

    const response = await fetch(url);
    const buffer = await response.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    const binary = Array.from(bytes, (b) => String.fromCharCode(b)).join("");
    const b64 = btoa(binary);

    const block = `@font-face { font-family: "${family}"; src: url("data:font/woff2;base64,${b64}") format("woff2"); }`;
    cache.set(family, block);
    return block;
};

const collectUsedFonts = (svg: SVGSVGElement): Set<string> => {
    const families = new Set<string>();
    const texts = svg.querySelectorAll("text");
    for (const text of texts) {
        const ff = text.getAttribute("font-family");
        if (ff) families.add(ff);
    }
    return families;
};

export const buildExportSvg = async (svg: SVGSVGElement): Promise<string> => {
    const families = collectUsedFonts(svg);

    const blocks: string[] = [];
    const fetches: Promise<void>[] = [];

    for (const family of families) {
        const def = Fonts.byFamily(family);
        if (!def) continue;
        fetches.push(
            fetchFontAsBase64(family, def.url).then((block) => {
                blocks.push(block);
            }),
        );
    }

    await Promise.all(fetches);

    const clone = svg.cloneNode(true) as SVGSVGElement;

    if (blocks.length > 0) {
        const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
        const style = document.createElementNS("http://www.w3.org/2000/svg", "style");
        style.textContent = blocks.join("\n");
        defs.appendChild(style);
        clone.insertBefore(defs, clone.firstChild);
    }

    const serializer = new XMLSerializer();
    return '<?xml version="1.0" encoding="UTF-8"?>\n' + serializer.serializeToString(clone);
};
