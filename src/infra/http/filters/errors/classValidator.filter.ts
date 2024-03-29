import { LayersEnum, LoggerAdapter } from '@app/adapters/logger';
import {
	ArgumentsHost,
	BadRequestException,
	Catch,
	ExceptionFilter,
} from '@nestjs/common';
import { isArray, isNumber, isString } from 'class-validator';
import { Response } from 'express';

interface IBodyProps {
	message: Array<string>;
	error: string;
	statusCode: number;
}

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

		const body = exception.getResponse() as IBodyProps;
		this.logger.error({
			name: 'Requisição ruim',
			layer: LayersEnum.dto,
			description: JSON.stringify(body.message),
			stack: exception.stack,
		});

		if (!this.validateBody(body))
			return response.status(400).json({
				statusCode: 400,
				message: 'Requisição ruim',
			});

		return response.status(400).json({
			statusCode: 400,
			name: 'Requisição ruim',
			message: body.message,
		});
	}
}
