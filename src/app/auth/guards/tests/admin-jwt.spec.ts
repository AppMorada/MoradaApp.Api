import { InMemoryContainer } from '@tests/inMemoryDatabase/inMemoryContainer';
import { JwtService } from '@nestjs/jwt';
import { createMockExecutionContext } from '@tests/guards/executionContextSpy';
import { CreateTokenService } from '@app/services/login/createToken.service';
import { userFactory } from '@tests/factories/user';
import { InMemoryError } from '@tests/errors/inMemoryError';
import { EntitiesEnum } from '@app/entities/entities';
import { GuardErrors } from '@app/errors/guard';
import { UUID } from '@app/entities/VO';
import { AdminJwt } from '../admin-jwt.guard';
import { BadRequestException, HttpStatus } from '@nestjs/common';
import { InMemoryKey } from '@tests/inMemoryDatabase/key';
import { ValidateTokenService } from '@app/services/login/validateToken.service';
import { GetKeyService } from '@app/services/key/getKey.service';
import { Key } from '@app/entities/key';
import { KeysEnum } from '@app/repositories/key';
import { randomBytes } from 'crypto';
import { ServiceErrors, ServiceErrorsTags } from '@app/errors/services';
import { condominiumFactory } from '@tests/factories/condominium';
import { condominiumMemberFactory } from '@tests/factories/condominiumMember';
import { uniqueRegistryFactory } from '@tests/factories/uniqueRegistry';
import { InMemoryUserReadOps } from '@tests/inMemoryDatabase/user/read';
import { InMemoryCondominiumReadOps } from '@tests/inMemoryDatabase/condominium/read';
import { InMemoryEmployeeMembersReadOps } from '@tests/inMemoryDatabase/employeeMember/read';
import { InMemoryEmployeeMembersWriteOps } from '@tests/inMemoryDatabase/employeeMember/write';

