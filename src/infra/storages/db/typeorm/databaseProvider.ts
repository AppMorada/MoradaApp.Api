import { EnvEnum, GetEnvService } from '@infra/configs/env/getEnv.service';
import { typeORMConsts } from './consts';
import { TypeORMService } from './typeORM.service';
import { TypeOrmUserEntity } from './entities/user.entity';
import { TypeOrmCondominiumEntity } from './entities/condominium.entity';
import { TypeOrmInviteEntity } from './entities/invite.entity';
import { TypeOrmCondominiumMemberEntity } from './entities/condominiumMember.entity';
import { TypeOrmCommunityInfosEntity } from './entities/communityInfos.entity';
import { TypeOrmUniqueRegistryEntity } from './entities/uniqueRegistry.entity';
import { FirstMigration1709706321663 } from './migrations/1709706321663-firstMigration';
import { AddUniqueRegistries1710480251681 } from './migrations/1710480251681-addUniqueRegistries';

export const getDataSource = (NODE_ENV: string, DATABASE_URL: string) =>
	new TypeORMService({
		logger: NODE_ENV !== 'production' ? 'simple-console' : undefined,
		logging:
			NODE_ENV !== 'production'
				? [
					'log',
					'warn',
					'info',
					'query',
					'error',
					'schema',
					'migration',
				]
				: [],
		type: 'postgres',
		url: DATABASE_URL,
		entities: [
			TypeOrmUserEntity,
			TypeOrmCondominiumEntity,
			TypeOrmCondominiumMemberEntity,
			TypeOrmCommunityInfosEntity,
			TypeOrmInviteEntity,
			TypeOrmUniqueRegistryEntity,
		],
		synchronize: false,
		migrationsRun: false,
		migrationsTableName: 'migration_typeorm',
		migrations: [
			FirstMigration1709706321663,
			AddUniqueRegistries1710480251681,
		],
	}).initialize();

export const databaseProviders = [
	{
		inject: [GetEnvService],
		provide: typeORMConsts.databaseProviders,
		useFactory: async (getEnv: GetEnvService) => {
			const { env: DATABASE_URL } = await getEnv.exec({
				env: EnvEnum.DATABASE_URL,
			});
			const { env: NODE_ENV } = await getEnv.exec({
				env: EnvEnum.NODE_ENV,
			});

			return getDataSource(NODE_ENV as string, DATABASE_URL as string);
		},
	},
];
