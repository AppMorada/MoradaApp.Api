import { EntitiesEnum, ValueObject } from '@app/entities/entities';
import { User } from '@app/entities/user';
import {
	UserRepoWriteOps,
	UserRepoWriteOpsInterfaces,
} from '@app/repositories/user/write';
import { InMemoryError } from '@tests/errors/inMemoryError';
import { InMemoryContainer } from '../../inMemoryContainer';

import { CondominiumMember } from '@app/entities/condominiumMember';
import { Invite } from '@app/entities/invite';
import { Condominium } from '@app/entities/condominium';
import { UniqueRegistry } from '@app/entities/uniqueRegistry';

export class InMemoryUserWriteOps implements UserRepoWriteOps {
	calls = {
		create: 0,
		delete: 0,
		update: 0,
	};
	users: User[];
	invites: Invite[];
	condominiums: Condominium[];
	uniqueRegistries: UniqueRegistry[];
	condominiumMembers: CondominiumMember[];

	constructor(container: InMemoryContainer) {
		this.users = container.props.userArr;
		this.uniqueRegistries = container.props.uniqueRegistryArr;
		this.invites = container.props.inviteArr;
		this.condominiums = container.props.condominiumArr;
		this.condominiumMembers = container.props.condominiumMemberArr;
	}

	async delete(input: UserRepoWriteOpsInterfaces.remove): Promise<void> {
		++this.calls.delete;

		const existentUserIndex = this.users.findIndex((item) =>
			item.id.equalTo(input.key),
		);
		const uniqueRegistryIndex = this.uniqueRegistries.findIndex((item) =>
			ValueObject.compare(
				item.id,
				this.users[existentUserIndex]?.uniqueRegistryId,
			),
		);

		if (existentUserIndex < 0 || uniqueRegistryIndex < 0)
			throw new InMemoryError({
				entity: EntitiesEnum.user,
				message: 'User doesn\'t exist',
			});

		this.uniqueRegistries.splice(uniqueRegistryIndex, 1);
		this.users.splice(existentUserIndex, 1);
		this.condominiumMembers = this.condominiumMembers.filter(
			(item) => item.userId?.equalTo(input.key),
		);
	}

	async update(input: UserRepoWriteOpsInterfaces.update): Promise<void> {
		++this.calls.update;

		const existentUserIndex = this.users.findIndex((item) =>
			item.id.equalTo(input.id),
		);

		if (existentUserIndex < 0)
			throw new InMemoryError({
				entity: EntitiesEnum.user,
				message: 'User doesn\'t exist',
			});

		const user = this.users[existentUserIndex];
		user.name = input?.name ?? user.name;
		user.phoneNumber = input?.phoneNumber ?? user.phoneNumber;
	}
}
