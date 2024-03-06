import { Injectable } from '@nestjs/common';
import { IService } from '../_IService';
import { UUID } from '@app/entities/VO';
import { CondominiumRepo } from '@app/repositories/condominium';
import {
	CondominiumMapper,
	TCondominiumInObject,
} from '@app/mapper/condominium';

interface IProps {
	id: UUID;
}

@Injectable()
export class GetCondominiumService implements IService {
	constructor(private readonly condominiumRepo: CondominiumRepo) {}

	async exec(input: IProps) {
		const raw = await this.condominiumRepo.find({ key: input.id });

		let condominium: Omit<TCondominiumInObject, 'seedKey'> | undefined;
		if (raw) {
			const objt = CondominiumMapper.toObject(raw) as any;
			delete objt.seedKey;

			condominium = objt;
		}

		return { data: condominium ?? null };
	}
}
