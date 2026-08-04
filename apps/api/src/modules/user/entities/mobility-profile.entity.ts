import { TransportMode } from '@urbanflow/shared-types';
import { Exclude } from 'class-transformer';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { MobilityConstraints } from '../types/mobility-constraints.interface';
import { User } from './user.entity';

/**
 * Entité `mobility_profile` (§5.3), créée vide à l'inscription puis complétée
 * via PATCH. Domicile/travail sont chiffrés en AES-256-GCM au niveau
 * applicatif (§4.3) — jamais stockés ni exposés en clair, jamais requêtés
 * spatialement (pas de PostGIS pour ces colonnes, divergence signalée §4.3).
 */
@Entity('mobility_profile')
export class MobilityProfile {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid', unique: true })
  userId!: string;

  @OneToOne(() => User, (user) => user.mobilityProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ type: 'jsonb' })
  preferredModes!: TransportMode[];

  @Column({ type: 'jsonb' })
  constraints!: MobilityConstraints;

  @Column({ type: 'text', array: true })
  transportSubscriptions!: string[];

  // Texte chiffré (AES-256-GCM) — jamais la valeur en clair.
  @Exclude()
  @Column({ type: 'text', nullable: true })
  homeLocationEncrypted!: string | null;

  @Exclude()
  @Column({ type: 'text', nullable: true })
  workLocationEncrypted!: string | null;

  @Column({ type: 'boolean', default: false })
  geolocationConsent!: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  geolocationConsentAt!: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}
