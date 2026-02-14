# UI/UX stuff

- [ ] Finish cleaning up component namespaces
    - [ ] Consolidate ColorInput and ColorInputHex into one ColorInput namespace (add picker, too)
- [ ] container/wrapper nodes for spacial organization
- [ ] drag and drop from node drawer onto viewport

# code quality

- [ ] svgCanvas resolver should use cache - eventually
- [ ] project state file is starting to get unwieldy - should we move cache into it's own file?
- [x] cyclical checks
    - [x] properly implement depemdsOn
    - [x] Custom Nodes needs special handling. we should not assume that all inputs rely on all outputs (or the inverse thereof). We need to cache the relationship between input-type nodes and output-type nodes on a per subgraph basis.
- [x] Project state needs cleanup.
    - [x] Types are all over the place - and is weirdly interleved with cycleDetection.
        - [ ] is cycleDetection really even in the right place?
    - [x] the initial state parser is rather hamfisted and should probably be properly re-written
        - [ ] load, save, merge
- [ ] dependency resolver feels weird to pass in graph and deps seperately, and how the dependsOn and contributesTo of nodeTypes can have the deps, but not the graph.

# tasks that will get completed as the system gets fleshed out

- [ ] more input/output node types

# componnet improvements

- [ ] rework the drag-pan system to use explicit ID'd and to use some internal state, maybe
- [ ] rework mouse drag to pointer drag
