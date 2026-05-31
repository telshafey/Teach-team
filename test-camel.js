const camelToSnake = (str) => str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
const camelToSnakeCase = (obj) => {
    if (Array.isArray(obj)) {
        return obj.map(v => camelToSnakeCase(v));
    } else if (obj !== null && typeof obj === 'object') {
        return Object.keys(obj).reduce((acc, key) => {
            acc[camelToSnake(key)] = camelToSnakeCase(obj[key]);
            return acc;
        }, {});
    }
    return obj;
};

console.log(camelToSnakeCase({ appName: 'test', logoUrl: 'url', isFinanceModuleEnabled: true }));
