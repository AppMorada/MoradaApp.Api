import { Controller, Delete, HttpCode, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { User } from '@registry:app/entities/user';
import { Throttle } from '@nestjs/throttler';
import { JwtGuard } from '@registry:app/auth/guards/jwt.guard';
import { DeleteUserService } from '@registry:app/services/deleteUser.service';
import { USER_PREFIX } from '../consts';

@Controller(USER_PREFIX)
export class DeleteUserController {
	/** Acesse /api para ver as rotas disponíveis **/
	constructor(private readonly deleteUserService: DeleteUserService) {}

	@Throttle({
		default: {
			limit: 3,
			ttl: 60000,
		},
	})
	@UseGuards(JwtGuard)
	@Delete()
	@HttpCode(204)
	async deleteAccount(@Req() req: Request) {
		const user = req.inMemoryData.user as User;
		await this.deleteUserService.exec({ target: user.email });
	}
}
