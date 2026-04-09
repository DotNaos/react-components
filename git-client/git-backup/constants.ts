export const DEFAULT_SNAPSHOT_BRANCH = "snapshots";
export const DEFAULT_MAIN_BRANCH = "main";
export const DEFAULT_LOCAL_BACKUP_REF = "refs/tags/local-backup-pointer";

export const DEFAULT_TRACKED_EXTENSIONS = [".md", ".ink", ".yaml", ".yml"];

export const DEFAULT_GITIGNORE_CONTENT = `# Ignore everything
*

# But not these files...
!.gitignore

# Track markdown, ink, yaml and yml files
!*.md
!*.ink
!*.yaml
!*.yml

# Track directories (needed to recurse into them)
!*/

# Explicitly ignore PDFs
*.pdf
`;