describe('Admin Jwt guard test', () => {
	let jwtService: JwtService;
	let createTokenService: CreateTokenService;
	let validateTokenService: ValidateTokenService;
	let getKeyService: GetKeyService;
	let adminJwtGuard: AdminJwt;

	let inMemoryContainer: InMemoryContainer;
	let userRepo: InMemoryUserReadOps;
	let memberRepoReadOps: InMemoryEmployeeMembersReadOps;
	let memberRepoWriteOps: InMemoryEmployeeMembersWriteOps;
	let condominiumRepo: InMemoryCondominiumReadOps;
	let keyRepo: InMemoryKey;

	beforeEach(async () => {
		jwtService = new JwtService();
		inMemoryContainer = new InMemoryContainer();
		userRepo = new InMemoryUserReadOps(inMemoryContainer);
		keyRepo = new InMemoryKey(inMemoryContainer);
		condominiumRepo = new InMemoryCondominiumReadOps(inMemoryContainer);
		memberRepoReadOps = new InMemoryEmployeeMembersReadOps(
			inMemoryContainer,
		);
		memberRepoWriteOps = new InMemoryEmployeeMembersWriteOps(
			inMemoryContainer,
		);

		getKeyService = new GetKeyService(keyRepo);
		createTokenService = new CreateTokenService(jwtService, getKeyService);

		validateTokenService = new ValidateTokenService(
			jwtService,
			getKeyService,
		);
		adminJwtGuard = new AdminJwt(
			validateTokenService,
			userRepo,
			memberRepoReadOps,
			condominiumRepo,
		);

		const accessTokenKey = new Key({
			name: KeysEnum.ACCESS_TOKEN_KEY,
			actual: {
				content: randomBytes(100).toString('hex'),
				buildedAt: Date.now(),
			},
			ttl: 1000 * 60 * 60,
		});

		const refreshTokenKey = new Key({
			name: KeysEnum.REFRESH_TOKEN_KEY,
			actual: {
				content: randomBytes(100).toString('hex'),
				buildedAt: Date.now(),
			},
			ttl: 1000 * 60 * 60,
		});

		await keyRepo.create(accessTokenKey);
		await keyRepo.create(refreshTokenKey);
	});

	it('should be able to validate admin jwt guard', async () => {
		const uniqueRegistry = uniqueRegistryFactory();
		const user = userFactory({ uniqueRegistryId: uniqueRegistry.id.value });
		const condominium = condominiumFactory();
		const member = condominiumMemberFactory({
			userId: user.id.value,
			condominiumId: condominium.id.value,
			uniqueRegistryId: uniqueRegistry.id.value,
			role: 1,
		});

		memberRepoWriteOps.create({
			user,
			member,
			rawUniqueRegistry: {
				email: uniqueRegistry.email,
				CPF: uniqueRegistry.CPF!,
			},
		});
		condominiumRepo.condominiums.push(condominium);

		const tokens = await createTokenService.exec({ user, uniqueRegistry });

		const context = createMockExecutionContext({
			params: {
				condominiumId: condominium.id.value,
			},
			headers: {
				authorization: `Bearer ${tokens.accessToken}`,
			},
		});

		await expect(adminJwtGuard.canActivate(context)).resolves.toBeTruthy();

		expect(userRepo.calls.find).toEqual(1);
		expect(memberRepoReadOps.calls.getByUserId).toEqual(1);
	});

	it('should throw one error - user doesn\'t have permission', async () => {
		const uniqueRegistry = uniqueRegistryFactory();
		const user = userFactory({ uniqueRegistryId: uniqueRegistry.id.value });
		const condominium = condominiumFactory();
		const member = condominiumMemberFactory({
			userId: user.id.value,
			condominiumId: condominium.id.value,
			uniqueRegistryId: uniqueRegistry.id.value,
			role: 0,
		});

		memberRepoWriteOps.create({
			user,
			member,
			rawUniqueRegistry: {
				email: uniqueRegistry.email,
				CPF: uniqueRegistry.CPF!,
			},
		});
		condominiumRepo.condominiums.push(condominium);

		const tokens = await createTokenService.exec({ user, uniqueRegistry });

		const context = createMockExecutionContext({
			params: {
				condominiumId: condominium.id.value,
			},
			headers: {
				authorization: `Bearer ${tokens.accessToken}`,
			},
		});

		await expect(adminJwtGuard.canActivate(context)).rejects.toThrow(
			new GuardErrors({
				message: 'Usuário não tem autorização para realizar tal ação',
			}),
		);

		expect(userRepo.calls.find).toEqual(1);
		expect(memberRepoReadOps.calls.getByUserId).toEqual(1);
	});

	it('should throw one error - condominium should be provided', async () => {
		const uniqueRegistry = uniqueRegistryFactory();
		const user = userFactory({ uniqueRegistryId: uniqueRegistry.id.value });
		const tokens = await createTokenService.exec({ user, uniqueRegistry });

		const context = createMockExecutionContext({
			headers: {
				authorization: `Bearer ${tokens.accessToken}`,
			},
		});

		await expect(adminJwtGuard.canActivate(context)).rejects.toThrow(
			new BadRequestException({
				statusCode: HttpStatus.BAD_REQUEST,
				error: 'Bad Request',
				message: 'Condomínio não especificado',
			}),
		);
	});

	it('should throw one error - user doesn\'t exists', async () => {
		const uniqueRegistry = uniqueRegistryFactory();
		const user = userFactory({ uniqueRegistryId: uniqueRegistry.id.value });
		const tokens = await createTokenService.exec({ user, uniqueRegistry });

		const context = createMockExecutionContext({
			params: {
				condominiumId: UUID.genV4().value,
			},
			headers: {
				authorization: `Bearer ${tokens.accessToken}`,
			},
		});

		await expect(adminJwtGuard.canActivate(context)).rejects.toThrow(
			new InMemoryError({
				entity: EntitiesEnum.user,
				message: 'User not found',
			}),
		);

		expect(userRepo.calls.find).toEqual(1);
	});

	it('should throw one error - empty token', async () => {
		const context = createMockExecutionContext({
			params: {
				condominiumId: UUID.genV4().value,
			},
		});
		await expect(adminJwtGuard.canActivate(context)).rejects.toThrow(
			new GuardErrors({ message: 'Token não encontrado' }),
		);
	});

	it('should throw one error - malformed token', async () => {
		const context = createMockExecutionContext({
			params: {
				condominiumId: UUID.genV4().value,
			},
			headers: {
				authorization: 'Bearer malformedtoken',
			},
		});
		await expect(adminJwtGuard.canActivate(context)).rejects.toThrow(
			new ServiceErrors({
				message: 'O token precisa ter os campos "iat" e "exp"',
				tag: ServiceErrorsTags.unauthorized,
			}),
		);
	});
});
