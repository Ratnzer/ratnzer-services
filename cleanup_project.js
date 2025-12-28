
const fs = require('fs');
const path = require('path');

// Colors for console
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

console.log(`${YELLOW}🧹 Starting Project Cleanup...${RESET}`);

// 1. Files to delete from ROOT (Duplicates of src/)
const rootFilesToDelete = [
  'App.tsx',
  'index.tsx',
  'index.css',
  'types.ts',
  'constants.ts',
  'Profile.tsx',
  'Notifications.tsx'
];

// 2. Directories to delete from ROOT (Duplicates of src/)
const rootDirsToDelete = [
  'pages',
  'components' // Only if exists in root
];

// 3. Deprecated Server Directories (Replaced by Prisma)
const serverDirsToDelete = [
  'server/models'
];

// --- DELETE FUNCTIONS ---

const deleteFile = (fileName) => {
  const filePath = path.join(__dirname, fileName);
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
      console.log(`${GREEN}✅ Deleted file: ${fileName}${RESET}`);
    } catch (err) {
      console.error(`${RED}❌ Error deleting ${fileName}: ${err.message}${RESET}`);
    }
  } else {
    // console.log(`${YELLOW}ℹ️  File not found (already clean): ${fileName}${RESET}`);
  }
};

const deleteDir = (dirName) => {
  const dirPath = path.join(__dirname, dirName);
  if (fs.existsSync(dirPath)) {
    try {
      fs.rmSync(dirPath, { recursive: true, force: true });
      console.log(`${GREEN}✅ Deleted directory: ${dirName}${RESET}`);
    } catch (err) {
      console.error(`${RED}❌ Error deleting directory ${dirName}: ${err.message}${RESET}`);
    }
  }
};

// --- EXECUTE ---

console.log(`\n${YELLOW}--- Cleaning Root Duplicates ---${RESET}`);
rootFilesToDelete.forEach(deleteFile);
rootDirsToDelete.forEach(deleteDir);

console.log(`\n${YELLOW}--- Cleaning Server Legacy Files ---${RESET}`);
serverDirsToDelete.forEach(deleteDir);

console.log(`\n${GREEN}✨ Cleanup Complete! Your project is now production-ready.${RESET}`);
console.log(`${YELLOW}👉 Please restart your development server: npm run dev${RESET}`);
