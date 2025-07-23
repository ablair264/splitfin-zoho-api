// server/src/routes/imagekit.js
import express from 'express';
import { createRequire } from 'module';
import multer from 'multer';

// Import ImageKit using CommonJS syntax for ES6 modules
const require = createRequire(import.meta.url);
const ImageKit = require('imagekit');

const router = express.Router();

// Initialize ImageKit with environment variables from Render
const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT
});

// Multer for handling file uploads in memory
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// GET /api/imagekit/auth - Authentication parameters for frontend uploads
router.get('/auth', (req, res) => {
  try {
    const authenticationParameters = imagekit.getAuthenticationParameters();
    res.json(authenticationParameters);
  } catch (error) {
    console.error('ImageKit auth error:', error);
    res.status(500).json({ error: 'Failed to generate authentication parameters' });
  }
});

// POST /api/imagekit/upload - Handle file upload to ImageKit
router.post('/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const { brand, folder = 'brand-images' } = req.body;

    if (!brand) {
      return res.status(400).json({ error: 'Brand is required' });
    }

    // Upload to ImageKit
    const uploadResponse = await imagekit.upload({
      file: req.file.buffer,
      fileName: req.file.originalname,
      folder: `${folder}/${brand}`,
      useUniqueFileName: true,
      tags: [brand, 'product-image']
    });

    // Return the response with optimized URLs
    res.json({
      fileId: uploadResponse.fileId,
      name: uploadResponse.name,
      url: uploadResponse.url,
      thumbnailUrl: uploadResponse.thumbnailUrl,
      size: uploadResponse.size,
      filePath: uploadResponse.filePath,
      tags: uploadResponse.tags,
      isPrivateFile: uploadResponse.isPrivateFile,
      customCoordinates: uploadResponse.customCoordinates,
      // Add optimized versions
      optimizedUrls: {
        thumbnail: `${uploadResponse.url}?tr=w-200,h-200,c-maintain_ratio,q-80,f-auto`,
        medium: `${uploadResponse.url}?tr=w-400,h-400,c-maintain_ratio,q-85,f-auto`,
        large: `${uploadResponse.url}?tr=w-800,h-800,c-maintain_ratio,q-90,f-auto`,
        preview: `${uploadResponse.url}?tr=w-100,h-100,c-maintain_ratio,q-60,f-auto,bl-10`
      }
    });

  } catch (error) {
    console.error('ImageKit upload error:', error);
    res.status(500).json({ 
      error: 'Upload failed', 
      details: error.message 
    });
  }
});

// POST /api/imagekit/upload-multiple - Handle multiple file uploads
router.post('/upload-multiple', upload.array('images', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files provided' });
    }

    const { brand, folder = 'brand-images' } = req.body;

    if (!brand) {
      return res.status(400).json({ error: 'Brand is required' });
    }

    // Upload all files to ImageKit
    const uploadPromises = req.files.map(file => 
      imagekit.upload({
        file: file.buffer,
        fileName: file.originalname,
        folder: `${folder}/${brand}`,
        useUniqueFileName: true,
        tags: [brand, 'product-image']
      })
    );

    const uploadResponses = await Promise.allSettled(uploadPromises);

    const results = uploadResponses.map((result, index) => {
      if (result.status === 'fulfilled') {
        const response = result.value;
        return {
          success: true,
          fileId: response.fileId,
          name: response.name,
          url: response.url,
          size: response.size,
          optimizedUrls: {
            thumbnail: `${response.url}?tr=w-200,h-200,c-maintain_ratio,q-80,f-auto`,
            medium: `${response.url}?tr=w-400,h-400,c-maintain_ratio,q-85,f-auto`,
            large: `${response.url}?tr=w-800,h-800,c-maintain_ratio,q-90,f-auto`,
            preview: `${response.url}?tr=w-100,h-100,c-maintain_ratio,q-60,f-auto,bl-10`
          }
        };
      } else {
        return {
          success: false,
          fileName: req.files[index].originalname,
          error: result.reason.message
        };
      }
    });

    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    res.json({
      totalUploaded: successful.length,
      totalFailed: failed.length,
      successful,
      failed
    });

  } catch (error) {
    console.error('Multiple upload error:', error);
    res.status(500).json({ 
      error: 'Batch upload failed', 
      details: error.message 
    });
  }
});

