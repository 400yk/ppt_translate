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

    // Simulate translation progress
    const interval = setInterval(() => {
      setProgress(prevProgress => {
        const newProgress = prevProgress + 10;
        if (newProgress >= 100) {
          clearInterval(interval);
          // Simulate a translated file URL
          setTranslatedFileUrl('/translated-presentation.pptx');
          setIsTranslating(false);
          toast({
            title: 'Success',
            description: 'File translated successfully!',
          });
          return 100;
        }
        return newProgress;
      });
    }, 300);
  };

  const handleDownload = () => {
    if (translatedFileUrl) {
      // Simulate download by opening the URL in a new tab
      window.open(translatedFileUrl, '_blank');
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
