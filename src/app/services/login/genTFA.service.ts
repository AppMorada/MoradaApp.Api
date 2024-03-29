import { CryptAdapter } from '@app/adapters/crypt';
import { Email, UUID } from '@app/entities/VO';
import { Injectable } from '@nestjs/common';
import { UserRepoReadOps } from '@app/repositories/user/read';
import { generateStringCodeContentBasedOnUser } from '@utils/generateStringCodeContent';
import { IService } from '../_IService';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EVENT_ID, EventsTypes } from '@infra/events/ids';
import { GetKeyService } from '../key/getKey.service';
import { KeysEnum } from '@app/repositories/key';
import { EnvEnum, GetEnvService } from '@infra/configs/env/getEnv.service';

interface IProps {
	email: Email;
	userId: UUID;
}

@Injectable()
export class GenTFAService implements IService {
	constructor(
		private readonly userRepo: UserRepoReadOps,
		private readonly crypt: CryptAdapter,
		private readonly eventEmitter: EventEmitter2,
		private readonly getKey: GetKeyService,
		private readonly getEnv: GetEnvService,
	) {}

	private async genCode(input: UUID) {
		const userContent = await this.userRepo.find({
			key: input,
			safeSearch: true,
		});
		let code = generateStringCodeContentBasedOnUser({
			uniqueRegistry: userContent.uniqueRegistry,
			user: userContent.user,
		});
		const { key } = await this.getKey.exec({
			name: KeysEnum.TFA_TOKEN_KEY,
		});

		const metadata = JSON.stringify({
			iat: Math.floor(Date.now() / 1000),
			exp: Math.floor((Date.now() + 1000 * 60 * 60 * 3) / 1000),
			sub: userContent.uniqueRegistry.email.value,
		});
		code = encodeURIComponent(
			`${btoa(metadata)}.${btoa(code)}`.replaceAll('=', ''),
		);

		const inviteSignature = await this.crypt.hashWithHmac({
			data: code,
			key: key.actual.content,
		});
		return encodeURIComponent(
			`${btoa(metadata)}.${btoa(inviteSignature)}`.replaceAll('=', ''),
		);
	}

	async exec(input: IProps) {
		const code = await this.genCode(input.userId);

		const { env: FRONT_END_AUTH_URL } = await this.getEnv.exec({
			env: EnvEnum.FRONT_END_AUTH_URL,
		});
		const { env: PROJECT_NAME } = await this.getEnv.exec({
			env: EnvEnum.PROJECT_NAME,
		});

		const payload: EventsTypes.Email.ISendProps = {
			to: input.email.value,
			subject: `${PROJECT_NAME} - Solicitação de login`,
			body: `<h1>Seja bem-vindo!</h1>
				<p>Não compartilhe este código com ninguém</p>
				<a href="${FRONT_END_AUTH_URL}${code}">${FRONT_END_AUTH_URL}${code}</a>`,
		};
		this.eventEmitter.emit(EVENT_ID.EMAIL.SEND, payload);

		return { code };
	}
}
