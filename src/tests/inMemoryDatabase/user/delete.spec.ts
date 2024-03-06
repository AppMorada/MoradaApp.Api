import { InMemoryError } from '@tests/errors/inMemoryError';
import { InMemoryUser } from '.';
import { userFactory } from '@tests/factories/user';
import { EntitiesEnum } from '@app/entities/entities';
import { InMemoryContainer } from '../inMemoryContainer';

describe('InMemoryData test: User delete method', () => {
	let container: InMemoryContainer;
	let sut: InMemoryUser;

	beforeEach(() => {
		container = new InMemoryContainer();
		sut = new InMemoryUser(container);
	});

	it('should be able to delete one user', async () => {
		const user = userFactory();

		sut.users.push(user);
		await sut.delete({ key: user.id });

		expect(Boolean(sut.users[0])).toBeFalsy();
		expect(sut.calls.delete).toEqual(1);
	});

	it('should be able to throw one error: user does not exist - delete operation', async () => {
		const user = userFactory();
		await expect(sut.delete({ key: user.id })).rejects.toThrow(
			new InMemoryError({
				entity: EntitiesEnum.user,
				message: 'User doesn\'t exist',
			}),
		);

		expect(sut.calls.delete).toEqual(1);
	});
});
