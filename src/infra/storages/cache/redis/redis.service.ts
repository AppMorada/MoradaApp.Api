import { Injectable } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService extends Redis {
	constructor() {
		super(process.env.REDIS_URL as string);
	}
}
