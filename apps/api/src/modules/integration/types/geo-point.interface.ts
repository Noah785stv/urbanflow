/**
 * Représentation GeoJSON native de TypeORM pour une colonne `geography(Point)`
 * (aller-retour automatique via ST_AsGeoJSON/ST_GeomFromGeoJSON). Coordonnées
 * en ordre [longitude, latitude], comme le veut la spec GeoJSON — à ne pas
 * confondre avec `Coordinates` (`@urbanflow/shared-types`), qui expose
 * latitude/longitude nommés côté API.
 */
export interface GeoJsonPoint {
  type: 'Point';
  coordinates: [number, number];
}
