import { LayersEnum, LoggerAdapter } from '@app/adapters/logger';
import {
	ArgumentsHost,
	Catch,
	ExceptionFilter,
	NotFoundException,
} from '@nestjs/common';
import { Response, Request } from 'express';

/** Usado para filtrar erros de Not Found */
@Catch(NotFoundException)
export class NotFoundFilter implements ExceptionFilter {
	constructor(private readonly logger: LoggerAdapter) {}

	catch(_: NotFoundException, host: ArgumentsHost) {
		const context = host.switchToHttp();
		const response = context.getResponse<Response>();
		const request = context.getRequest<Request>();

		this.logger.error({
			name: `SessionId(${request.sessionId}): Não encontrado`,
			layer: LayersEnum.controller,
			description: 'O recurso que você está procurando não existe',
		});

		return response.status(404).json({
			statusCode: 404,
			name: 'Não encontrado',
			message: 'O recurso que você está procurando não existe',
		});
	}
}