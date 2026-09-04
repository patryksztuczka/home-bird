# Apartment

Mapping one property's floor plan, references, and generated visualizations. This is the product's core context — the apartment project is the aggregate everything else hangs off.

## Language

**Apartment project**:
One property the user is visualizing. It holds exactly one floor plan, and will grow to hold room areas, references, and visualizations.
_Avoid_: Apartment, Home, Property, Flat

**Floor plan**:
The image of the apartment's layout that the user uploads when creating a project. It is mandatory: nothing is generated from invented geometry. A floor plan has a file name, an image type, and the image itself.
_Avoid_: Blueprint, Layout, Plan image

**Image storage**:
Where uploaded image bytes live, addressed by a storage key held on the row that owns them. The interface is deliberately narrow so local disk can be swapped for object storage, and so tests never reach a third-party service.
_Avoid_: Bucket, Uploads, Blob store

**Editor**:
The project workspace. The floor plan is its canvas; a side panel holds the controls for whatever is currently selected.
_Avoid_: Canvas, Workspace, Designer

## Notes

The floor plan's metadata lives on the `apartment_projects` row rather than a table of its own, because a project has exactly one and cannot exist without it. Uploads arrive base64-encoded and the stored image is read back the same way, so the floor plan travels over the single tRPC contract rather than a second transport — at the cost of base64's size overhead and HTTP caching.
