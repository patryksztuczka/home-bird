# 07: Generate a selected room perspective

**What to build:** Let the user generate a visualization of one mapped room using either a chosen viewpoint or a Choose for me option. The room visualization uses the same apartment defaults and room overrides as whole-apartment generation.

**Blocked by:** 04/Attach room references and resolve overrides; 05/Generate an empty apartment visualization

**Status:** ready-for-agent

- [ ] A user can request generation while a mapped room is selected.
- [ ] The user can select a supported viewpoint or Choose for me.
- [ ] The request identifies the selected room and includes its geometry, floor-plan context, resolved references, and viewpoint choice.
- [ ] Apartment defaults and room overrides follow the same precedence rules as apartment generation.
- [ ] Missing references produce an empty room with white walls, a neutral floor, and no invented furniture.
- [ ] A successful result is stored and displayed as a room visualization associated with the correct room.
- [ ] A room generation failure preserves the project, references, and earlier visualizations and can be retried.
- [ ] The interface explains that separately generated perspectives may vary because there is no persistent 3D model.
- [ ] Automated tests verify explicit viewpoints, Choose for me, reference resolution, room association, and failure recovery with a fake provider.
