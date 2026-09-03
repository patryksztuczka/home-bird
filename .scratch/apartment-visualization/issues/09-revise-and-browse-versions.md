# 09: Revise visualizations and browse versions

**What to build:** Let the user request a broad change to an apartment or room visualization with a text comment. Each revision creates a new immutable version, while earlier results remain available for comparison.

**Blocked by:** 06/Generate an apartment using resolved references; 07/Generate a selected room perspective

**Status:** ready-for-agent

- [ ] Every apartment and room visualization exposes an action for requesting a general revision.
- [ ] A revision requires a non-empty text comment.
- [ ] The revision request includes the source visualization, its original input snapshot, current applicable references, and the comment.
- [ ] A successful revision creates a new version rather than replacing the source image.
- [ ] Apartment revisions remain associated with the apartment and room revisions remain associated with the correct room.
- [ ] The user can browse versions in creation order and identify which version produced a later revision.
- [ ] Earlier successful versions remain viewable after later successes or failures.
- [ ] A failed revision preserves the comment for retry and does not damage any saved version.
- [ ] Changing project references does not rewrite the recorded input snapshot of an older version.
- [ ] Automated tests cover apartment and room revisions, immutable history, ordering, lineage, and failure recovery with a fake provider.
