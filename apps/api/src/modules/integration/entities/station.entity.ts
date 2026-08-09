import { StationType } from '@urbanflow/shared-types';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { GeoJsonPoint } from '../types/geo-point.interface';

/**
 * Entité `station` (§4.1) — point d'accès physique (vélo/trottinette partagé
 * ou arrêt de transport en commun). Les informations de station changent
 * rarement : elles sont persistées, contrairement aux disponibilités temps
 * réel (Redis uniquement, §4.2). PostGIS entre en jeu ici pour la première
 * fois (F1 l'avait explicitement évité pour domicile/travail — chiffrés,
 * jamais requêtés spatialement, cf. F1 §4.3) : `location` est indexée en
 * GiST pour les requêtes de proximité (`ST_DWithin`).
 */
@Entity('station')
@Index(['provider', 'externalId'], { unique: true })
export class Station {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  tenantId!: string;

  @Column({ type: 'varchar' })
  provider!: string;

  @Column({ type: 'varchar' })
  externalId!: string;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ type: 'enum', enum: StationType, enumName: 'station_type' })
  stationType!: StationType;

  @Column({ type: 'geography', spatialFeatureType: 'Point', srid: 4326 })
  @Index({ spatial: true })
  location!: GeoJsonPoint;

  @Column({ type: 'int', nullable: true })
  capacity!: number | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
