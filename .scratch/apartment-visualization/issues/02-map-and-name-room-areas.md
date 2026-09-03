# 02: Map and name every room area

**What to build:** Let the user map the apartment by drawing room boundaries over the floor plan. Each valid area receives a predefined room type and may receive a custom name. The user can correct mistakes and confirm when the complete interior has been mapped.

**Blocked by:** 01/Create an apartment project with a floor plan

**Status:** ready-for-agent

- [ ] A user can draw a polygonal room area over the floor plan.
- [ ] Boundary points can be moved, added, and removed before or after saving the room.
- [ ] Self-intersecting, degenerate, or otherwise invalid polygons cannot be saved.
- [ ] Each area requires a predefined room type and accepts an optional custom name.
- [ ] Saved areas remain aligned with the floor plan when the editor is resized.
- [ ] A user can select, rename, redraw, and delete an existing room area.
- [ ] The editor visibly distinguishes mapped areas and the currently selected room.
- [ ] The user can confirm that all interior areas are mapped only when every saved room is valid.
- [ ] Generation remains unavailable until mapping has been confirmed complete.
- [ ] Automated tests cover room creation, correction, deletion, validation, and mapping readiness through externally visible behavior.
