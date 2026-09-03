# Apartment visualization MVP

## Problem Statement

People collect interior references from Instagram, Facebook, Pinterest, and other sources, but those references remain disconnected. A flooring photo, bathroom idea, door style, and kitchen image do not show whether the choices work together in one apartment.

The user needs a simple way to map references onto a real apartment floor plan and generate a coherent visual impression of the property. Existing mood boards do not place ideas in the user's apartment, while full 3D design tools require too much modeling work.

The MVP must provide a plausible visualization, not a dimensionally accurate or buildable design. Generated perspectives may vary because the product uses image generation rather than a persistent 3D model.

## Solution

The product centers on an apartment project. The user uploads a required floor plan, draws the boundary of every room, assigns each area a room type and optional name, and attaches reference images to apartment-wide or room-specific component fields.

Apartment-wide references act as defaults. A room-specific reference for the same component overrides the apartment reference. Component references should be followed closely. An overall-style reference provides general inspiration instead.

After mapping the complete apartment, the user can generate either:

- An isometric visualization of the whole apartment
- A visualization of one selected room from a chosen perspective

References are optional once all areas have been mapped. Rooms without references appear empty, with plain white walls and neutral floors. The application does not judge whether the user's choices match. It visualizes the requested combination.

The user can refine a generated image with a general comment or a comment attached to a selected image region. Each regeneration creates a new version and preserves previous versions.

The primary editing experience targets desktop web. The floor plan remains the center of the editor. Selecting the whole apartment or one room opens the applicable reference fields in a side panel. Before the first generation, the user sees the uploaded and annotated floor plan. The isometric view appears only after the user requests it.

## User Stories

1. As a user, I want to create an apartment project, so that I can collect one property's floor plan, references, and visualizations in one place.
2. As a user, I want to upload a floor plan, so that generated images can follow my apartment's shape.
3. As a user, I want the application to require a floor plan, so that an apartment visualization is not based on invented geometry.
4. As a user, I want to see the uploaded floor plan before generating anything, so that I can verify that I selected the correct file.
5. As a user, I want to draw an area around every room, so that I control how the floor plan is divided.
6. As a user, I want to add, move, and remove boundary points, so that I can correct a room outline.
7. As a user, I want the editor to prevent invalid room polygons, so that generation does not receive unusable geometry.
8. As a user, I want to see which areas remain unmapped, so that I know why the apartment is not ready for generation.
9. As a user, I want every interior area to be mapped before generating the apartment, so that no part of the floor plan is left ambiguous.
10. As a user, I want to choose a predefined room type, so that the generator knows whether an area is a kitchen, bathroom, bedroom, or another kind of room.
11. As a user, I want to give a room an optional custom name, so that I can distinguish rooms of the same type.
12. As a user, I want to select a room directly on the floor plan, so that I can edit its references without searching through a long form.
13. As a user, I want to select the whole apartment, so that I can define references that apply everywhere.
14. As a user, I want the selected apartment or room scope to remain visible, so that I know where a new reference will apply.
15. As a user, I want common component fields for overall style, floor, walls, ceiling, doors, windows, and lighting, so that I can describe the main visual choices consistently.
16. As a user, I want optional room-specific fields for furniture, cabinets, countertops, appliances, and bathroom fixtures, so that each room can contain relevant details.
17. As a user, I want an Other component field, so that I can provide a reference that does not fit the predefined fields.
18. As a user, I want to attach one image to a component within a scope, so that the generator receives an unambiguous primary reference.
19. As a user, I want to replace a component image, so that I can change my mind without keeping conflicting references.
20. As a user, I want to upload a reference image from my device, so that I can use screenshots and saved photos.
21. As a user, I want to paste a direct image URL, so that I do not need to download an accessible image first.
22. As a user, I want to paste a link to a social post, so that the application can attempt to extract its reference image.
23. As a user, I want clear instructions to upload a screenshot when a social site blocks extraction, so that I can continue without troubleshooting the source site.
24. As a user, I want to preview an attached reference, so that I can check that the application captured the right image.
25. As a user, I want apartment-wide component references to act as defaults, so that I do not need to repeat the same flooring, doors, or windows for every room.
26. As a user, I want a room-specific component reference to override the apartment default, so that spaces such as bathrooms can use different materials.
27. As a user, I want component references to be followed closely, so that a flooring image means the generated floor should resemble that image.
28. As a user, I want overall-style references to guide the general appearance rather than represent one literal object, so that the generator can apply the style throughout the requested scope.
29. As a user, I want to generate after mapping all areas even if I have not attached references, so that I can begin with an empty apartment.
30. As a user, I want rooms without references to appear empty with white walls and neutral floors, so that the application does not invent a design I did not request.
31. As a user, I want to generate an isometric image of the whole apartment, so that I can see how the property looks as one composition.
32. As a user, I want the isometric visualization to appear only after I request generation, so that the setup screen remains focused on the floor plan.
33. As a user, I want to generate a visualization of one selected room, so that I can work room by room.
34. As a user, I want to choose a room viewpoint, so that I can inspect the room from a useful direction.
35. As a user, I want a Choose for me viewpoint option, so that I can generate a room without making another decision.
36. As a user, I want the generated image to respect the floor plan, room shape, and major openings where possible, so that it resembles my property.
37. As a user, I want the product to state that visualizations are plausible concepts rather than measured designs, so that I do not mistake them for construction documents.
38. As a user, I want the product to avoid judging whether my style choices match, so that I remain in control of the design.
39. As a user, I want to add a general change comment to a generated image, so that I can request a broad revision.
40. As a user, I want to select an area of a generated image and attach a comment, so that I can identify the element I want changed.
41. As a user, I want a new generation to incorporate my comment and existing references, so that I can iterate instead of starting again.
42. As a user, I want each regeneration to create a new version, so that an unsuccessful change does not destroy an earlier result.
43. As a user, I want to browse previous versions, so that I can compare alternatives.
44. As a user, I want generation failures to leave my floor plan, mappings, references, comments, and previous versions intact, so that I can retry safely.
45. As a desktop user, I want enough canvas space for drawing room boundaries and reviewing references, so that floor-plan editing remains practical.
46. As a keyboard user, I want controls outside the drawing canvas to be reachable and labeled, so that the editor does not depend entirely on pointer interaction.
47. As a user, I want destructive actions such as deleting a room boundary or replacing a reference to be clear, so that I do not lose setup work accidentally.
48. As a user, I want visible validation messages near the floor plan or field that needs attention, so that I can fix generation blockers.

