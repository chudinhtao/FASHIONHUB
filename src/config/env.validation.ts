import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  PORT: Joi.number().default(8080),
  DATABASE_URL: Joi.string().required(),
  JWT_SECRET: Joi.string().required(),
  JWT_ACCESS_EXPIRATION: Joi.string().default('900s'),
  JWT_REFRESH_EXPIRATION: Joi.string().default('7d'),
  REDIS_HOST: Joi.string().default('localhost'),
  REDIS_PORT: Joi.number().default(6379),
  UPLOAD_PATH: Joi.string().default('./uploads'),
});
