import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import yauzl from 'yauzl';
import { promisify } from 'util';

// Supported file extensions for different programming languages
const SUPPORTED_LANGUAGES = {
  javascript: ['.js', '.jsx', '.mjs', '.cjs'],
  typescript: ['.ts', '.tsx'],
  python: ['.py', '.pyw', '.pyi'],
  java: ['.java'],
  csharp: ['.cs'],
  php: ['.php', '.phtml', '.php3', '.php4', '.php5', '.phps'],
  ruby: ['.rb', '.rbw'],
  go: ['.go'],
  rust: ['.rs'],
  cpp: ['.cpp', '.cc', '.cxx', '.c++', '.c'],
  html: ['.html', '.htm'],
  css: ['.css', '.scss', '.sass', '.less'],
  sql: ['.sql'],
  json: ['.json'],
  xml: ['.xml'],
  yaml: ['.yml', '.yaml'],
  markdown: ['.md', '.markdown'],
  shell: ['.sh', '.bash', '.zsh', '.fish'],
  dockerfile: ['dockerfile', '.dockerfile'],
  config: ['.env', '.config', '.conf', '.ini', '.toml']
};

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB
const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
const TEMP_DIR = path.join(UPLOAD_DIR, 'temp');
const EXTRACTED_DIR = path.join(UPLOAD_DIR, 'extracted');

// Ensure upload directories exist
export const initializeUploadDirectories = async (): Promise<void> => {
  try {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    await fs.mkdir(TEMP_DIR, { recursive: true });
    await fs.mkdir(EXTRACTED_DIR, { recursive: true });
  } catch (error: any) {
    console.error('Error creating upload directories:', error);
    throw error;
  }
};

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, TEMP_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  }
});

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Only allow ZIP files
  if (file.mimetype === 'application/zip' || 
      file.mimetype === 'application/x-zip-compressed' ||
      path.extname(file.originalname).toLowerCase() === '.zip') {
    cb(null, true);
  } else {
    cb(new Error('Only ZIP files are allowed'));
  }
};

export const upload = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1
  },
  fileFilter
});

// Interface for file metadata
export interface FileMetadata {
  path: string;
  name: string;
  extension: string;
  language: string;
  size: number;
  lines?: number;
  isDirectory: boolean;
}

// Interface for extraction result
export interface ExtractionResult {
  success: boolean;
  projectPath: string;
  files: FileMetadata[];
  statistics: {
    totalFiles: number;
    totalSize: number;
    languages: Record<string, number>;
    fileTypes: Record<string, number>;
  };
  error?: string;
}

// Detect programming language from file extension
export const detectLanguage = (filePath: string): string => {
  const ext = path.extname(filePath).toLowerCase();
  const fileName = path.basename(filePath).toLowerCase();
  
  // Special cases for files without extensions
  if (fileName === 'dockerfile' || fileName.includes('dockerfile')) {
    return 'dockerfile';
  }
  
  if (fileName === 'makefile' || fileName === 'rakefile') {
    return 'makefile';
  }
  
  // Check against supported languages
  for (const [language, extensions] of Object.entries(SUPPORTED_LANGUAGES)) {
    if (extensions.includes(ext) || extensions.includes(fileName)) {
      return language;
    }
  }
  
  return 'unknown';
};

// Count lines in a text file
const countLines = async (filePath: string): Promise<number> => {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return content.split('\n').length;
  } catch {
    return 0;
  }
};

