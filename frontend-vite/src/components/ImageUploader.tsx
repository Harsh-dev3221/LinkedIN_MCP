import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Box, Typography, TextField, Paper, Button, CircularProgress } from '@mui/material';
import { styled } from '@mui/material/styles';

const DropzoneBox = styled(Paper)(({ theme }) => ({
    padding: theme.spacing(3),
    textAlign: 'center',
    cursor: 'pointer',
    border: '2px dashed #ccc',
    borderRadius: theme.shape.borderRadius,
    backgroundColor: theme.palette.background.default,
    transition: 'border .3s ease-in-out',
    '&:hover': {
        borderColor: theme.palette.primary.main,
    },
}));

const ImagePreview = styled('img')({
    maxWidth: '100%',
    maxHeight: '300px',
    marginTop: '16px',
    borderRadius: '4px',
});

interface ImageUploaderProps {
    onImageAnalyze: (imageData: { base64: string, prompt: string, mimeType: string }) => void;
    isProcessing: boolean;
}

const ImageUploader = ({ onImageAnalyze, isProcessing }: ImageUploaderProps) => {
    const [image, setImage] = useState<File | null>(null);
    const [preview, setPreview] = useState<string | null>(null);
    const [prompt, setPrompt] = useState('');

    const onDrop = useCallback((acceptedFiles: File[]) => {
        const file = acceptedFiles[0];
        if (file) {
            setImage(file);

            // Create preview
            const reader = new FileReader();
            reader.onload = () => {
                setPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'image/*': ['.jpeg', '.jpg', '.png', '.gif']
        },
        maxFiles: 1,
        multiple: false
    });

    const handleAnalyze = () => {
        if (image && preview) {
            // Extract base64 data without the data:image/xxx;base64, prefix
            const base64Data = preview.split(',')[1];
            const mimeType = image.type;

            onImageAnalyze({
                base64: base64Data,
                prompt,
                mimeType
            });
        }
    };

    return (
        <Box sx={{ mt: 3 }}>
            <Typography variant="h6" gutterBottom>
                Upload an Image
            </Typography>

            <DropzoneBox {...getRootProps()} sx={{ mb: 2 }}>
                <input {...getInputProps()} />
                {isDragActive ? (
                    <Typography>Drop the image here...</Typography>
                ) : (
                    <Typography>
                        Drag and drop an image here, or click to select
                    </Typography>
                )}
            </DropzoneBox>

            {preview && (
                <Box sx={{ my: 2, textAlign: 'center' }}>
                    <ImagePreview src={preview} alt="Preview" />
                    <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                        {image?.name} ({Math.round((image?.size ?? 0) / 1024)} KB)
                    </Typography>
                </Box>
            )}

            <TextField
                fullWidth
                multiline
                rows={3}
                label="Instructions for post generation"
                placeholder="E.g., 'Create a professional LinkedIn post highlighting the key elements in this image, focus on technology trends'"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                sx={{ mb: 2 }}
                disabled={isProcessing}
            />

            <Button
                variant="contained"
                color="primary"
                fullWidth
                disabled={!image || !prompt || isProcessing}
                onClick={handleAnalyze}
                startIcon={isProcessing ? <CircularProgress size={24} color="inherit" /> : null}
            >
                {isProcessing ? 'Analyzing...' : 'Analyze Image & Generate Post'}
            </Button>
        </Box>
    );
};

export default ImageUploader; 