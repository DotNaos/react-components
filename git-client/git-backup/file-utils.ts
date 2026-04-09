import fs from "fs";
import path from "path";

export async function ensureGitignore(dir: string, content: string): Promise<void> {
  const gitignorePath = path.join(dir, ".gitignore");
  try {
    await fs.promises.access(gitignorePath);
    const existing = await fs.promises.readFile(gitignorePath, "utf-8");
    if (!existing.includes("!*.md") || !existing.includes("!*.ink")) {
      await fs.promises.writeFile(gitignorePath, content);
    }
  } catch {
    await fs.promises.writeFile(gitignorePath, content);
  }
}

export async function getAllFiles(dirPath: string, basePath = ""): Promise<string[]> {
  const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    if (entry.name === ".git") continue;

    const relativePath = basePath ? `${basePath}/${entry.name}` : entry.name;
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      const subFiles = await getAllFiles(fullPath, relativePath);
      files.push(...subFiles);
    } else {
      files.push(relativePath);
    }
  }

  return files;
}

export function isTrackedExtension(filepath: string, trackedExtensions: string[]): boolean {
  const ext = path.extname(filepath).toLowerCase();
  return trackedExtensions.includes(ext);
}
