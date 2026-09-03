# 05: Generate an empty apartment visualization

**What to build:** Let the user generate the first isometric apartment visualization after mapping is complete, even when no references have been supplied. The generated result should depict the mapped apartment as empty, with white walls and neutral floors.

**Blocked by:** 02/Map and name every room area

**Status:** ready-for-agent

- [ ] Apartment generation is unavailable until the floor-plan mapping is confirmed complete.
- [ ] Once mapping is complete, references are not required to request generation.
- [ ] A generation request includes the floor plan, room polygons, room types, and room names.
- [ ] The request explicitly asks for an isometric apartment with empty rooms, white walls, neutral floors, and no invented furniture.
- [ ] Generation runs through a replaceable visualization provider rather than vendor-specific behavior embedded in the project workflow.
- [ ] The editor shows an understandable pending state and prevents accidental duplicate submissions.
- [ ] A successful result is stored and displayed as an apartment visualization.
- [ ] A failed request leaves the floor plan and room mapping intact and can be retried.
- [ ] The interface explains that the result is a plausible concept image, not an editable 3D model or measured design.
- [ ] Automated tests use a deterministic fake provider to verify the request, success state, failure recovery, and displayed result.
