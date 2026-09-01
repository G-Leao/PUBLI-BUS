#!/usr/bin/env node
/**
 * Verificação de integridade do backend PUBLI-BUS
 * Valida estrutura de pastas, arquivos críticos e configurações
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendDir = path.resolve(__dirname, '..');

const checks = {
  folders: [
    'src/config',
    'src/controllers',
    'src/middlewares',
    'src/routes',
    'src/services',
    'src/utils',
    'prisma',
  ],
  criticalFiles: [
    'src/server.js',
    'src/app.js',
    'prisma/schema.prisma',
    'prisma/seed.js',
    'package.json',
    '.env.example',
  ],
  controllers: [
    'authController',
    'companyController',
    'userController',
    'advertiserController',
    'busController',
    'advertisingSpaceController',
    'campaignController',
    'tabletController',
    'mediaController',
    'impressionController',
    'dashboardController',
  ],
  services: [
    'authService',
    'companyService',
    'userService',
    'advertiserService',
    'busService',
    'advertisingSpaceService',
    'campaignService',
    'tabletService',
    'mediaService',
    'impressionService',
    'dashboardService',
  ],
  routes: [
    'auth',
    'companies',
    'users',
    'advertisers',
    'buses',
    'advertising-spaces',
    'campaigns',
    'tablets',
    'media',
    'impressions',
    'dashboard',
  ],
};

let passed = 0;
let failed = 0;

console.log('\n🔍 Verificando integridade do backend PUBLI-BUS...\n');

// Check folders
console.log('📁 Pastas:');
for (const folder of checks.folders) {
  const folderPath = path.join(backendDir, folder);
  if (fs.existsSync(folderPath)) {
    console.log(`  ✓ ${folder}`);
    passed++;
  } else {
    console.log(`  ✗ ${folder} (faltando)`);
    failed++;
  }
}

// Check critical files
console.log('\n📄 Arquivos críticos:');
for (const file of checks.criticalFiles) {
  const filePath = path.join(backendDir, file);
  if (fs.existsSync(filePath)) {
    console.log(`  ✓ ${file}`);
    passed++;
  } else {
    console.log(`  ✗ ${file} (faltando)`);
    failed++;
  }
}

// Check controllers
console.log('\n🎮 Controllers:');
for (const controller of checks.controllers) {
  const files = [
    path.join(backendDir, 'src/controllers', `${controller}.js`),
    path.join(backendDir, 'src/controllers', `${controller.replace('Controller', '')}.js`),
  ];
  const exists = files.some(f => fs.existsSync(f));
  if (exists) {
    console.log(`  ✓ ${controller}`);
    passed++;
  } else {
    console.log(`  ✗ ${controller} (faltando)`);
    failed++;
  }
}

// Check services
console.log('\n⚙️  Services:');
for (const service of checks.services) {
  const files = [
    path.join(backendDir, 'src/services', `${service}.js`),
    path.join(backendDir, 'src/services', `${service.replace('Service', '')}.js`),
  ];
  const exists = files.some(f => fs.existsSync(f));
  if (exists) {
    console.log(`  ✓ ${service}`);
    passed++;
  } else {
    console.log(`  ✗ ${service} (faltando)`);
    failed++;
  }
}

// Check routes
console.log('\n🛣️  Routes:');
const routesDir = path.join(backendDir, 'src/routes');
for (const route of checks.routes) {
  const files = [
    path.join(routesDir, `${route}Routes.js`),
    path.join(routesDir, `${route}.js`),
  ];
  const exists = files.some(f => fs.existsSync(f));
  if (exists) {
    console.log(`  ✓ ${route}`);
    passed++;
  } else {
    console.log(`  ✗ ${route} (faltando)`);
    failed++;
  }
}

// Summary
console.log('\n' + '='.repeat(50));
console.log(`✓ Passou: ${passed}`);
console.log(`✗ Falhou: ${failed}`);
console.log('='.repeat(50));

if (failed === 0) {
  console.log('\n✅ Todos os arquivos críticos estão presentes!\n');
  process.exit(0);
} else {
  console.log(`\n⚠️  ${failed} arquivo(s) faltando. Verifique a estrutura.\n`);
  process.exit(1);
}
