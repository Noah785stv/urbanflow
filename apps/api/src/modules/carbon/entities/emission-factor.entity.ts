import { TransportMode } from '@urbanflow/shared-types';
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * Entité `emission_factor` (F4 §4.1) — facteurs d'émission ADEME versionnés
 * par date. Une mise à jour n'écrase jamais une ligne existante : elle ajoute
 * une nouvelle ligne avec un `validFrom` plus récent, pour ne jamais altérer
 * l'empreinte d'un `carbon_log` déjà confirmé (CLAUDE.md — Modèle de données).
 */
@Entity('emission_factor')
@Index(['tenantId', 'mode', 'validFrom'])
export class EmissionFactor {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  tenantId!: string;

  @Column({ type: 'enum', enum: TransportMode, enumName: 'transport_mode' })
  mode!: TransportMode;

  @Column({ type: 'numeric', precision: 10, scale: 3 })
  gramsPerKm!: string;

  @Column({ type: 'date' })
  validFrom!: string;

  @Column({ type: 'date', nullable: true })
  validTo!: string | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}
