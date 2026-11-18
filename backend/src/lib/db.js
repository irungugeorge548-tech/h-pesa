const { PrismaClient } = require('@prisma/client');

// One shared client for the new modules (the original routes keep their own, unchanged).
module.exports = new PrismaClient();
