import { JwtService } from '@nestjs/jwt';
import { InMemoryUser } from '@tests/inMemoryDatabase/user';
import { CreateTokenService } from '../createToken.service';
import { userFactory } from '@tests/factories/user';
import { InMemoryContainer } from '@tests/inMemoryDatabase/inMemoryContainer';
import { condominiumRelUserFactory } from '@tests/factories/condominiumRelUser';
import { InMemoryKey } from '@tests/inMemoryDatabase/key';
import { GetKeyService } from '../getKey.service';
import { Key } from '@app/entities/key';
import { KeysEnum } from '@app/repositories/key';
import { randomBytes } from 'crypto';

describe('Create token test', () => {
	let createTokenService: CreateTokenService;
	let getKey: GetKeyService;
	let tokenService: JwtService;

	let inMemoryContainer: InMemoryContainer;
	let keyRepo: InMemoryKey;
	let userRepo: InMemoryUser;

	beforeEach(async () => {
		inMemoryContainer = new InMemoryContainer();
		userRepo = new InMemoryUser(inMemoryContainer);
		keyRepo = new InMemoryKey(inMemoryContainer);
		tokenService = new JwtService();

		getKey = new GetKeyService(keyRepo);
		createTokenService = new CreateTokenService(tokenService, getKey);

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

	it('should be able to create token', async () => {
		const user = userFactory();
		const condominiumRelUser = condominiumRelUserFactory();

		await userRepo.create({ user, condominiumRelUser });
		const accessKey = await keyRepo.getSignature(KeysEnum.ACCESS_TOKEN_KEY);
		const refreshKey = await keyRepo.getSignature(
			KeysEnum.REFRESH_TOKEN_KEY,
		);

		const { accessToken, refreshToken } = await createTokenService.exec({
			user,
		});

		await tokenService.verify(accessToken, {
			secret: accessKey.actual.content,
		});
		await tokenService.verify(refreshToken, {
			secret: refreshKey.actual.content,
		});

		expect(keyRepo.calls.getSignature).toEqual(4);
	});
});
