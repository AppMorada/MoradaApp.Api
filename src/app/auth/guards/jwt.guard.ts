import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRepo } from '@app/repositories/user';
import { IAccessTokenBody } from '../tokenTypes';
import { GuardErrors } from '@app/errors/guard';
import { Request } from 'express';
import { UUID } from '@app/entities/VO';

/** Usado para validar um JWT vindo do authorization header */
@Injectable()
export class JwtGuard implements CanActivate {
	constructor(
		private readonly jwtService: JwtService,
		private readonly userRepo: UserRepo,
	) {}

	private async checkToken(token: string) {
		const tokenData: IAccessTokenBody = await this.jwtService
			.verifyAsync(token, {
				secret: process.env.ACCESS_TOKEN_KEY,
			})
			.catch(() => {
				throw new GuardErrors({ message: 'JWT inválido' });
			});

		return tokenData;
	}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const req = context.switchToHttp().getRequest<Request>();

		const token = String(req?.headers?.authorization).split(' ')[1];
		if (!token) throw new GuardErrors({ message: 'Token não encontrado' });

		const tokenData = (await this.checkToken(token)) as IAccessTokenBody;

		const user = await this.userRepo.find({
			key: new UUID(tokenData.sub),
			safeSearch: true,
		});

		req.inMemoryData = {
			...req.inMemoryData,
			user,
		};

		return true;
	}
}