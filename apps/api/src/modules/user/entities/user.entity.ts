import { Exclude } from 'class-transformer';
import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  Index,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserRole } from '../enums/user-role.enum';
import { MobilityProfile } from './mobility-profile.entity';

/**
 * Entité `user` (§5.3). L'unicité de l'e-mail est portée par tenant (index
 * composite) plutôt que par une extension `citext` : la normalisation en
 * minuscules est assurée côté application (AuthService), ce qui évite une
 * migration d'extension Postgres pour un besoin F1 mono-tenant.
 */
@Entity('user')
@Index(['tenantId', 'email'], { unique: true })
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'uuid' })
  tenantId!: string;

  @Column({ type: 'varchar' })
  email!: string;

  // Ne jamais sérialiser le hash dans une réponse HTTP (§6, ClassSerializerInterceptor).
  @Exclude()
  @Column({ type: 'varchar' })
  passwordHash!: string;

  @Column({ type: 'boolean', default: false })
  emailVerified!: boolean;

  @Column({
    type: 'enum',
    enum: UserRole,
    enumName: 'user_role',
    default: UserRole.Citizen,
  })
  role!: UserRole;

  // @DeleteDateColumn active le soft-delete natif TypeORM : un `find`/`findOne`
  // standard exclut automatiquement les comptes supprimés (§5.4 — "un compte
  // supprimé ne peut plus se connecter").
  @DeleteDateColumn({ type: 'timestamptz' })
  deletedAt!: Date | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;

  @OneToOne(() => MobilityProfile, (profile) => profile.user)
  mobilityProfile?: MobilityProfile;
}
