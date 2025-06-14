// server/src/routes/purchaseAnalysis.js
import express from 'express';
import purchaseAnalysisService from '../services/purchaseAnalysisService.js';

const router = express.Router();

// Analyze brand for purchase suggestions
router.post('/analyze-brand', async (req, res) => {
  try {
    const { brandId, userId, limit = 100 } = req.body;
    
    if (!brandId || !userId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing brandId or userId' 
      });
    }

    // Check for recent analysis first (cache for 24 hours)
    const latestAnalysis = await purchaseAnalysisService.getLatestAnalysis(brandId, userId);
    
    if (latestAnalysis && latestAnalysis.age < 86400000) { // 24 hours
      console.log('Using cached analysis');
      return res.json({
        success: true,
        data: latestAnalysis,
        cached: true
      });
    }

    // Run new analysis
    const result = await purchaseAnalysisService.analyzeBrand(brandId, userId, limit);
    
    res.json({
      success: true,
      data: result,
      cached: false
    });

  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Analysis failed' 
    });
  }
});

// Get latest analysis without regenerating
router.get('/:brandId/latest', async (req, res) => {
  try {
    const { brandId } = req.params;
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing userId' 
      });
    }

    const analysis = await purchaseAnalysisService.getLatestAnalysis(brandId, userId);
    
    res.json({
      success: true,
      data: analysis
    });

  } catch (error) {
    console.error('Fetch error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

export default router;