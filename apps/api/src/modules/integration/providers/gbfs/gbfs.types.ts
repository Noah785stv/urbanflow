/**
 * Formes brutes des réponses GBFS (standard, à vérifier contre la spec GBFS
 * à jour au moment de l'implémentation réelle avec un opérateur — §6).
 */

export interface GbfsDiscoveryFeed {
  name: string;
  url: string;
}

export interface GbfsDiscoveryResponse {
  data: Record<string, { feeds: GbfsDiscoveryFeed[] }>;
}

export interface GbfsStationInformation {
  station_id: string;
  name: string;
  lat: number;
  lon: number;
  capacity?: number;
}

export interface GbfsStationInformationResponse {
  data: { stations: GbfsStationInformation[] };
}

export interface GbfsStationStatus {
  station_id: string;
  num_bikes_available: number;
  num_docks_available: number;
}

export interface GbfsStationStatusResponse {
  data: { stations: GbfsStationStatus[] };
}
