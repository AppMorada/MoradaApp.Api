import { CPF } from '@app/entities/VO/CPF';
import { ApartmentNumber } from '@app/entities/VO/apartmentNumber';
import { Block } from '@app/entities/VO/block';
import { Email } from '@app/entities/VO/email';
import { Level } from '@app/entities/VO/level';
import { Name } from '@app/entities/VO/name';
import { Password } from '@app/entities/VO/password';
import { PhoneNumber } from '@app/entities/VO/phoneNumber';
import { User } from '@app/entities/user';
import { User as UserPrisma } from '@prisma/client';

export class UserPrismaMapper {
	static toPrisma(input: User): UserPrisma {
		return {
			id: input.id,
			name: input.name.value,
			email: input.email.value,
			password: input.password.value,
			CPF: input.CPF.value,
			phoneNumber: input.phoneNumber.value,
			level: input.level.value,
			condominiumId: input.condominiumId,
			block: input.block ? input.block.value : null,
			apartment_number: input.apartmentNumber
				? input.apartmentNumber.value
				: null,
			createdAt: input.createdAt,
			updatedAt: input.updatedAt,
		};
	}

	static toClass(input: UserPrisma): User {
		return new User(
			{
				name: new Name(input.name),
				email: new Email(input.email),
				password: new Password(input.password),
				CPF: new CPF(input.CPF),
				phoneNumber: new PhoneNumber(input.phoneNumber),
				level: new Level(input.level),
				condominiumId: input.condominiumId,
				block: input.block !== null ? new Block(input.block) : null,
				apartmentNumber:
					input.apartment_number !== null
						? new ApartmentNumber(input.apartment_number)
						: null,
				createdAt: input.createdAt,
				updatedAt: input.updatedAt,
			},
			input.id,
		);
	}
}
