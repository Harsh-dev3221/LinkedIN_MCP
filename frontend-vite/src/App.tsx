import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Container, Paper, Typography, Stepper, Step, StepLabel, Box, ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import axios from 'axios';

import LinkedInAuth from './components/LinkedInAuth';
import ImageUploader from './components/ImageUploader';
import PostEditor from './components/PostEditor';

// Create a theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#0077B5', // LinkedIn blue
    },
    secondary: {
      main: '#00a0dc',
    },
  },
});

// Create MCP client for Gemini API communication
const createMcpClient = (token: string) => {
  return {
    callTool: async (toolName: string, params: any) => {
      const response = await axios.post(`${import.meta.env.VITE_MCP_SERVER_URL}/mcp`, {
        type: "call-tool",
        tool: toolName,
        params
      }, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.data.isError) {
        throw new Error(response.data.content[0].text);
      }

      return response.data;
    }
  };
};

function App() {
  const [activeStep, setActiveStep] = useState(0);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [generatedContent, setGeneratedContent] = useState('');

  // Steps in the process
  const steps = ['Connect LinkedIn', 'Upload Image', 'Edit & Publish'];

  // Handle LinkedIn authentication
  const handleAuthSuccess = (token: string) => {
    setAuthToken(token);
    setActiveStep(1);
  };

  // Handle image analysis and content generation
  const handleImageAnalyze = async (imageData: { base64: string, prompt: string, mimeType: string }) => {
    if (!authToken) return;

    setIsProcessing(true);
    try {
      const mcpClient = createMcpClient(authToken);

      const result = await mcpClient.callTool('analyze-image-create-post', {
        imageBase64: imageData.base64,
        prompt: imageData.prompt,
        mimeType: imageData.mimeType
      });

      setGeneratedContent(result.content[0].text);
      setActiveStep(2);
    } catch (error) {
      console.error('Error analyzing image:', error);
      alert('Error analyzing image: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle publish to LinkedIn
  const handlePublish = async (content: string) => {
    if (!authToken) return;

    const mcpClient = createMcpClient(authToken);
    await mcpClient.callTool('create-post', { content });
  };

  // Reset the flow
  const handleReset = () => {
    setGeneratedContent('');
    setActiveStep(1);
  };

  // Render the current step content
  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return <LinkedInAuth onAuthSuccess={handleAuthSuccess} />;
      case 1:
        return <ImageUploader onImageAnalyze={handleImageAnalyze} isProcessing={isProcessing} />;
      case 2:
        return <PostEditor
          generatedContent={generatedContent}
          onPublish={handlePublish}
          onReset={handleReset}
        />;
      default:
        return <Navigate to="/" />;
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="md" sx={{ mt: 5, mb: 5 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Typography variant="h4" component="h1" align="center" gutterBottom>
            LinkedIn Post Creator
          </Typography>
          <Typography variant="subtitle1" align="center" color="text.secondary" paragraph>
            Create professional LinkedIn posts with Gemini AI image analysis
          </Typography>

          <Stepper activeStep={activeStep} sx={{ pt: 3, pb: 5 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          <Box sx={{ mt: 2 }}>
            {renderStepContent()}
          </Box>
        </Paper>
      </Container>
    </ThemeProvider>
  );
}

const AppWrapper = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/callback" element={<App />} />
      </Routes>
    </Router>
  );
};

export default AppWrapper;
