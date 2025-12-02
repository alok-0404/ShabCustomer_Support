import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

const cwd = process.cwd();

const enqueueIfExists = (files, relativePath) => {
  if (!relativePath) return;
  const fullPath = path.resolve(cwd, relativePath);
  if (fs.existsSync(fullPath)) {
    files.push(fullPath);
  }
};

const envFilesToLoad = [];

enqueueIfExists(envFilesToLoad, '.env');
enqueueIfExists(envFilesToLoad, '.env.local');

const nodeEnv = process.env.NODE_ENV || '';
if (nodeEnv) {
  enqueueIfExists(envFilesToLoad, `.env.${nodeEnv}`);
  enqueueIfExists(envFilesToLoad, `.env.${nodeEnv}.local`);
  enqueueIfExists(envFilesToLoad, `${nodeEnv}.env`);
}

envFilesToLoad.forEach((filePath) => {
  dotenv.config({ path: filePath, override: true });
});

export default process.env;

