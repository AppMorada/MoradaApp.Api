import { userFactory } from '@tests/factories/user';
import { CryptSpy } from '@tests/adapters/cryptSpy';
import { GenInviteService } from '../genInvite.service';
import { condominiumFactory } from '@tests/factories/condominium';
import { InMemoryInvite } from '@tests/inMemoryDatabase/invites';
import { InMemoryContainer } from '@tests/inMemoryDatabase/inMemoryContainer';
import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import { CryptAdapter } from '@app/adapters/crypt';
import { InviteRepo } from '@app/repositories/invite';
import { EVENT_ID, EventsTypes } from '@infra/events/ids';
import { KeyRepo, KeysEnum } from '@app/repositories/key';
import { InMemoryKey } from '@tests/inMemoryDatabase/key';
import { GetKeyService } from '../getKey.service';
import { Key } from '@app/entities/key';
import { randomBytes } from 'crypto';

describe('Gen invite test', () => {
	let genInvite: GenInviteService;

	let app: TestingModule;
	let inviteRepo: InMemoryInvite;
	let crypt: CryptSpy;
	let eventEmitter: EventEmitter2;

	beforeEach(async () => {
		/* eslint-disable @typescript-eslint/no-unused-vars */
		EventEmitter2.prototype.emit = jest.fn(
			(..._: Parameters<typeof EventEmitter2.prototype.emit>) => true,
		);

		const container = new InMemoryContainer();

		app = await Test.createTestingModule({
			imports: [
				EventEmitterModule.forRoot({
					wildcard: false,
					delimiter: '.',
					newListener: false,
					removeListener: false,
					maxListeners: 10,
					verboseMemoryLeak: true,
					ignoreErrors: false,
				}),
			],
			providers: [
				{
					provide: InviteRepo,
					useValue: new InMemoryInvite(container),
				},
				{
					provide: KeyRepo,
					useValue: new InMemoryKey(container),
				},
				{
					provide: CryptAdapter,
					useClass: CryptSpy,
				},
				GetKeyService,
				GenInviteService,
			],
		}).compile();

		eventEmitter = app.get(EventEmitter2);
		inviteRepo = app.get(InviteRepo);
		crypt = app.get(CryptAdapter);

		genInvite = app.get(GenInviteService);

		eventEmitter.once(EVENT_ID.EMAIL.SEND, () => true);

		const inviteKey = new Key({
			ttl: 1000 * 60 * 60,
			name: KeysEnum.INVITE_TOKEN_KEY,
			actual: {
				content: randomBytes(100).toString('hex'),
				buildedAt: Date.now(),
			},
		});

		const keyRepo = app.get<InMemoryKey>(KeyRepo);
		await keyRepo.create(inviteKey);
	});

	afterEach(async () => {
		await app.close();
	});

	it('should be able to create a user', async () => {
		const user = userFactory();
		const condominium = condominiumFactory();

		const { hashedValue } = await genInvite.exec({
			email: user.email,
			condominiumId: condominium.id,
		});

		expect(inviteRepo.calls.create).toEqual(1);
		expect(crypt.calls.hashWithHmac).toEqual(1);

		const frontendUrl = String(process.env.FRONT_END_INVITE_URL);
		const payload: EventsTypes.Email.ISendProps = {
			to: user.email.value,
			subject: `${process.env.PROJECT_NAME} - Convite para o condomínio`,
			body: `<h1>Seja bem-vindo!</h1>
				<p>Não compartilhe este link com ninguém</p>
				<a href="${frontendUrl}${hashedValue}">${frontendUrl}${hashedValue}</a>`,
		};
		expect(eventEmitter.emit).toHaveBeenCalledWith(
			EVENT_ID.EMAIL.SEND,
			payload,
		);
	});
});