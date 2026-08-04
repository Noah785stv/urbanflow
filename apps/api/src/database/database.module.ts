import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.getOrThrow<string>('DATABASE_URL'),
        autoLoadEntities: true,
        // Mapping snake_case automatique (tables/colonnes — §4.2)
        namingStrategy: new SnakeNamingStrategy(),
        // Confort en dev uniquement ; en CI comme en prod, le schéma est posé
        // par migration (`pnpm migration:run`) — voir .github/workflows/ci.yml.
        synchronize: config.get<string>('NODE_ENV') === 'development',
      }),
    }),
  ],
})
export class DatabaseModule {}
