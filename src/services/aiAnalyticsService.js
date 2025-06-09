import { GoogleGenerativeAI } from '@google/generative-ai';

// This will automatically use the GOOGLE_API_KEY from your .env file
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

/**
 * Takes dashboard data and generates AI-powered insights.
 * @param {object} dashboardData The statistical data for the dashboard.
 * @returns {Promise<object>} An object containing AI-generated text insights.
 */
export async function generateAIInsights(dashboardData) {
  // Create a clear, detailed prompt for the AI.
  // This is the most important part - we format the raw data into a question.
  const prompt = `
    You are a helpful business analyst for a company named Splitfin.
    Analyze the following dashboard data for a ${dashboardData.role} and provide a brief, insightful summary.

    Data Period: ${dashboardData.dateRange}

    **Key Metrics:**
    - Revenue: ${JSON.stringify(dashboardData.revenue, null, 2)}
    - Order Summary: ${JSON.stringify(dashboardData.orders?.salesOrders?.summary, null, 2)}
    - Top Performing Agents: ${JSON.stringify(dashboardData.performance?.topAgents?.slice(0, 3), null, 2)}
    - Outstanding Invoices Summary: ${JSON.stringify(dashboardData.invoices?.summary, null, 2)}

    **Your Task:**
    Based ONLY on the data provided, generate a JSON object with three keys: "summary", "keyDrivers", and "recommendations".
    - "summary": A 1-2 sentence overview of the overall business performance.
    - "keyDrivers": 1-2 bullet points identifying the main factors contributing to the results (e.g., top agent, high revenue).
    - "recommendations": 2-3 actionable, numbered recommendations for the user to consider.

    Keep the tone professional and concise. Structure your entire response as a single, clean JSON object.
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Clean up the response and parse it as JSON
    const jsonResponse = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(jsonResponse);

  } catch (error) {
    console.error("❌ Error calling AI analytics service:", error);
    // Return a default object on error so the frontend doesn't crash
    return {
      summary: "AI analysis could not be completed at this time.",
      keyDrivers: [],
      recommendations: []
    };
  }
}