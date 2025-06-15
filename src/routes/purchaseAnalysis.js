// server/src/routes/purchaseAnalysis.js
import express from 'express';
import purchaseAnalysisService from '../services/purchaseAnalysisService.js';

const router = express.Router();

// Analyze brand for purchase suggestions
router.post('/analyze-brand', async (req, res) => {
  try {
    const { brandId, limit = 100 } = req.body;
    
    if (!brandId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing brandId' 
      });
    }

    // Check for recent analysis first (cache for 24 hours)
    const latestAnalysis = await purchaseAnalysisService.getLatestAnalysis(brandId);
    
    if (latestAnalysis && latestAnalysis.age < 86400000) { // 24 hours
      console.log('Using cached analysis');
      return res.json({
        success: true,
        data: latestAnalysis,
        cached: true
      });
    }

    // Run new analysis
    const result = await purchaseAnalysisService.analyzeBrand(brandId, limit);
    
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
    
    console.log(`Fetching latest analysis for brand: ${brandId}`);
    
    const analysis = await purchaseAnalysisService.getLatestAnalysis(brandId);
    
    if (!analysis) {
      return res.json({
        success: true,
        data: null,
        message: 'No analysis found - will need to generate new one'
      });
    }
    
    res.json({
      success: true,
      data: analysis
    });
    
  } catch (error) {
    console.error('Fetch error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Failed to fetch analysis'
    });
  }
});

export default router;