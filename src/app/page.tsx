'use client';

import {useState} from 'react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Progress} from '@/components/ui/progress';
import {useToast} from '@/hooks/use-toast';
import {Icons} from '@/components/icons';

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [translatedFileUrl, setTranslatedFileUrl] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const {toast} = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleTranslate = async () => {
    if (!file) {
      toast({
        title: 'Error',
        description: 'Please upload a file first.',
        variant: 'destructive',
      });
      return;
    }

    setIsTranslating(true);
    setProgress(0);

    try {
      // Create a FormData object to send the file
      const formData = new FormData();
      formData.append('file', file);
      formData.append('src_lang', 'zh'); // Default source language, make dynamic if needed
      formData.append('dest_lang', 'en'); // Default target language, make dynamic if needed

      // Simulate progress bar up to 90%
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          const newProgress = prev + 5;
          if (newProgress >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return newProgress;
        });
      }, 300);

      // Send the file to the Flask backend
      const response = await fetch('http://localhost:5000/translate', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Translation failed');
      }

      // Get the translated PPTX as a blob
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      setTranslatedFileUrl(url);
      setProgress(100);
      toast({
        title: 'Success',
        description: 'File translated successfully!',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'An error occurred during translation.',
        variant: 'destructive',
      });
      console.error('Translation error:', error);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleDownload = () => {
    if (translatedFileUrl) {
      try {
        // For testing purposes, create a sample PPTX Blob
        // In a real implementation, you'd fetch the actual file from the translatedFileUrl
        
        // Create a fetch request to get the file
        fetch(translatedFileUrl)
          .then(response => {
            if (!response.ok) {
              throw new Error('Network response was not ok');
            }
            return response.blob();
          })
          .then(blob => {
            // Create a URL for the blob
            const url = window.URL.createObjectURL(blob);
            
            // Create a link element
            const a = document.createElement('a');
            a.href = url;
            a.download = 'translated-presentation.pptx';
            
            // Append to body, click, and remove
            document.body.appendChild(a);
            a.click();
            
            // Clean up
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
          })
          .catch(error => {
            console.error('Download error:', error);
            toast({
              title: 'Error',
              description: 'Failed to download the translated file.',
              variant: 'destructive',
            });
          });
      } catch (error) {
        console.error('Download error:', error);
        toast({
          title: 'Error',
          description: 'Failed to download the translated file.',
          variant: 'destructive',
        });
      }
    } else {
      toast({
        title: 'Error',
        description: 'File translation not complete.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2">
      <h1 className="text-3xl md:text-5xl font-bold text-center mb-8">
        LinguaSlides
      </h1>

      <div className="space-y-4 w-full max-w-md">
        <Input type="file" accept=".ppt,.pptx" onChange={handleFileChange} />

        {progress > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Translation Progress:</p>
            <Progress value={progress} />
          </div>
        )}

        <div className="flex justify-between">
          <Button
            onClick={handleTranslate}
            disabled={isTranslating}
            className="bg-accent text-accent-foreground hover:bg-accent/80"
          >
            {isTranslating ? (
              <>
                <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                Translating...
              </>
            ) : (
              'Translate'
            )}
          </Button>

          <Button
            onClick={handleDownload}
            disabled={!translatedFileUrl}
            className="bg-primary text-primary-foreground hover:bg-primary/80"
          >
            Download Translated File
          </Button>
        </div>
      </div>
    </div>
  );
}
