import fs from 'fs';
import path from 'path';
import https from 'https';

const modelUrls = {
  'tiny_face_detector_model-weights_manifest.json': 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/tiny_face_detector_model-weights_manifest.json',
  'tiny_face_detector_model-shard1': 'https://github.com/justadudewhohacks/face-api.js/raw/master/weights/tiny_face_detector_model-shard1',
  'face_landmark_68_model-weights_manifest.json': 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_landmark_68_model-weights_manifest.json',
  'face_landmark_68_model-shard1': 'https://github.com/justadudewhohacks/face-api.js/raw/master/weights/face_landmark_68_model-shard1',
  'face_expression_model-weights_manifest.json': 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_expression_model-weights_manifest.json',
  'face_expression_model-shard1': 'https://github.com/justadudewhohacks/face-api.js/raw/master/weights/face_expression_model-shard1'
};

const modelsDir = path.join(process.cwd(), 'public', 'models');

// Create models directory if it doesn't exist
if (!fs.existsSync(modelsDir)) {
  fs.mkdirSync(modelsDir, { recursive: true });
}

// Download each model file
Object.entries(modelUrls).forEach(([filename, url]) => {
  const filePath = path.join(modelsDir, filename);
  
  if (fs.existsSync(filePath)) {
    console.log(`${filename} already exists, skipping...`);
    return;
  }
  
  console.log(`Downloading ${filename}...`);
  
  const file = fs.createWriteStream(filePath);
  https.get(url, (response) => {
    response.pipe(file);
    file.on('finish', () => {
      file.close();
      console.log(`✓ Downloaded ${filename}`);
    });
  }).on('error', (err) => {
    fs.unlink(filePath, () => {}); // Delete the file on error
    console.error(`Error downloading ${filename}:`, err.message);
  });
});