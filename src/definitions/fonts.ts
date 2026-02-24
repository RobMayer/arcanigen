export namespace Fonts {
    export const DEFINITIONS = {
        angerthas: {
            family: "Angerthas",
            url: "/fonts/angerthas.woff2",
        },
        futhark: {
            family: "Futhark",
            url: "/fonts/futhark.woff2",
        },
        anayanka: {
            family: "Anayanka",
            url: "/fonts/anayanka.woff2",
        },
        aurebesh: {
            family: "Aurebesh",
            url: "/fonts/aurebesh.woff2",
        },
        barazhad: {
            family: "Barazhad",
            url: "/fonts/barazhad.woff2",
        },
        cardosan: {
            family: "Cardosan",
            url: "/fonts/cardosan.woff2",
        },
        daedra: {
            family: "Daedra",
            url: "/fonts/daedra.woff2",
        },
        davek: {
            family: "Davek",
            url: "/fonts/davek.woff2",
        },
        dwemer: {
            family: "Dwemer",
            url: "/fonts/dwemer.woff2",
        },
        eladrin: {
            family: "Eladrin",
            url: "/fonts/eladrin.woff2",
        },
        exodite: {
            family: "Exodite",
            url: "/fonts/exodite.woff2",
        },
        falmer: {
            family: "Falmer",
            url: "/fonts/falmer.woff2",
        },
        gargish: {
            family: "Gargish",
            url: "/fonts/gargish.woff2",
        },
        iokharic: {
            family: "Iokharic",
            url: "/fonts/iokharic.woff2",
        },
        kargi: {
            family: "Kargi",
            url: "/fonts/kargi.woff2",
        },
        kehdrai: {
            family: "Kehdrai",
            url: "/fonts/kehdrai.woff2",
        },
        klinzhai: {
            family: "Klinzhai",
            url: "/fonts/klinzhai.woff2",
        },
        mage: {
            family: "Mage",
            url: "/fonts/mage.woff2",
        },
        maraseye: {
            family: "Maraseye",
            url: "/fonts/maraseye.woff2",
        },
        moria: {
            family: "Moria",
            url: "/fonts/moria.woff2",
        },
        qijomi: {
            family: "Qijomi",
            url: "/fonts/qijomi.woff2",
        },
        qonos: {
            family: "Qonos",
            url: "/fonts/qonos.woff2",
        },
        reanaarian: {
            family: "Reanaarian",
            url: "/fonts/reanaarian.woff2",
        },
        rellanic: {
            family: "Rellanic",
            url: "/fonts/rellanic.woff2",
        },
        rhesimol: {
            family: "Rhesimol",
            url: "/fonts/rhesimol.woff2",
        },
        sindarin: {
            family: "Sindarin",
            url: "/fonts/sindarin.woff2",
        },
        quenya: {
            family: "Quenya",
            url: "/fonts/quenya.woff2",
        },
        coremaic: {
            family: "Coremaic",
            url: "/fonts/coremaic.woff2",
        },
        clynese: {
            family: "Clynese",
            url: "/fonts/clynese.woff2",
        },
        kitisakkullian: {
            family: "Kitisakkullian",
            url: "/fonts/kitisakkullian.woff2",
        },
        huttese: {
            family: "Huttese",
            url: "/fonts/huttese.woff2",
        },
        sigali: {
            family: "Sigali",
            url: "/fonts/sigali.woff2",
        },
        warden: {
            family: "Warden",
            url: "/fonts/warden.woff2",
        },
        noldor: {
            family: "Noldor",
            url: "/fonts/noldor.woff2",
        },
        dottage: {
            family: "Dottage",
            url: "/fonts/dottage.woff2",
        },
    } as const;

    type Def = (typeof DEFINITIONS)[keyof typeof DEFINITIONS];

    const SORTED: [string, Def][] = (Object.entries(DEFINITIONS) as [string, Def][]).sort(([, a], [, b]) => a.family.localeCompare(b.family));

    export const ENUM: Record<string, { value: number; label: string }> = Object.fromEntries(
        SORTED.map(([key, def], i) => [key.toUpperCase(), { value: i, label: def.family }]),
    );

    export const familyOf = (enumValue: number): string => {
        const idx = Math.max(0, Math.min(enumValue, SORTED.length - 1));
        return SORTED[idx][1].family;
    };

    export const urlOf = (enumValue: number): string => {
        const idx = Math.max(0, Math.min(enumValue, SORTED.length - 1));
        return SORTED[idx][1].url;
    };

    const _byFamily = new Map<string, Def>();
    for (const def of Object.values(DEFINITIONS)) {
        _byFamily.set(def.family, def);
    }
    export const byFamily = (family: string): Def | undefined => _byFamily.get(family);
}