// GET /api/imagekit/images - List all images (with pagination)
router.get('/images', async (req, res) => {
  try {
    const { 
      skip = 0, 
      limit = 20, 
      searchQuery = '', 
      tags = '',
      folder = 'brand-images'
    } = req.query;

    console.log('ImageKit API call parameters:', {
      skip,
      limit,
      searchQuery,
      tags,
      folder
    });

    const listOptions = {
      skip: parseInt(skip),
      limit: parseInt(limit)
    };

    // Add path if folder is specified
    if (folder && folder.trim() !== '') {
      listOptions.path = folder;
      console.log('Using folder path:', folder);
    }

    if (searchQuery) {
      listOptions.searchQuery = `name:${searchQuery}`;
    }

    if (tags) {
      listOptions.tags = tags.split(',');
    }

    console.log('Final ImageKit listOptions:', listOptions);

    const imageList = await imagekit.listFiles(listOptions);
    
    console.log(`ImageKit returned ${imageList.length} images`);
    
    // Log the structure of the first image for debugging
    if (imageList.length > 0) {
      console.log('First image structure:', JSON.stringify(imageList[0], null, 2));
      console.log('Sample images:', imageList.slice(0, 3).map(img => ({
        name: img.name,
        fileId: img.fileId,
        filePath: img.filePath,
        url: img.url,
        size: img.size,
        createdAt: img.createdAt,
        tags: img.tags,
        type: img.type || img.fileType
      })));
    }

    // Add optimized URLs to each image
    const imagesWithOptimizedUrls = imageList.map(image => ({
      ...image,
      optimizedUrls: {
        thumbnail: `${image.url}?tr=w-200,h-200,c-maintain_ratio,q-80,f-auto`,
        medium: `${image.url}?tr=w-400,h-400,c-maintain_ratio,q-85,f-auto`,
        large: `${image.url}?tr=w-800,h-800,c-maintain_ratio,q-90,f-auto`,
        preview: `${image.url}?tr=w-100,h-100,c-maintain_ratio,q-60,f-auto,bl-10`
      }
    }));

    const response = {
      images: imagesWithOptimizedUrls,
      hasMore: imageList.length === parseInt(limit),
      total: imageList.length,
      requestParams: { skip, limit, folder, searchQuery, tags }
    };

    console.log('API Response summary:', {
      totalImages: response.images.length,
      hasMore: response.hasMore,
      sampleImageFields: imageList.length > 0 ? Object.keys(imageList[0]) : []
    });

    res.json(response);

  } catch (error) {
    console.error('ImageKit list error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      response: error.response?.data
    });
    
    res.status(500).json({ 
      error: 'Failed to fetch images', 
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// DELETE /api/imagekit/images/:fileId - Delete a single image
router.delete('/images/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;

    if (!fileId) {
      return res.status(400).json({ error: 'File ID is required' });
    }

    await imagekit.deleteFile(fileId);
    
    res.json({ 
      success: true, 
      message: 'Image deleted successfully' 
    });

  } catch (error) {
    console.error('ImageKit delete error:', error);
    res.status(500).json({ 
      error: 'Failed to delete image', 
      details: error.message 
    });
  }
});

// DELETE /api/imagekit/images/bulk - Delete multiple images
router.delete('/images/bulk', async (req, res) => {
  try {
    const { fileIds } = req.body;

    if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
      return res.status(400).json({ error: 'File IDs array is required' });
    }

    // Delete in batches to avoid overwhelming the API
    const batchSize = 5;
    const results = [];

    for (let i = 0; i < fileIds.length; i += batchSize) {
      const batch = fileIds.slice(i, i + batchSize);
      const batchPromises = batch.map(async (fileId) => {
        try {
          await imagekit.deleteFile(fileId);
          return { fileId, success: true };
        } catch (error) {
          return { fileId, success: false, error: error.message };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Small delay between batches
      if (i + batchSize < fileIds.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    res.json({
      totalDeleted: successful.length,
      totalFailed: failed.length,
      successful: successful.map(r => r.fileId),
      failed: failed.map(r => ({ fileId: r.fileId, error: r.error }))
    });

  } catch (error) {
    console.error('Bulk delete error:', error);
    res.status(500).json({ 
      error: 'Bulk delete failed', 
      details: error.message 
    });
  }
});

// GET /api/imagekit/config - Get public configuration for frontend
router.get('/config', (req, res) => {
  res.json({
    publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
    urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT
  });
});

// Test endpoint
router.get('/test', (req, res) => {
  res.json({
    message: 'ImageKit routes are working!',
    timestamp: new Date().toISOString(),
    config: {
      hasPublicKey: !!process.env.IMAGEKIT_PUBLIC_KEY,
      hasPrivateKey: !!process.env.IMAGEKIT_PRIVATE_KEY,
      hasUrlEndpoint: !!process.env.IMAGEKIT_URL_ENDPOINT
    }
  });
});

export default router;