# Apartment

Mapping one property's floor plan, references, and generated visualizations. This is the product's core context — the apartment project is the aggregate everything else hangs off.

## Language

**Apartment project**:
One property the user is visualizing. It holds exactly one floor plan, and will grow to hold room areas, references, and visualizations.
_Avoid_: Apartment, Home, Property, Flat

**Floor plan**:
The image of the apartment's layout that the user uploads when creating a project. It is mandatory: nothing is generated from invented geometry. A floor plan has a file name, an image type, and the image itself.
_Avoid_: Blueprint, Layout, Plan image

**Room area**:
One room of the apartment, drawn by the user as a polygon over the floor plan. It always has a room type and may have a name of its own; a room with no name goes by its type. Areas are what generation is aimed at, so an apartment with unmapped interior cannot be generated.
_Avoid_: Room, Zone, Region, Polygon, Shape

**Boundary**:
The ordered points of a room area, each a fraction of the floor plan image (0..1 on each axis) rather than a pixel. Fractions are what keep an area on its walls at any zoom or panel width. A boundary that has fewer than three points, repeats a point, crosses itself, or encloses almost nothing cannot be saved — the browser and the api refuse it in the same words.
_Avoid_: Outline, Path, Vertices, Coordinates

**Mapping confirmation**:
The user's statement that the whole interior is now mapped. It is what unlocks generation, and it is withdrawn by any change to a room area, so a standing confirmation always refers to the mapping as it currently is.
_Avoid_: Done, Finished, Locked, Approved

**Reference**:
An image the user attaches to say what the apartment should look like. It belongs to exactly one component, so attaching a second image to the same component replaces the first. A reference attached to the apartment stands as the default for every room.
_Avoid_: Inspiration, Mood image, Sample, Attachment

**Component**:
A part of the apartment a reference can be attached to: overall style, floor, walls, ceiling, doors, windows, or lighting. The set is fixed, and every component is offered whether it has a reference or not.
_Avoid_: Element, Surface, Material, Category, Field

**Reference use**:
How a reference is meant to be read when generating. Overall style is general inspiration; every other component asks for a close visual match of what is in the image. It follows from the component, so the user never sets it.
_Avoid_: Strength, Weight, Mode, Influence

**Image link**:
A link the user gives instead of picking a file. It has to lead straight to an image rather than to a page containing one, and what we keep from it is the image, not the link.
_Avoid_: URL reference, Remote image, Hotlink, External image

**Image storage**:
Where uploaded image bytes live, addressed by a storage key held on the row that owns them. The interface is deliberately narrow so local disk can be swapped for object storage, and so tests never reach a third-party service.
_Avoid_: Bucket, Uploads, Blob store

**Editor**:
The project workspace. The floor plan is its canvas; a side panel holds the controls for whatever is currently selected.
_Avoid_: Canvas, Workspace, Designer

## Notes

The floor plan's metadata lives on the `apartment_projects` row rather than a table of its own, because a project has exactly one and cannot exist without it. The mapping confirmation is on that row for the same reason, even though `RoomAreaService` rather than `ApartmentProjectService` owns it: it is a claim about room areas, not about the project.

A reference is fetched from its link once, at the moment it is attached, and the image is kept in image storage exactly as an uploaded one is — the link survives only as a note of where the image came from. That is what lets a preview be shown from what we hold rather than from someone else's host, and what stops a reference from quietly rotting.

The boundary rules live in `@home-bird/shared/room-area` and run in both the browser and the service, so a shape is refused with identical wording wherever it is checked — the same arrangement as the floor plan image checks. The api repeats them rather than trusting its own schema, so the service cannot be talked into storing a shape the user could never have drawn. Uploads arrive base64-encoded and the stored image is read back the same way, so the floor plan travels over the single tRPC contract rather than a second transport — at the cost of base64's size overhead and HTTP caching.
