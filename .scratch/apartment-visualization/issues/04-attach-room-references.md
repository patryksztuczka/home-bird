# 04: Attach room references and resolve overrides

**What to build:** Let the user select a mapped room and attach references that apply only to it. The room receives apartment defaults where no room reference exists and overrides the matching apartment component where one does exist.

**Blocked by:** 02/Map and name every room area; 03/Attach apartment-wide references

**Status:** ready-for-agent

- [ ] Selecting a room on the floor plan opens that room's reference panel and clearly shows its scope.
- [ ] Every room offers the common component fields.
- [ ] Relevant room types also offer Furniture, Cabinets, Countertops, Appliances, Bathroom fixtures, and Other fields.
- [ ] A user can attach, preview, replace, and remove one image per room component.
- [ ] A room inherits an apartment component reference when it has no reference for that component.
- [ ] A room reference overrides the matching apartment reference without changing the apartment default or other rooms.
- [ ] The interface distinguishes inherited apartment references from explicit room references.
- [ ] Switching between rooms never moves or copies references into the wrong scope.
- [ ] The API can return the resolved reference set for a room in a deterministic form.
- [ ] Automated tests cover inherited defaults, room overrides, removal of an override, and isolation between rooms.
