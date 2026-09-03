# 08: Import references from social-post links

**What to build:** Let the user paste a link to an Instagram, Facebook, Pinterest, or similar post and attempt to use its image as a component reference. If the source blocks extraction, guide the user to upload a screenshot instead.

**Blocked by:** 03/Attach apartment-wide references

**Status:** ready-for-agent

- [ ] A reference field accepts a social-post URL in addition to uploads and direct image URLs.
- [ ] Image extraction runs behind a replaceable service and does not expose source-specific behavior to the rest of the project workflow.
- [ ] A successfully extracted image receives the same preview, validation, scope, and replacement behavior as an uploaded image.
- [ ] The original source URL is retained with a successfully imported reference.
- [ ] Unsupported, inaccessible, or blocked posts produce a clear screenshot-upload fallback.
- [ ] Extraction failure does not remove the reference already assigned to that component.
- [ ] Private credentials or social-network login details are never requested.
- [ ] Automated tests cover successful extraction, blocked access, unsupported URLs, malformed URLs, and replacement behavior without contacting social networks.
