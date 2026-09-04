# Context Map

## Contexts

- [Apartment](./apps/api/src/modules/apartment/CONTEXT.md): mapping one property's floor plan, references, and generated visualizations
- [Todo](./apps/api/src/modules/todo/CONTEXT.md): capturing and listing the things a user intends to get done — starter scaffolding, no longer the product entry point

## Relationships

- **Apartment → web**: `apps/web/src/modules/apartment` is a client of the Apartment context. It holds the project editor and the create form, consumes the api's tRPC router type-only, and holds no domain rules of its own. tRPC is the only transport: floor plan images are read back through it as base64 rather than a separate HTTP route.
- **Apartment ↔ shared**: the context's input schemas live in `@home-bird/shared/apartment-project`, `@home-bird/shared/room-area` and `@home-bird/shared/apartment-reference`, and are used verbatim on both sides — as tRPC procedure inputs in the api and as form resolvers in the web app. The floor-plan image checks (supported types, size, signature) and the room boundary rules (point count, repeated points, self-intersection, minimum area) live there too, so the browser and the api agree on what is readable and what is drawable. What makes bytes a readable image at all — the accepted formats, the size ceiling, the file signatures — sits once in `@home-bird/shared/image-file`, which floor plans and references both build their own wording on top of.
- **Todo ↔ shared**: the context's input schemas live in `@home-bird/shared/todo` and are used as tRPC procedure inputs in the api. No web client remains; the module can be removed once nothing depends on it.
