/*
 * Sketchpad for AbstractInput.Dimensioned
 * ========================================
 *
 * PROBLEM:
 * LengthInput has complex behavior that doesn't fit cleanly into AbstractInput.Text:
 * - Unit memory: remembers last unit used (px, pt, in, cm, mm)
 * - Bare number acceptance: "42" → "42px" (using last unit)
 * - Unit-aware bounds checking via Length.within()
 * - Arrow key stepping on numeric portion while preserving unit
 * - Revert-to-last-valid on invalid input
 *
 * We tried wrapping AbstractInput.Text (see git history), but:
 * - normalize() had to do side effects (updating refs) which felt wrong
 * - Arrow key stepping required intercepting onKeyDown
 * - Still ~160 lines vs original ~240 - modest savings
 *
 * PROPOSED SOLUTION:
 * Create AbstractInput.Dimensioned<T, U> that generalizes this pattern for any
 * unit-suffixed numeric type.
 *
 * USE CASES:
 * - Length: px, pt, in, cm, mm
 * - Angle (replacing current numeric-based AngleInput): deg, rad, turn
 * - Time: ms, s, m, h
 * - Currency: $, €, £ (prefix instead of suffix?)
 * - Data size: B, KB, MB, GB
 *
 * REQUIRED CONFIG:
 * type DimensionedConfig<U extends string> = {
 *     units: readonly U[];
 *     parse: (v: string) => [number, U] | null;
 *     format: (n: number, u: U) => string;  // e.g., `${n}${u}` or `$${n}`
 *     defaultUnit: U;
 *     // Optional:
 *     compare?: (a: string, b: string) => number;  // for bounds checking
 *     convert?: (n: number, from: U, to: U) => number;  // for unit conversion
 * };
 *
 * COMPONENT PROPS (similar to NumericProps):
 * - value: T
 * - onValue, onCommit, onConfirm
 * - min, max (as T, not number)
 * - step (as number, applied to numeric portion)
 * - precision (for numeric portion)
 * - required
 *
 * INTERNAL BEHAVIOR:
 * - Maintains lastUnitRef for unit memory
 * - Maintains lastValidRef for revert-on-invalid
 * - Pattern auto-generated from config.units
 * - normalize: bare number → append lastUnitRef.current
 * - Arrow keys: parse, step numeric portion, reformat with same unit
 * - Bounds checking uses config.compare or converts to common unit
 *
 * EXAMPLE USAGE:
 *
 * // In datatypes/length.tsx, add:
 * export const LengthConfig: DimensionedConfig<Length.Unit> = {
 *     units: Length.UNITS,
 *     parse: Length.parse,
 *     format: (n, u) => `${n}${u}`,
 *     defaultUnit: "px",
 *     compare: (a, b) => Length.asNumber(a) - Length.asNumber(b),
 * };
 *
 * // In inputs/LengthInput.tsx:
 * export const LengthInput = styled((props) => (
 *     <AbstractInput.Dimensioned config={LengthConfig} {...props} />
 * ))``;
 *
 * // For angles with units:
 * export const AngleConfig: DimensionedConfig<"deg" | "rad" | "turn"> = {
 *     units: ["deg", "rad", "turn"],
 *     parse: (v) => { ... },
 *     format: (n, u) => `${n}${u}`,
 *     defaultUnit: "deg",
 *     convert: (n, from, to) => { ... },  // deg↔rad↔turn conversion
 * };
 *
 * OPEN QUESTIONS:
 * - Should config be a prop or a generic parameter?
 * - How to handle prefix units like currency ($100 vs 100px)?
 * - Should wrapping (like current AngleInput) be supported?
 * - How to type the component so value/min/max are properly typed as T?
 */
