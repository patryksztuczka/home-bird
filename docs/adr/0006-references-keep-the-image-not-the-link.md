# References keep the image, not the link

A reference attached by link is fetched once, at the moment it is attached, and the bytes are kept in image storage exactly as an uploaded image is; the link is retained only as a note of where the image came from. Keeping the link alone would have been lighter, but the reference would rot silently when the host changed, previews would depend on that host's CORS and uptime, and generation would later be handed an image nobody had verified was an image.

## Consequences

Attaching by link makes one outbound request, so the api now talks to hosts it does not control. That call sits behind `ImageFetcher`, a service as narrow as `ImageStorage`, which is what lets tests attach a link without leaving the process.