## Implementation Decisions

- The MVP supports apartment projects only. A floor plan is mandatory.
- The product is a visualization tool. It does not recommend styles, warn about mismatched choices, or score design consistency.
- The primary client is a desktop web application.
- The floor plan editor is the center of the project workspace. A side panel displays fields for either the whole apartment or the selected room.
- Users manually draw polygonal room areas. Automatic room detection is not part of this version.
- Every interior area must be mapped and named before apartment or room generation is enabled.
- A room has a predefined type and may have a custom display name.
- The initial project view contains the floor plan and its annotations. The product does not create a live 3D shell during editing.
- The whole-apartment output is an AI-generated isometric image, not an editable 3D model.
- Room outputs are AI-generated images. The user may choose a supported viewpoint or let the application choose one.
- The generation promise is spatial plausibility. The product should preserve the floor-plan shape, room arrangement, doors, and windows where the model can infer them. It does not promise dimensional accuracy, stable geometry across every generation, or buildable results.
- The user can generate as soon as every floor-plan area has been mapped. Reference fields remain optional.
- A room without references is requested as an empty room with plain white walls and a neutral floor. The generator should not add furniture to an unspecified room.
- Common reference components are Overall style, Floor, Walls, Ceiling, Doors, Windows, and Lighting.
- Optional room-specific components include Furniture, Cabinets, Countertops, Appliances, Bathroom fixtures, and Other.
- A reference belongs either to the whole apartment or to one room.
- Each component accepts one image within a given scope in the MVP. Adding another image replaces the existing image.
- Apartment references provide defaults. A room reference for the same component overrides the apartment reference.
- Component references express a close visual match. Overall-style references express general inspiration.
- Supported reference inputs are local file upload, direct image URL, and social-post URL.
- Social-post extraction is best-effort. If extraction fails because the source blocks access, the interface asks the user to upload a screenshot.
- The system must retain the original source URL when applicable and store or proxy an image that the generation process can access reliably.
- Generation accepts a snapshot of the floor plan, room polygons, room metadata, resolved apartment and room references, output type, and optional viewpoint.
- Apartment generation resolves references for every room before preparing the model input. Room generation resolves only apartment defaults and overrides for the selected room.
- Generation must not silently decorate components or rooms that have no references. Prompts and provider adapters must encode the agreed empty and neutral defaults.
- The visualization provider must sit behind an application-level interface. Product behavior must not depend directly on one model vendor's request or response format.
- A visualization records whether it targets the apartment or a room, the input snapshot used to create it, its image, its generation status, and its place in version history.
- A revision comment may target the whole image or a selected image region. Region coordinates should be stored relative to image dimensions so they survive display resizing.
- Regeneration creates a new immutable visualization version. It never overwrites an earlier successful version.
- A failed generation records a failure state but does not alter project inputs or previous visualization versions.
- Shared input schemas remain the single source of validation for the web form and tRPC procedures, following the repository's existing architecture.
- Backend workflows use Effect services and layers. External image retrieval, storage, and visualization generation require replaceable service layers so tests do not call third-party services.
- The web application consumes the API through tRPC and TanStack Query, consistent with the current stack.
- Persistence uses the existing PostgreSQL and Drizzle setup. The exact table split may follow the domain concepts Apartment project, Floor plan, Room area, Reference, Visualization, and Revision comment.
- The implementation replaces the starter Todo interface as the product entry point. Removal of the starter Todo domain can happen as cleanup once no application code depends on it.

