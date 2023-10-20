import { CreateCondominiumService } from './createCondominium.service';
import { condominiumFactory } from '@tests/factories/condominium';
import { InMemoryCondominium } from '@tests/inMemoryDatabase/condominium';
import { CepGatewayMock } from '@tests/gateways/CEP.gateway';

describe('Create condominium test', () => {
	let createCondominium: CreateCondominiumService;

	let condominiumRepo: InMemoryCondominium;
	let cepGateway: CepGatewayMock;

	beforeEach(() => {
		condominiumRepo = new InMemoryCondominium();
		cepGateway = new CepGatewayMock();

		createCondominium = new CreateCondominiumService(
			condominiumRepo,
			cepGateway,
		);
	});

	it('should be able to create a condominium', async () => {
		const condominium = condominiumFactory();

		await createCondominium.exec({ condominium });

		expect(
			condominiumRepo.condominiums[0].equalTo(condominium),
		).toBeTruthy();
	});
});
