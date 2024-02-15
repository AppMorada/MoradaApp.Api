import { InMemoryContainer } from '@tests/inMemoryDatabase/inMemoryContainer';
import { InMemoryKey } from '@tests/inMemoryDatabase/key';
import { GetKeyService } from '../getKey.service';
import { Key } from '@app/entities/key';
import { KeysEnum } from '@app/repositories/key';
import { randomBytes } from 'crypto';
import { ServiceErrors, ServiceErrorsTags } from '@app/errors/services';
import { ValidateTFAService } from '../validateTFA.service';
import { CryptAdapter } from '@app/adapters/crypt';
import { BcryptAdapter } from '@app/adapters/bcrypt/bcryptAdapter';
import { userFactory } from '@tests/factories/user';
import { generateStringCodeContent } from '@utils/generateStringCodeContent';

describe('ValidateTFAService Service', () => {
	let container: InMemoryContainer;
	let keyRepo: InMemoryKey;
	let getKey: GetKeyService;
	let crypt: CryptAdapter;
	let validateTFAService: ValidateTFAService;

	async function genCode(
		rawIat?: number,
		rawExp?: number,
		sigState: 'OK' | 'DEPREACATED' = 'OK',
	) {
		const user = userFactory();
		let code = generateStringCodeContent({
			email: user.email,
			id: user.id,
		});
		const { key } = await getKey.exec({ name: KeysEnum.TFA_TOKEN_KEY });

		const iat = rawIat ?? Date.now();
		const exp = rawExp ?? Date.now() + 1000 * 60 * 60 * 3;
		const metadata = JSON.stringify({
			iat: Math.floor(iat / 1000),
			exp: Math.floor(exp / 1000),
		});
		code = encodeURIComponent(
			`${btoa(metadata)}.${btoa(code)}`.replaceAll('=', ''),
		);

		const inviteSignature = await crypt.hashWithHmac({
			data: code,
			key: sigState === 'OK' ? key.actual.content : key!.prev!.content,
		});
		return {
			user,
			code: encodeURIComponent(
				`${btoa(metadata)}.${btoa(inviteSignature)}`.replaceAll(
					'=',
					'',
				),
			),
		};
	}

	beforeEach(() => {
		container = new InMemoryContainer();
		keyRepo = new InMemoryKey(container);

		getKey = new GetKeyService(keyRepo);
		crypt = new BcryptAdapter();
		validateTFAService = new ValidateTFAService(getKey, crypt);
	});

	it('should validate the token and return sigState as \'OK\'', async () => {
		const case1 = async () => {
			// Testando o token mais novo possível e que usa a assinatura mais nova
			const iat = Date.now();
			const key = new Key({
				name: KeysEnum.TFA_TOKEN_KEY,
				ttl: 1000 * 60 * 60,
				actual: {
					content: randomBytes(100).toString('hex'),
					buildedAt: iat,
				},
			});
			await keyRepo.create(key);

			const { code, user } = await genCode(iat, key.renewTime, 'OK');

			const { sigState } = await validateTFAService.exec({
				name: KeysEnum.TFA_TOKEN_KEY,
				code,
				user,
			});
			expect(sigState === 'OK').toEqual(true);
			expect(keyRepo.calls.create).toEqual(1);
			expect(keyRepo.calls.getSignature).toEqual(2);

			keyRepo.keys = [];
		};

		const case2 = async () => {
			// Testando o token mais velho possível e que ainda continua usando a assinatura mais nova
			const actualDate = Date.now();
			const oneHour = 1000 * 60 * 60;
			const oneHourEarlier = actualDate - oneHour;

			const iat = oneHourEarlier + 1000;

			const key = new Key({
				name: KeysEnum.TFA_TOKEN_KEY,
				ttl: oneHour,
				actual: {
					content: randomBytes(100).toString('hex'),
					buildedAt: iat,
				},
			});

			await keyRepo.create(key);
			const { code, user } = await genCode(
				iat,
				iat + oneHour + 1000,
				'OK',
			);

			const { sigState } = await validateTFAService.exec({
				name: KeysEnum.TFA_TOKEN_KEY,
				code,
				user,
			});
			expect(sigState === 'OK').toEqual(true);
			expect(keyRepo.calls.create).toEqual(2);
			expect(keyRepo.calls.getSignature).toEqual(4);

			keyRepo.keys = [];
		};

		await case1();
		await case2();
	});

	it('should validate the token and return sigState as \'DEPREACATED\'', async () => {
		const case1 = async () => {
			// Testando o token mais velho possível que usa a assinatura depreciada
			const actualDate = Date.now();
			const oneHour = 1000 * 60 * 60;
			const oneHourEarlier = actualDate - oneHour;

			const iat = oneHourEarlier + 1000;

			const key = new Key({
				name: KeysEnum.TFA_TOKEN_KEY,
				ttl: oneHour,
				actual: {
					content: randomBytes(100).toString('hex'),
					buildedAt: actualDate,
				},
				prev: {
					content: randomBytes(100).toString('hex'),
					buildedAt: oneHourEarlier,
				},
			});

			await keyRepo.create(key);
			const { code, user } = await genCode(
				iat,
				iat + oneHour,
				'DEPREACATED',
			);

			const { sigState } = await validateTFAService.exec({
				name: KeysEnum.TFA_TOKEN_KEY,
				code,
				user,
			});
			expect(sigState === 'DEPREACATED').toEqual(true);
			expect(keyRepo.calls.create).toEqual(1);
			expect(keyRepo.calls.getSignature).toEqual(2);

			keyRepo.keys = [];
		};

		const case2 = async () => {
			// Testando o token mais possível que faz o uso de assinaturas
			// depreciadas
			const actualDate = Date.now();
			const oneHour = 1000 * 60 * 60;

			const iat = actualDate - 1000;

			const key = new Key({
				name: KeysEnum.TFA_TOKEN_KEY,
				ttl: oneHour,
				actual: {
					content: randomBytes(100).toString('hex'),
					buildedAt: actualDate,
				},
				prev: {
					content: randomBytes(100).toString('hex'),
					buildedAt: actualDate - oneHour,
				},
			});

			await keyRepo.create(key);
			const { code, user } = await genCode(
				iat,
				iat + oneHour,
				'DEPREACATED',
			);

			const { sigState } = await validateTFAService.exec({
				name: KeysEnum.TFA_TOKEN_KEY,
				code,
				user,
			});
			expect(sigState === 'DEPREACATED').toEqual(true);
			expect(keyRepo.calls.create).toEqual(2);
			expect(keyRepo.calls.getSignature).toEqual(4);

			keyRepo.keys = [];
		};

		await case1();
		await case2();
	});

	it('should throw one error - out of time', async () => {
		const actualDate = Date.now();
		const oneHour = 1000 * 60 * 60;
		const oneHourEarlier = actualDate - oneHour;

		const key = new Key({
			name: KeysEnum.TFA_TOKEN_KEY,
			ttl: oneHour,
			actual: {
				content: randomBytes(100).toString('hex'),
				buildedAt: actualDate,
			},
			prev: {
				content: randomBytes(100).toString('hex'),
				buildedAt: oneHourEarlier,
			},
		});

		await keyRepo.create(key);
		const { code, user } = await genCode(
			oneHourEarlier - 1,
			actualDate - 1,
			'DEPREACATED',
		);

		expect(
			validateTFAService.exec({
				name: KeysEnum.TFA_TOKEN_KEY,
				code,
				user,
			}),
		).rejects.toThrow(
			new ServiceErrors({
				message: 'Código expirado',
				tag: ServiceErrorsTags.unauthorized,
			}),
		);
		expect(keyRepo.calls.create).toEqual(1);
		expect(keyRepo.calls.getSignature).toEqual(2);
	});

	it('should throw one error - any good conditions was detected', async () => {
		const actualDate = Date.now();
		const oneHour = 1000 * 60 * 60;
		const oneHourEarlier = actualDate - oneHour;

		const key = new Key({
			name: KeysEnum.TFA_TOKEN_KEY,
			ttl: oneHour,
			actual: {
				content: randomBytes(100).toString('hex'),
				buildedAt: actualDate,
			},
		});

		await keyRepo.create(key);
		const { code, user } = await genCode(
			oneHourEarlier - 1,
			actualDate - 1,
		);

		expect(
			validateTFAService.exec({
				name: KeysEnum.TFA_TOKEN_KEY,
				code,
				user,
			}),
		).rejects.toThrow(
			new ServiceErrors({
				message: 'Código expirado',
				tag: ServiceErrorsTags.unauthorized,
			}),
		);
		expect(keyRepo.calls.create).toEqual(1);
		expect(keyRepo.calls.getSignature).toEqual(2);
	});
});
