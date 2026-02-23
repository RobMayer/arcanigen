# UI/UX stuff

- [ ] Finish cleaning up component namespaces
    - [ ] Consolidate ColorInput and ColorInputHex into one ColorInput namespace (add picker, too)
- [ ] container/wrapper nodes for spacial organization - maybe?
- [ ] drag and drop from node drawer onto viewport
- [x] resize observer on viewport of drag-pane
- [x] sliders for integer and float, already

# code quality

- [x] Redesign the DragPane API
- [ ] svgCanvas resolver should use cache - eventually
- [x] project state file is starting to get unwieldy - should we move cache into it's own file?
- [x] cyclical checks
    - [x] properly implement depemdsOn
    - [x] Custom Nodes needs special handling. we should not assume that all inputs rely on all outputs (or the inverse thereof). We need to cache the relationship between input-type nodes and output-type nodes on a per subgraph basis.
- [x] Project state needs cleanup.
    - [x] Types are all over the place - and is weirdly interleved with cycleDetection.
        - [ ] is cycleDetection really even in the right place?
    - [x] the initial state parser is rather hamfisted and should probably be properly re-written
        - [ ] load, save, merge

# tasks that will get completed as the system gets fleshed out

- [x] more input/output node types
- [x] more shapes (to convert from previous app)
    - [x] Arc (has a bug in the old implementation)
    - [x] Spiral
    - [x] Line
    - [x] Flood Fill
    - [x] Custom Glyph
    - [x] Text Path (ugh)
- [x] Figure out Style Overrides
- [x] Transform Node (translation, pre-rotation, post-rotation, skew, scale)
- [x] Radial Array (similar interface as Burst)
- [x] Figure out Conformal Paths
- [x] Value iterator (float, integer, length) - (should we include angle in this too or have a different node for angles because it has extra gubbins like angular wrap direction - see hue on color iterator?)
- [x] Equality test (A == B)
- [x] Within tolerance test (A == B +/- C)
- [x] Between test (A <= B <= C)
- [x] Comparison tests (<, >, <=, >=)
- [ ] Color Split
- [ ] Color Join
- [ ] Color Adjust?
- [x] Can we make the type prop on <SocketIn/> and <SocketOut/> redundant by using a properly memoized return of getSocketType(...) - with the idea that we could concat the list of types with either " | " or " & " depending on that socket rule's mode? _THIS MUST NOT CAUSE RE-RENDER CHURN_
- [x] Note Node
- [x] remove reliance on "offset-path" and other css properties in the svg output
- [x] clip Node (like mask, but uses a Path input instead)

# componnet improvements

- [x] rework mouse drag to pointer drag

# Nice to haves, maybe

- [ ] colorStops datatypes - think colorStops is to ColorIterator as layers datatype is to LayerNode (a collection of multiple color stops that overrides the dynamic list of color stops in the ColorIterator node). Could be recycled for a Gradient node type as well.
    - [ ] support for gradients in (most?) sockets that currently also take a fill would be nice.

- [ ] more shapes (new, maybe?)
    - [ ] Banded Star (circle, polygon, and polygram are to ring, polyring, and knot as star is to this)
    - [ ] Banded Burst (circle, polygon, and polygram are to ring, polyring, and knot as burst is to this)
    - [ ] Banded Arc
    - [ ] Banded Spiral
    - [ ] Banded Line
    - [x] Merged Knot (like knot but without overlap - complex as fuck)
- [ ] Figure out Random Seed mechanism
- [ ] allow subgraphs to have a custom icon or an icon selector, I guess - maybe?
- [ ] rework the drag-pan system to use explicit ID'd and to use some internal state, maybe
