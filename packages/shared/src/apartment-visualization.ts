import { Schema } from "effect";

export const GenerateApartmentVisualizationInput = Schema.toStandardSchemaV1(
  Schema.Struct({ apartmentProjectId: Schema.NonEmptyString }),
);
export type GenerateApartmentVisualizationInput = typeof GenerateApartmentVisualizationInput.Type;

export const ApartmentVisualizationsInput = Schema.toStandardSchemaV1(
  Schema.Struct({ apartmentProjectId: Schema.NonEmptyString }),
);
export type ApartmentVisualizationsInput = typeof ApartmentVisualizationsInput.Type;

export const ApartmentVisualizationIdInput = Schema.toStandardSchemaV1(
  Schema.Struct({ id: Schema.NonEmptyString }),
);
export type ApartmentVisualizationIdInput = typeof ApartmentVisualizationIdInput.Type;

export const visualizationDataUrl = (image: {
  readonly contentType: string;
  readonly data: string;
}) => `data:${image.contentType};base64,${image.data}`;
