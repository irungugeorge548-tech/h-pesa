// Starts the real API on port 5000 with the in-memory database (for trying the screens without Prisma).
const Module = require('module')
const { createFakePrisma } = require('./fakePrisma')
process.env.DISABLE_SCHEDULER = '1'
const fake = createFakePrisma()
const realLoad = Module._load
Module._load = function (request, ...rest) {
  if (request === '@prisma/client') return { PrismaClient: function PrismaClient() { return fake } }
  return realLoad.call(this, request, ...rest)
}
require('../prisma/seed.js')
setTimeout(() => { require('../src/index.js').listen(process.env.PORT || 5000, () => console.log('dev API on 5000')) }, 500)