## Testing Decisions

- Tests should assert externally visible behavior. They should not inspect React component state, Effect implementation details, prompt string formatting, or database query structure.
- The primary test seam is a browser-level apartment-project journey running against the real application API and database with deterministic fakes for image extraction, image storage, and visualization generation. This is the highest seam that can verify floor-plan editing, scoped references, generation requests, comments, and version history together.
- The main browser journey should upload a floor plan, map every room, assign apartment and room references, verify room overrides, generate an apartment image, generate a room image from a chosen viewpoint, request a localized revision, and confirm that both visualization versions remain available.
- Browser coverage should verify that generation remains disabled until every interior area has a valid polygon and room type.
- Browser coverage should verify that references remain optional after mapping is complete.
- Browser coverage should verify that selecting the whole apartment or a room changes the visible reference scope.
- Browser coverage should verify that adding a second image to the same component and scope replaces the first image.
- Browser coverage should verify the screenshot fallback when a social-post image cannot be extracted.
- Browser coverage should verify that failed generation preserves project inputs and earlier successful versions.
- Focused API integration tests should cover validation cases that are expensive or unclear at the browser seam, including malformed polygons, unknown room types, invalid scopes, unsupported component and room combinations, inaccessible image URLs, and nonexistent project or room identifiers.
- Visualization provider tests should use a fake service and assert the structured generation request rather than exact prose prompts. The relevant behavior is the resolved scope, overrides, empty-room instruction, output type, viewpoint, and revision target.
- Existing tRPC integration tests provide prior art for exercising the Hono application through HTTP with a real test runtime and checking schema validation.
- Existing Effect service test layers provide prior art for replacing infrastructure in tests without changing application behavior.
- No test should contact social networks, object storage, or an AI model provider.
- Generated image quality requires separate manual evaluation with a small fixed set of representative floor plans and references. Automated tests can verify inputs, lifecycle, and outputs, but cannot prove visual coherence.

## Out of Scope

- Houses or other property types
- Generating an apartment without a floor plan
- Automatic floor-plan parsing or automatic room detection
- A persistent, navigable, or editable 3D model
- Dimensionally accurate architectural modeling
- Construction drawings, measurements, cost estimates, or contractor-ready plans
- Product catalogs, purchasing, or matching generated objects to real products
- Style recommendations, compatibility warnings, or automated design scoring
- More than one reference image per component and scope
- Automatic furnishing of rooms without references
- Mobile-first floor-plan editing
- Real-time collaboration
- Presentation or document export
- Public project sharing
- Guaranteed extraction from Instagram, Facebook, Pinterest, or other restricted pages
- Guaranteed consistency between separately generated images or perspectives
- Decisions about authentication, project dashboards, and account onboarding
- Decisions about background generation and notifications
- Choosing one preferred room version to feed into later apartment generations
- Converting revision comments into permanent component instructions

## Further Notes

- "Apartment project" is the aggregate that holds one floor plan, mapped rooms, scoped references, and generated visualizations.
- "Room area" is a user-drawn polygon on the floor plan with a room type and optional custom name.
- "Reference" is one image assigned to a component and either the whole apartment or one room.
- "Apartment visualization" is an AI-generated isometric image of the mapped property.
- "Room visualization" is an AI-generated image of one mapped room from a selected or automatic viewpoint.
- "Visualization version" is an immutable generation result. A revision produces another version.
- The phrase "everything matches" means that the user can see the selected references combined in one image. It does not mean the application judges the design.
- Pure image generation can change room geometry, furniture, and details between generations. The interface must state this limitation without presenting the output as a stable 3D model.
- Authentication, persistence across devices, project-list behavior, downloads, and background job UX remain undecided. They should not be inferred from recommendations that the user did not confirm.
