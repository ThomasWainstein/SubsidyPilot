
import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Bot } from 'lucide-react';

const AgriBot = () => {
  const { t } = useLanguage();
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [response, setResponse] = useState('');
  const [aiUpdates, setAiUpdates] = useState<string[]>([
    t('farm.aiUpdateInitial')
  ]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    // Simulate typing response
    setIsTyping(true);
    
    // Clear the input field
    const userInput = input;
    setInput('');
    
    // Simulate AI typing delay
    setTimeout(() => {
      setResponse(t('farm.assistantResponse'));
      setIsTyping(false);
      
      // Add to AI updates after a delay
      setTimeout(() => {
        setAiUpdates(prev => [
          `${userInput} - ${t('farm.aiUpdateResponse')}`,
          ...prev
        ]);
        setResponse('');
      }, 3000);
    }, 1500);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('farm.assistantTitle')}</CardTitle>
          <CardDescription>{t('farm.assistantDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex space-x-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t('farm.assistantPlaceholder')}
              className="flex-1"
            />
            <Button type="submit" disabled={isTyping || !input.trim()}>
              <Send size={16} />
              <span className="sr-only">{t('common.send')}</span>
            </Button>
          </form>
          
          {isTyping && (
            <div className="mt-4 flex items-start space-x-3">
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                <Bot size={16} className="text-green-600" />
              </div>
              <div className="bg-gray-100 p-3 rounded-lg max-w-[90%]">
                <div className="typing-animation flex space-x-1">
                  <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce delay-75"></div>
                  <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce delay-150"></div>
                </div>
              </div>
            </div>
          )}
          
          {response && (
            <div className="mt-4 flex items-start space-x-3">
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                <Bot size={16} className="text-green-600" />
              </div>
              <div className="bg-gray-100 p-3 rounded-lg max-w-[90%]">
                {response}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {aiUpdates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('farm.aiUpdates')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {aiUpdates.map((update, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center mt-1">
                    <Bot size={12} className="text-gray-600" />
                  </div>
                  <p className="text-sm text-gray-700">{update}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AgriBot;
