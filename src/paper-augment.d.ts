// paper.js's bundled types mark `getCrossings(path)`'s parameter as required, but the runtime treats
// it as optional — omitting it returns the path's self-crossings (see paper-core `getIntersections`:
// `var self = this === path || !path`). Merge an optional-arg overload into the global `paper.PathItem`
// so `item.getCrossings()` (self-crossings, used by fromCrossings) type-checks.
declare namespace paper {
    interface PathItem {
        getCrossings(path?: PathItem): CurveLocation[];
    }
}
