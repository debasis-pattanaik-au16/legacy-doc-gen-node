import Joi from 'joi';

/**
 * Validation schemas for API endpoints
 */

// User validation schemas
export const userValidation = {
  register: Joi.object({
    name: Joi.string()
      .trim()
      .min(2)
      .max(100)
      .required()
      .messages({
        'string.min': 'Name must be at least 2 characters long',
        'string.max': 'Name cannot exceed 100 characters',
        'any.required': 'Name is required'
      }),
    email: Joi.string()
      .email()
      .lowercase()
      .required()
      .messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required'
      }),
    password: Joi.string()
      .min(8)
      .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]'))
      .required()
      .messages({
        'string.min': 'Password must be at least 8 characters long',
        'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
        'any.required': 'Password is required'
      }),
    role: Joi.string()
      .valid('admin', 'user', 'viewer')
      .default('user')
  }),

  login: Joi.object({
    email: Joi.string()
      .email()
      .required()
      .messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required'
      }),
    password: Joi.string()
      .required()
      .messages({
        'any.required': 'Password is required'
      })
  }),

  forgotPassword: Joi.object({
    email: Joi.string()
      .email()
      .required()
      .messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required'
      })
  }),

  resetPassword: Joi.object({
    token: Joi.string()
      .required()
      .messages({
        'any.required': 'Reset token is required'
      }),
    password: Joi.string()
      .min(8)
      .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]'))
      .required()
      .messages({
        'string.min': 'Password must be at least 8 characters long',
        'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
        'any.required': 'Password is required'
      })
  }),

  updateProfile: Joi.object({
    name: Joi.string()
      .trim()
      .min(2)
      .max(100)
      .messages({
        'string.min': 'Name must be at least 2 characters long',
        'string.max': 'Name cannot exceed 100 characters'
      }),
    subscriptionPlan: Joi.string()
      .valid('free', 'pro', 'enterprise')
  }),

  // Profile & Settings validation schemas (NEW)
  updateProfileSettings: Joi.object({
    name: Joi.string()
      .trim()
      .min(1)
      .max(80)
      .required()
      .messages({
        'string.min': 'Name must be at least 1 character long',
        'string.max': 'Name cannot exceed 80 characters',
        'any.required': 'Name is required'
      }),
    company: Joi.string()
      .trim()
      .max(120)
      .allow('', null)
      .optional()
      .messages({
        'string.max': 'Company name cannot exceed 120 characters'
      }),
    timezone: Joi.string()
      .required()
      .messages({
        'any.required': 'Timezone is required'
      }),
    avatarUrl: Joi.string()
      .uri()
      .allow('', null)
      .optional()
      .messages({
        'string.uri': 'Avatar URL must be a valid URL'
      })
  }),

  updatePassword: Joi.object({
    currentPassword: Joi.string()
      .required()
      .messages({
        'any.required': 'Current password is required'
      }),
    newPassword: Joi.string()
      .min(8)
      .max(128)
      .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&#])[A-Za-z\\d@$!%*?&#]'))
      .required()
      .messages({
        'string.min': 'Password must be at least 8 characters long',
        'string.max': 'Password cannot exceed 128 characters',
        'string.pattern.base': 'Password must include uppercase, lowercase, number, and special character',
        'any.required': 'New password is required'
      })
  }),

  updateNotifications: Joi.object({
    productUpdates: Joi.boolean()
      .required()
      .messages({
        'any.required': 'Product updates preference is required',
        'boolean.base': 'Product updates must be true or false'
      }),
    analysisReady: Joi.boolean()
      .required()
      .messages({
        'any.required': 'Analysis ready preference is required',
        'boolean.base': 'Analysis ready must be true or false'
      })
  }),

  updatePreferences: Joi.object({
    autoSave: Joi.boolean()
      .required()
      .messages({
        'any.required': 'Auto-save preference is required',
        'boolean.base': 'Auto-save must be true or false'
      })
  })
};

