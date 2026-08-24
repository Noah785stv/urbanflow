import { ModeBreakdownEntry } from '@urbanflow/shared-types';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * Entité `carbon_log` (F4 §4.2) — empreinte d'un trajet confirmé, minimisée
 * (RGPD, §4.8) : ni origine ni destination, seulement l'agrégat par mode.
 * Divergence assumée avec le §5.3 du dossier (`trip`/`trip_segment`
 * géolocalisés) — voir `docs/specs/F4-carbon.md` §4.2.
 */
@Entity('carbon_log')
@Index(['tenantId', 'userId', 'loggedAt'])
export class CarbonLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  tenantId!: string;

  @Column({ type: 'uuid' })
  userId!: string;

  @Column({ type: 'timestamptz' })
  loggedAt!: Date;

  @Column({ type: 'int' })
  co2Grams!: number;

  @Column({ type: 'int' })
  distanceMeters!: number;

  @Column({ type: 'int' })
  referenceCo2Grams!: number;

  @Column({ type: 'int' })
  savedGrams!: number;

  @Column({ type: 'jsonb' })
  modeBreakdown!: ModeBreakdownEntry[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
