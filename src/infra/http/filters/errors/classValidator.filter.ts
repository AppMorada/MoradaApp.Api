import { LayersEnum, LoggerAdapter } from '@app/adapters/logger';
import {
	ArgumentsHost,
	BadRequestException,
	Catch,
	ExceptionFilter,
} from '@nestjs/common';
import { isArray, isNumber, isString } from 'class-validator';
import { Response, Request } from 'express';

interface IBodyProps {
	message: Array<string>;
	error: string;
	statusCode: number;
}

/** Usado para filtrar erros do Class Validator */
@Catch(BadRequestException)
export class ClassValidatorErrorFilter implements ExceptionFilter {
	constructor(private readonly logger: LoggerAdapter) {}

	validateBody(input: any): input is IBodyProps {
		return (
			'message' in input &&
			isArray<string>(input['message']) &&
			'error' in input &&
			isString(input['error']) &&
			'statusCode' in input &&
			isNumber(input['statusCode'])
		);
	}

	catch(exception: BadRequestException, host: ArgumentsHost) {
		const context = host.switchToHttp();
		const response = context.getResponse<Response>();
		const request = context.getRequest<Request>();

		const body = exception.getResponse() as IBodyProps;
		if (!this.validateBody(body)) {
			this.logger.error({
				name: `SessionId(${request.sessionId}): Erro interno do servidor`,
				layer: LayersEnum.dto,
				description: 'Retorno inválido para respostas com status 400',
				stack: exception.stack,
			});

			return response.status(500).json({
				statusCode: 500,
				message: 'Erro interno do servidor',
			});
		}

		this.logger.error({
			name: `SessionId(${request.sessionId}): Requisição ruim`,
			layer: LayersEnum.dto,
			description: JSON.stringify(body.message),
			stack: exception.stack,
		});

		return response.status(400).json({
			statusCode: 400,
			name: 'Requisição ruim',
			message: body.message,
		});
	}
}