import { AuthModule } from '@app/auth/auth.module';
import { ConfigModule } from '@infra/configs/config.module';
import { EventsModule } from '@infra/events/events.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { Test } from '@nestjs/testing';
import { UserModule } from '../index.module';
import { CacheModule } from '@nestjs/cache-manager';
import { NestjsCacheModule } from '@infra/storages/cache/nestjs/nestjs.module';
import { FirestoreModule } from '@infra/storages/db/firestore/firestore.module';
import { CustomTypeOrmModule } from '@infra/storages/db/typeorm/typeorm.module';
import { AdaptersModule } from '@app/adapters/adapter.module';
import { GatewayModule } from '@infra/gateways/gateway.module';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { LoggerAdapter } from '@app/adapters/logger';
import { LogInterceptor } from '@infra/http/interceptors/logger.interceptor';
import { GenericErrorFilter } from '@infra/http/filters/errors/generic.filter';
import { HealthCheckErrorFilter } from '@infra/http/filters/errors/healthCheckError.filter';
import { TypeORMErrorFilter } from '@infra/http/filters/errors/typeorm.filter';
import { FirestoreCustomErrorFilter } from '@infra/http/filters/errors/firestoreCustomError.filter';
import { DatabaseCustomErrorFilter } from '@infra/http/filters/errors/databaseCustomError.filter';
import { ServiceErrorFilter } from '@infra/http/filters/errors/services.filter';
import { EntitieErrorFilter } from '@infra/http/filters/errors/vo.filter';
import { GatewayErrorFilter } from '@infra/http/filters/errors/gateways.filter';
import { GuardErrorFilter } from '@infra/http/filters/errors/guard.filter';
import { AdapterErrorFilter } from '@infra/http/filters/errors/adapter.filter';
import { ClassValidatorErrorFilter } from '@infra/http/filters/errors/classValidator.filter';
import { ThrottlerErrorFilter } from '@infra/http/filters/errors/throttler.filter';
import { NotFoundFilter } from '@infra/http/filters/errors/notFound.filter';
import { condominiumFactory } from '@tests/factories/condominium';
import * as supertest from 'supertest';
import { userFactory } from '@tests/factories/user';
import * as cookieParser from 'cookie-parser';
import { EnvEnum, GetEnvService } from '@infra/configs/getEnv.service';
import { CondominiumModule } from '../../condominium/index.module';
import { UnprocessableEntityFilter } from '@infra/http/filters/errors/unprocessableEntity.filter';
import { CondominiumRepo } from '@app/repositories/condominium';
import { InviteRepo } from '@app/repositories/invite';
import { inviteFactory } from '@tests/factories/invite';

describe('Create user E2E test', () => {
	let sut: INestApplication;
	let condominiumRepo: CondominiumRepo;
	let inviteRepo: InviteRepo;

	const endpoint = '/user';

	beforeAll(async () => {
		const moduleRef = await Test.createTestingModule({
			imports: [
				ConfigModule,
				EventEmitterModule.forRoot({
					wildcard: false,
					delimiter: '.',
					newListener: false,
					removeListener: false,
					maxListeners: 10,
					verboseMemoryLeak: true,
					ignoreErrors: false,
				}),
				EventsModule,
				AuthModule,
				CondominiumModule,
				UserModule,
				CacheModule.register({
					isGlobal: true,
				}),
				NestjsCacheModule,
				FirestoreModule,
				CustomTypeOrmModule,
				AdaptersModule,
				GatewayModule,
			],
		}).compile();

		sut = moduleRef.createNestApplication({
			bufferLogs: true,
		});
		sut.enableShutdownHooks();
		sut.enableCors({
			origin: '*',
			methods: ['DELETE', 'POST', 'PATCH', 'PUT', 'GET'],
		});

		const envManager = sut.get(GetEnvService);
		const { env: COOKIE_KEY } = await envManager.exec({
			env: EnvEnum.COOKIE_KEY,
		});
		sut.use(cookieParser(COOKIE_KEY));

		sut.useGlobalPipes(
			new ValidationPipe({
				transform: true,
			}),
		);

		const logger = sut.get(LoggerAdapter);
		sut.useGlobalInterceptors(new LogInterceptor(logger));

		sut.useGlobalFilters(new GenericErrorFilter(logger));
		sut.useGlobalFilters(new HealthCheckErrorFilter());
		sut.useGlobalFilters(new TypeORMErrorFilter(logger));
		sut.useGlobalFilters(new FirestoreCustomErrorFilter(logger));
		sut.useGlobalFilters(new DatabaseCustomErrorFilter(logger));
		sut.useGlobalFilters(new ServiceErrorFilter(logger));
		sut.useGlobalFilters(new EntitieErrorFilter(logger));
		sut.useGlobalFilters(new GatewayErrorFilter(logger));
		sut.useGlobalFilters(new GuardErrorFilter(logger));
		sut.useGlobalFilters(new AdapterErrorFilter(logger));
		sut.useGlobalFilters(new ClassValidatorErrorFilter(logger));
		sut.useGlobalFilters(new ThrottlerErrorFilter(logger));
		sut.useGlobalFilters(new NotFoundFilter(logger));
		sut.useGlobalFilters(new UnprocessableEntityFilter(logger));

		condominiumRepo = sut.get(CondominiumRepo);
		inviteRepo = sut.get(InviteRepo);

		await sut.init();
	});

	afterAll(async () => await sut.close());

	it('should create a user', async () => {
		const cpf = '488.748.854-82';
		const user = userFactory();
		const condominium = condominiumFactory({ ownerId: user.id.value });
		const invite = inviteFactory({
			condominiumId: condominium.id.value,
			recipient: 'myemail@email.com',
			CPF: cpf,
		});

		await condominiumRepo.create({ user, condominium });
		await inviteRepo.create({ invite });

		const res = await supertest(sut.getHttpServer())
			.post(endpoint)
			.set('content-type', 'application/json')
			.send({
				name: 'new user',
				email: 'newemail@email.com',
				password: '12345678',
				CPF: cpf,
			});

		expect(res.statusCode).toEqual(201);
	});

	it('should be able to throw a 400 error', async () => {
		const res = await supertest(sut.getHttpServer())
			.post(endpoint)
			.set('content-type', 'application/json')
			.send();

		expect(res.statusCode).toEqual(400);
		expect(res.body?.statusCode).toEqual(400);
		expect(res.body?.message).toBeTruthy();
	});

	it('should be able to throw a 404 error', async () => {
		const res1 = await supertest(sut.getHttpServer())
			.post(endpoint)
			.set('content-type', 'application/json')
			.send({
				name: 'new user',
				email: 'newemail@email.com',
				password: '12345678',
				CPF: '488.748.854-82',
			});

		expect(res1.statusCode).toEqual(404);
		expect(res1.body?.statusCode).toEqual(404);
		expect(res1.body?.message).toEqual(
			'O conteúdo solicitado não foi encontrado',
		);
	});
});