// Extract ZIP file and analyze contents
export const extractAndAnalyzeZip = async (
  zipFilePath: string,
  projectId: string
): Promise<ExtractionResult> => {
  const projectPath = path.join(EXTRACTED_DIR, projectId);
  
  try {
    // Ensure project directory exists
    await fs.mkdir(projectPath, { recursive: true });
    
    // Extract ZIP file
    await extractZipFile(zipFilePath, projectPath);
    
    // Analyze extracted files
    const files = await analyzeDirectory(projectPath);
    
    // Calculate statistics
    const statistics = calculateStatistics(files);
    
    // Clean up temporary ZIP file
    await fs.unlink(zipFilePath);
    
    return {
      success: true,
      projectPath,
      files,
      statistics
    };
  } catch (error: any) {
    console.error('Error extracting and analyzing ZIP:', error);
    
    // Clean up on error
    try {
      await fs.unlink(zipFilePath);
      await fs.rmdir(projectPath, { recursive: true });
    } catch (cleanupError) {
      console.error('Error during cleanup:', cleanupError);
    }
    
    return {
      success: false,
      projectPath: '',
      files: [],
      statistics: {
        totalFiles: 0,
        totalSize: 0,
        languages: {},
        fileTypes: {}
      },
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

// Extract ZIP file using yauzl
const extractZipFile = async (zipPath: string, extractPath: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    yauzl.open(zipPath, { lazyEntries: true }, (err, zipfile) => {
      if (err) {
        reject(err);
        return;
      }
      
      if (!zipfile) {
        reject(new Error('Failed to open ZIP file'));
        return;
      }
      
      zipfile.readEntry();
      
      zipfile.on('entry', async (entry) => {
        const entryPath = path.join(extractPath, entry.fileName);
        
        // Skip entries that go outside the extraction directory (security)
        if (!entryPath.startsWith(extractPath)) {
          zipfile.readEntry();
          return;
        }
        
        if (/\/$/.test(entry.fileName)) {
          // Directory entry
          try {
            await fs.mkdir(entryPath, { recursive: true });
            zipfile.readEntry();
          } catch (error: any) {
            reject(error);
          }
        } else {
          // File entry
          zipfile.openReadStream(entry, async (err, readStream) => {
            if (err) {
              reject(err);
              return;
            }
            
            if (!readStream) {
              reject(new Error('Failed to create read stream'));
              return;
            }
            
            try {
              // Ensure directory exists
              await fs.mkdir(path.dirname(entryPath), { recursive: true });
              
              // Create write stream and pipe
              const writeStream = require('fs').createWriteStream(entryPath);
              readStream.pipe(writeStream);
              
              writeStream.on('close', () => {
                zipfile.readEntry();
              });
              
              writeStream.on('error', (error: any) => {
                reject(error);
              });
            } catch (error: any) {
              reject(error);
            }
          });
        }
      });
      
      zipfile.on('end', () => {
        resolve();
      });
      
      zipfile.on('error', (error: any) => {
        reject(error);
      });
    });
  });
};

// Recursively analyze directory and collect file metadata
const analyzeDirectory = async (dirPath: string, relativePath = ''): Promise<FileMetadata[]> => {
  const files: FileMetadata[] = [];
  
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      const relativeFilePath = path.join(relativePath, entry.name);
      
      // Skip hidden files and common ignore patterns
      if (shouldIgnoreFile(entry.name)) {
        continue;
      }
      
      if (entry.isDirectory()) {
        // Add directory entry
        files.push({
          path: relativeFilePath,
          name: entry.name,
          extension: '',
          language: 'directory',
          size: 0,
          isDirectory: true
        });
        
        // Recursively analyze subdirectory
        const subFiles = await analyzeDirectory(fullPath, relativeFilePath);
        files.push(...subFiles);
      } else if (entry.isFile()) {
        const stats = await fs.stat(fullPath);
        const extension = path.extname(entry.name);
        const language = detectLanguage(entry.name);
        
        // Only count lines for text files
        let lines: number | undefined;
        if (isTextFile(language)) {
          lines = await countLines(fullPath);
        }
        
        files.push({
          path: relativeFilePath,
          name: entry.name,
          extension,
          language,
          size: stats.size,
          lines,
          isDirectory: false
        });
      }
    }
  } catch (error: any) {
    console.error(`Error analyzing directory ${dirPath}:`, error);
  }
  
  return files;
};

// Check if file should be ignored
const shouldIgnoreFile = (fileName: string): boolean => {
  const ignorePatterns = [
    // Hidden files
    /^\./,
    // Node modules
    /^node_modules$/,
    // Build directories
    /^(dist|build|out|target)$/,
    // Version control
    /^\.git$/,
    // IDE files
    /^\.(vscode|idea|eclipse)$/,
    // OS files
    /^(Thumbs\.db|\.DS_Store)$/,
    // Log files
    /\.log$/,
    // Temporary files
    /\.(tmp|temp|cache)$/
  ];
  
  return ignorePatterns.some(pattern => pattern.test(fileName));
};

// Check if file is a text file that can be analyzed
const isTextFile = (language: string): boolean => {
  return language !== 'unknown' && language !== 'directory';
};

// Calculate project statistics
const calculateStatistics = (files: FileMetadata[]) => {
  const stats = {
    totalFiles: 0,
    totalSize: 0,
    languages: {} as Record<string, number>,
    fileTypes: {} as Record<string, number>
  };
  
  for (const file of files) {
    if (!file.isDirectory) {
      stats.totalFiles++;
      stats.totalSize += file.size;
      
      // Count by language
      if (stats.languages[file.language]) {
        stats.languages[file.language]++;
      } else {
        stats.languages[file.language] = 1;
      }
      
      // Count by file type
      const ext = file.extension || 'no-extension';
      if (stats.fileTypes[ext]) {
        stats.fileTypes[ext]++;
      } else {
        stats.fileTypes[ext] = 1;
      }
    }
  }
  
  return stats;
};

// Clean up project files
export const cleanupProjectFiles = async (projectId: string): Promise<void> => {
  const projectPath = path.join(EXTRACTED_DIR, projectId);
  
  try {
    await fs.rmdir(projectPath, { recursive: true });
  } catch (error: any) {
    console.error(`Error cleaning up project files for ${projectId}:`, error);
  }
};
