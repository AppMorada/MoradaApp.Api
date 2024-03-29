import { CreateCondominiumService } from '../../condominium/create.service';
import { condominiumFactory } from '@tests/factories/condominium';
import { InMemoryCondominiumWriteOps } from '@tests/inMemoryDatabase/condominium/write';
import { CepGatewaySpy } from '@tests/gateways/CEP.gateway';
import { InMemoryContainer } from '@tests/inMemoryDatabase/inMemoryContainer';
import { userFactory } from '@tests/factories/user';
import { CryptSpy } from '@tests/adapters/cryptSpy';
import { uniqueRegistryFactory } from '@tests/factories/uniqueRegistry';

describe('Create condominium service test', () => {
	let sut: CreateCondominiumService;

	let inMemoryContainer: InMemoryContainer;
	let condominiumRepo: InMemoryCondominiumWriteOps;
	let cepGateway: CepGatewaySpy;
	let cryptAdapter: CryptSpy;

	beforeEach(() => {
		inMemoryContainer = new InMemoryContainer();
		condominiumRepo = new InMemoryCondominiumWriteOps(inMemoryContainer);
		cepGateway = new CepGatewaySpy();
		cryptAdapter = new CryptSpy();

		sut = new CreateCondominiumService(
			condominiumRepo,
			cepGateway,
			cryptAdapter,
		);
	});

	it('should be able to create a condominium', async () => {
		const uniqueRegistry = uniqueRegistryFactory();
		const user = userFactory();
		const condominium = condominiumFactory({ ownerId: user.id.value });

		await sut.exec({
			condominium: {
				name: condominium.name.value,
				CEP: condominium.CEP.value,
				num: condominium.num.value,
				CNPJ: condominium.CNPJ.value,
			},
			user: {
				name: user.name.value,
				email: uniqueRegistry.email.value,
				password: user.password.value,
			},
		});

		expect(
			condominiumRepo.condominiums[0].name.equalTo(condominium.name) &&
				condominiumRepo.condominiums[0].CEP.equalTo(condominium.CEP) &&
				condominiumRepo.condominiums[0].num.equalTo(condominium.num) &&
				condominiumRepo.condominiums[0].CNPJ.equalTo(condominium.CNPJ),
		).toBeTruthy();
		expect(cepGateway.calls.check).toEqual(1);
		expect(condominiumRepo.calls.create).toEqual(1);
		expect(cryptAdapter.calls.hash).toEqual(2);
	});
});
