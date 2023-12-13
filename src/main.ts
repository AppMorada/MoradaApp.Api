import { NestFactory } from '@nestjs/core';
import {
	ExpressAdapter,
	type NestExpressApplication,
} from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { PrismaErrorFilter } from '@infra/http/filters/errors/prisma.filter';
import { ServiceErrorFilter } from '@infra/http/filters/errors/services.filter';
import { EntitieErrorFilter } from '@infra/http/filters/errors/vo.filter';
import { GatewayErrorFilter } from '@infra/http/filters/errors/gateways.filter';
import { RedisErrorFilter } from '@infra/http/filters/errors/redis-logic.filter';
import { GuardErrorFilter } from '@infra/http/filters/errors/guard.filter';
import { AdapterErrorFilter } from '@infra/http/filters/errors/adapter.filter';
import { GenericErrorFilter } from '@infra/http/filters/errors/generic.filter';
import { ClassValidatorErrorFilter } from '@infra/http/filters/errors/classValidator.filter';
import { LogInterceptor } from '@infra/http/interceptors/logger.interceptor';
import { LoggerAdapter } from '@app/adapters/logger';
import { NotFoundFilter } from '@infra/http/filters/errors/notFound.filter';
import * as cookieParser from 'cookie-parser';
import { ThrottlerErrorFilter } from '@infra/http/filters/errors/throttler.filter';
import * as express from 'express';
import * as functions from 'firebase-functions';

async function bootstrap(requestListener: express.Express) {
	const app: NestExpressApplication =
		await NestFactory.create<NestExpressApplication>(
			AppModule,
			new ExpressAdapter(requestListener),
		);

	app.enableShutdownHooks();
	app.use(cookieParser(process.env.COOKIE_KEY));

	const logger = app.get(LoggerAdapter);

	app.useGlobalInterceptors(new LogInterceptor(logger));
	app.useGlobalPipes(new ValidationPipe());
	app.useGlobalFilters(new GenericErrorFilter(logger));
	app.useGlobalFilters(new PrismaErrorFilter(logger));
	app.useGlobalFilters(new RedisErrorFilter(logger));
	app.useGlobalFilters(new ServiceErrorFilter(logger));
	app.useGlobalFilters(new EntitieErrorFilter(logger));
	app.useGlobalFilters(new GatewayErrorFilter(logger));
	app.useGlobalFilters(new GuardErrorFilter(logger));
	app.useGlobalFilters(new AdapterErrorFilter(logger));
	app.useGlobalFilters(new ClassValidatorErrorFilter(logger));
	app.useGlobalFilters(new ThrottlerErrorFilter(logger));
	app.useGlobalFilters(new NotFoundFilter(logger));

	app.enableCors({
		origin: '*', // mudar no futuro
		methods: ['DELETE', 'POST', 'PATCH', 'PUT', 'GET'],
	});

	const config = new DocumentBuilder()
		.setTitle('MoradaApp: back-end')
		.setDescription('Morada app back-end API')
		.setVersion('1.0')
		.addTag('moradaApp')
		.build();

	const document = SwaggerModule.createDocument(app, config);
	SwaggerModule.setup('api', app, document);

	await app.init();
}

const nodeEnv = process.env.NODE_ENV;
const envs = [
	'PROJECT_NAME',
	'DATABASE_URL',
	'REDIS_URL',
	'ACCESS_TOKEN_EXP',
	'ACCESS_TOKEN_KEY',
	'REFRESH_TOKEN_EXP',
	'REFRESH_TOKEN_KEY',
	'INVITE_TOKEN_KEY',
	'INVITE_ADMIN_TOKEN_KEY',
	'INVITE_SUPER_ADMIN_TOKEN_KEY',
	'COOKIE_KEY',
	'HOST_SENDER',
	'HOST_PORT_SENDER',
	'NAME_SENDER',
	'EMAIL_SENDER',
	'PASS_SENDER',
];

const expressApp = express();

export const SiginAPI = functions
	.region('europe-west1')
	.runWith({
		secrets: nodeEnv === 'development' || nodeEnv === 'test' ? [] : envs,
	})
	.https.onRequest(async (req, res) => {
		await bootstrap(expressApp);
		expressApp(req, res);
	});