// Project validation schemas
export const projectValidation = {
  create: Joi.object({
    name: Joi.string()
      .trim()
      .min(2)
      .max(100)
      .required()
      .messages({
        'string.min': 'Project name must be at least 2 characters long',
        'string.max': 'Project name cannot exceed 100 characters',
        'any.required': 'Project name is required'
      }),
    description: Joi.string()
      .trim()
      .max(500)
      .allow('')
      .messages({
        'string.max': 'Description cannot exceed 500 characters'
      })
  }),

  update: Joi.object({
    name: Joi.string()
      .trim()
      .min(2)
      .max(100)
      .messages({
        'string.min': 'Project name must be at least 2 characters long',
        'string.max': 'Project name cannot exceed 100 characters'
      }),
    description: Joi.string()
      .trim()
      .max(500)
      .allow('')
      .messages({
        'string.max': 'Description cannot exceed 500 characters'
      }),
    type: Joi.string()
      .valid('web', 'mobile', 'desktop', 'api', 'library', 'other')
      .messages({
        'any.only': 'Project type must be one of: web, mobile, desktop, api, library, other'
      }),
    status: Joi.string()
      .valid('uploading', 'analyzing', 'completed', 'error')
  }),

  addTeamMember: Joi.object({
    email: Joi.string()
      .email()
      .required()
      .messages({
        'string.email': 'Please provide a valid email address',
        'any.required': 'Email is required'
      })
  })
};

// File upload validation
export const uploadValidation = {
  fileUpload: Joi.object({
    originalname: Joi.string().required(),
    mimetype: Joi.string()
      .valid('application/zip', 'application/x-zip-compressed')
      .required()
      .messages({
        'any.only': 'Only ZIP files are allowed'
      }),
    size: Joi.number()
      .max(524288000) // 500MB
      .required()
      .messages({
        'number.max': 'File size cannot exceed 500MB'
      })
  })
};

// Query parameter validation
export const queryValidation = {
  pagination: Joi.object({
    page: Joi.number()
      .integer()
      .min(1)
      .default(1),
    limit: Joi.number()
      .integer()
      .min(1)
      .max(100)
      .default(10),
    sortBy: Joi.string()
      .valid('createdAt', 'updatedAt', 'name', 'status')
      .default('updatedAt'),
    sortOrder: Joi.string()
      .valid('asc', 'desc')
      .default('desc'),
    // Keep legacy sort parameter for backward compatibility
    sort: Joi.string()
      .valid('createdAt', '-createdAt', 'name', '-name', 'status', '-status')
      .default('-createdAt')
  }),

  projectFilters: Joi.object({
    status: Joi.string()
      .valid('created', 'uploading', 'uploaded', 'analyzing', 'analyzed', 'generating', 'completed', 'failed'),
    type: Joi.string()
      .valid('web', 'mobile', 'desktop', 'api', 'library', 'other'),
    search: Joi.string()
      .trim()
      .max(100)
  })
};

// Combined project query schema with pagination and filters
export const projectQuerySchema = Joi.object({
  // Pagination
  page: Joi.number()
    .integer()
    .min(1)
    .default(1),
  limit: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(10),
  sortBy: Joi.string()
    .valid('createdAt', 'updatedAt', 'name', 'status')
    .default('updatedAt'),
  sortOrder: Joi.string()
    .valid('asc', 'desc')
    .default('desc'),
  // Filters
  status: Joi.string()
    .valid('created', 'uploading', 'uploaded', 'analyzing', 'analyzed', 'generating', 'completed', 'failed'),
  type: Joi.string()
    .valid('web', 'mobile', 'desktop', 'api', 'library', 'other'),
  search: Joi.string()
    .trim()
    .max(100)
});

// Export individual schemas for backward compatibility
export const projectCreateSchema = projectValidation.create;
export const projectUpdateSchema = projectValidation.update;
export const teamMemberSchema = projectValidation.addTeamMember;

// MongoDB ObjectId validation
export const objectIdValidation = Joi.string()
  .pattern(/^[0-9a-fA-F]{24}$/)
  .required()
  .messages({
    'string.pattern.base': 'Invalid ID format',
    'any.required': 'ID is required'
  });

/**
 * Validation middleware factory
 */
export const validate = (schema: Joi.ObjectSchema, property: 'body' | 'query' | 'params' = 'body') => {
  return (req: any, res: any, next: any) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errorDetails = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        success: false,
        error: {
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: errorDetails
        }
      });
    }

    req[property] = value;
    next();
  };
};
