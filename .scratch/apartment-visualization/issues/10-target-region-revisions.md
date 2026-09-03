# 10: Target revisions at image regions

**What to build:** Let the user mark part of a generated apartment or room image, attach a change comment to that selection, and create a new visualization version focused on the marked region.

**Blocked by:** 09/Revise visualizations and browse versions

**Status:** ready-for-agent

- [ ] A user can create, adjust, and remove a region selection on a generated image before submitting a revision.
- [ ] The selected region remains visibly associated with its comment.
- [ ] Region coordinates are retained relative to the original image dimensions and remain accurate when the displayed image is resized.
- [ ] A region revision requires both a valid selection and a non-empty comment.
- [ ] The provider request includes the source visualization, revision comment, and normalized region.
- [ ] A successful region revision creates a new immutable version with lineage back to its source.
- [ ] The source and all other previous versions remain unchanged and viewable.
- [ ] A failed region revision preserves the selection and comment for retry.
- [ ] Region controls have labeled keyboard-accessible alternatives even if precise selection primarily uses a pointer.
- [ ] Automated tests cover coordinate normalization, resizing, validation, provider input, immutable history, and failure recovery.
