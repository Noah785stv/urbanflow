/**
 * Formes brutes des réponses Navitia (à vérifier contre la documentation
 * Navitia à jour au moment de l'implémentation réelle — §6, §14 : couverture,
 * format exact des champs).
 */

export interface NavitiaDisplayInformations {
  physical_mode?: string;
  commercial_mode?: string;
  network?: string;
  direction?: string;
  label?: string;
}

export interface NavitiaStopDateTime {
  /** Format Navitia : "YYYYMMDDTHHmmss". */
  departure_date_time: string;
  data_freshness?: 'realtime' | 'base_schedule';
}

export interface NavitiaDeparture {
  display_informations: NavitiaDisplayInformations;
  stop_date_time: NavitiaStopDateTime;
}

export interface NavitiaDeparturesResponse {
  departures: NavitiaDeparture[];
}

export interface NavitiaSection {
  type: string;
  mode?: string;
  duration: number;
  display_informations?: NavitiaDisplayInformations;
}

export interface NavitiaJourney {
  departure_date_time: string;
  arrival_date_time: string;
  duration: number;
  sections: NavitiaSection[];
}

export interface NavitiaJourneysResponse {
  journeys: NavitiaJourney[];
}
