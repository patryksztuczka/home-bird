# 03: Attach apartment-wide references

**What to build:** Let the user select the whole apartment and attach one visual reference to each common component. References can come from a local image or a directly accessible image URL and act as defaults for the apartment.

**Blocked by:** 01/Create an apartment project with a floor plan

**Status:** done

- [x] The editor has an explicit Whole apartment selection whose scope remains visible.
- [x] The apartment panel offers Overall style, Floor, Walls, Ceiling, Doors, Windows, and Lighting fields.
- [x] A user can attach a supported local image to any component field.
- [x] A user can attach a directly accessible image URL to any component field.
- [x] Every attached reference has a visible preview and component label.
- [x] Adding another image to the same apartment component replaces the previous image after clear confirmation.
- [x] A user can remove a reference without affecting other fields.
- [x] Overall style is recorded as general inspiration while other component references request a close visual match.
- [x] Invalid files and inaccessible direct image URLs produce actionable errors without losing existing references.
- [x] Automated tests cover attaching, replacing, removing, validating, and retrieving apartment references without contacting external image hosts.
