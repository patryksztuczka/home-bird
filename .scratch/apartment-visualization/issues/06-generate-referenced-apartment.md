# 06: Generate an apartment using resolved references

**What to build:** Let the user generate an isometric apartment that combines apartment-wide defaults with room-specific overrides while keeping every unspecified room or component plain and empty.

**Blocked by:** 04/Attach room references and resolve overrides; 05/Generate an empty apartment visualization

**Status:** ready-for-agent

- [ ] The generation request resolves references independently for every mapped room.
- [ ] Apartment references apply to each room unless that room has an override for the same component.
- [ ] Room overrides are sent instead of, not alongside, the conflicting apartment component.
- [ ] Component references request a close visual match and Overall style references request general inspiration.
- [ ] A room with no references remains empty with white walls and a neutral floor.
- [ ] An unspecified component is not silently decorated or furnished.
- [ ] The resulting image is stored and displayed as a new apartment visualization.
- [ ] Existing visualizations and all project inputs survive successful and failed generation attempts.
- [ ] The product does not warn, score, or block combinations of styles and materials.
- [ ] Automated tests verify resolved defaults, overrides, neutral omissions, provider failure, and the absence of style judgments.
