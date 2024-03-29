import { GenInviteService } from '@app/services/invites/genInvite.service';
import { UploadCollectionOfMembersService } from '@app/services/members/community/uploadCollectionOfUsers';
import { condominiumFactory } from '@tests/factories/condominium';
import { userFactory } from '@tests/factories/user';
import { InMemoryCommunityMembersWriteOps } from '@tests/inMemoryDatabase/communityMember/write';
import { InMemoryContainer } from '@tests/inMemoryDatabase/inMemoryContainer';
import { GenInviteServiceSpy } from '@tests/services/genInviteService';

describe('Upload collection of users', () => {
	let container: InMemoryContainer;
	let memberRepo: InMemoryCommunityMembersWriteOps;
	let genInvite: GenInviteService;

	let sut: UploadCollectionOfMembersService;

	beforeEach(() => {
		container = new InMemoryContainer();
		memberRepo = new InMemoryCommunityMembersWriteOps(container);
		genInvite = new GenInviteServiceSpy() as unknown as GenInviteService;

		sut = new UploadCollectionOfMembersService(memberRepo, genInvite);
	});

	it('should be able to upload new collection of users', async () => {
		const condominium = condominiumFactory();
		const author = userFactory();

		const members = [
			{
				email: 'user1@email.com',
				apartmentNumber: 100,
				block: 'A12',
				CPF: '176.193.509-77',
			},
			{
				email: 'user2@email.com',
				apartmentNumber: 200,
				block: 'A23',
				CPF: '512.301.626-07',
			},
		];

		await sut.exec({ condominium, user: author, members });
		expect(memberRepo.calls.create === 2).toEqual(true);
	});
});
