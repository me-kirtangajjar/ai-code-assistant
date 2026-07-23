import { chown, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join, resolve, sep } from 'node:path';

import type { ExecutionWorkspace, RunnerIdentity } from './runner.types.js';

const WORKSPACE_PREFIX = 'ai-code-execution-';

const isManagedWorkspace = (directoryPath: string): boolean => {
  const temporaryRoot = resolve(tmpdir());
  const resolvedDirectory = resolve(directoryPath);

  return (
    resolvedDirectory.startsWith(`${temporaryRoot}${sep}`) &&
    basename(resolvedDirectory).startsWith(WORKSPACE_PREFIX)
  );
};

export const removeWorkspace = async (directoryPath: string): Promise<void> => {
  if (!isManagedWorkspace(directoryPath)) {
    throw new Error('Refusing to remove an unmanaged execution workspace.');
  }

  await rm(directoryPath, { force: true, recursive: true });
};

export const createWorkspace = async (
  code: string,
  identity: RunnerIdentity,
): Promise<ExecutionWorkspace> => {
  let directoryPath: string | undefined;

  try {
    directoryPath = await mkdtemp(join(tmpdir(), WORKSPACE_PREFIX));
    const sourcePath = join(directoryPath, 'main.py');

    await writeFile(sourcePath, code, {
      encoding: 'utf8',
      flag: 'wx',
      mode: 0o400,
    });

    if (typeof process.getuid === 'function' && process.getuid() === 0) {
      await chown(directoryPath, identity.uid, identity.gid);
      await chown(sourcePath, identity.uid, identity.gid);
    }

    return { directoryPath };
  } catch (error) {
    if (directoryPath) {
      await removeWorkspace(directoryPath).catch(() => undefined);
    }

    throw error;
  }
};

export const listManagedWorkspaces = async (): Promise<string[]> => {
  const entries = await readdir(tmpdir(), { withFileTypes: true });

  return entries
    .filter((entry) => entry.isDirectory() && entry.name.startsWith(WORKSPACE_PREFIX))
    .map((entry) => join(tmpdir(), entry.name));
};
