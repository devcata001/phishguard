export default {
    testEnvironment: 'node',
    transform: {},
    moduleFileExtensions: ['js', 'json'],
    testMatch: ['**/__tests__/**/*.test.js', '**/?(*.)+(spec|test).js'],
    collectCoverageFrom: [
        'services/**/*.js',
        'controllers/**/*.js',
        'utils/**/*.js',
        'middleware/**/*.js',
        '!**/__tests__/**',
    ],
    coverageThreshold: {
        global: {
            branches: 70,
            functions: 70,
            lines: 70,
            statements: 70,
        },
    },
    verbose: true,
    testTimeout: 10000,
};
