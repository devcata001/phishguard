/**
 * Input Validation Middleware
 * 
 * Validates and sanitizes API inputs using Joi schemas.
 * Prevents injection attacks and ensures data integrity.
 */

import Joi from 'joi';
import { ApiError } from './errorHandler.js';
import { sanitizeInput } from './security.js';
import config from '../config.js';

/**
 * Joi schema for email analysis request
 */
const analyzeSchema = Joi.object({
    text: Joi.string()
        .required()
        .min(1)
        .max(config.security.maxTextLength)
        .trim()
        .custom((value, helpers) => {
            // Check for null bytes
            if (value.includes('\0')) {
                return helpers.error('any.invalid');
            }
            return value;
        })
        .messages({
            'string.base': 'Field "text" must be a string',
            'string.empty': 'Field "text" cannot be empty',
            'string.min': 'Field "text" must contain at least 1 character',
            'string.max': `Field "text" cannot exceed ${config.security.maxTextLength} characters`,
            'any.required': 'Field "text" is required',
            'any.invalid': 'Invalid characters detected in input',
        }),
}).unknown(false); // Reject unknown fields

/**
 * Validate email analysis request
 */
export const validateAnalyzeRequest = (req, res, next) => {
    const { error, value } = analyzeSchema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true,
    });

    if (error) {
        const details = error.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message,
        }));

        throw new ApiError(400, 'Validation failed', details);
    }

    // Sanitize validated input
    req.validatedBody = {
        text: sanitizeInput(value.text),
    };

    next();
};
