
import { useState, useRef, useEffect } from 'react';
import { useLanguage } from '@/contexts/language';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Send, User, Bot } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { subsidies, Subsidy } from '@/data/subsidies';

interface SimulationChatProps {
  onShowResults: (subsidies: Subsidy[]) => void;
}

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

const SimulationChat = ({ onShowResults }: SimulationChatProps) => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: t('simulation.chat.hint'),
      sender: 'bot',
      timestamp: new Date(),
    },
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = () => {
    if (!message.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: message,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setMessage('');
    setIsTyping(true);

    // Simulate bot typing
    setTimeout(() => {
      const botResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: "Based on your description, I'm analyzing potential matching subsidies. Let me search for relevant programs...",
        sender: 'bot',
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, botResponse]);
      
      // Simulate processing time
      setTimeout(() => {
        // Randomly select 2-3 subsidies
        const shuffled = [...subsidies].sort(() => 0.5 - Math.random());
        const matchingSubsidies = shuffled.slice(0, Math.floor(Math.random() * 2) + 2); // 2 to 3 subsidies
        
        // Convert subsidies to text result
        const subsidyText = matchingSubsidies.map(subsidy => 
          `- **${subsidy.name}**: ${subsidy.description.substring(0, 100)}...`
        ).join('\n\n');
        
        const finalResponse: Message = {
          id: (Date.now() + 2).toString(),
          text: `I've found several potential subsidies that may match your project:\n\n${subsidyText}\n\nWould you like to see the full details of these matches?`,
          sender: 'bot',
          timestamp: new Date(),
        };
        
        setMessages(prev => [...prev, finalResponse]);
        setIsTyping(false);
        
        toast({
          title: t('messages.chatAnalysisComplete'),
          description: t('messages.chatAnalysisCompleteDesc'),
        });
        
        // Adjust match confidence
        const adjustedSubsidies = matchingSubsidies.map(subsidy => {
          const confidence = Math.floor(Math.random() * 30) + 70; // 70-99
          return {
            ...subsidy,
            matchConfidence: confidence
          };
        });
        
        // Delay showing results to give time to read the bot's message
        setTimeout(() => {
          onShowResults(adjustedSubsidies);
        }, 3000);
        
      }, 3000);
    }, 1000);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-[400px]">
      <div className="flex-1 overflow-y-auto mb-4 border rounded-md p-4">
        <div className="space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`flex max-w-[80%] ${
                  msg.sender === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                } rounded-lg px-4 py-2`}
              >
                <div className="mr-2 mt-0.5">
                  {msg.sender === 'user' ? (
                    <User size={16} />
                  ) : (
                    <Bot size={16} />
                  )}
                </div>
                <div>
                  <div className="whitespace-pre-line text-sm">{msg.text}</div>
                  <div className="text-xs mt-1 opacity-70">
                    {msg.timestamp.toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-lg px-4 py-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>
      
      <div className="relative">
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t('simulation.chat.placeholder')}
          disabled={isTyping}
          className="pr-12 resize-none"
          rows={3}
        />
        <Button
          size="sm"
          onClick={handleSendMessage}
          disabled={!message.trim() || isTyping}
          className="absolute right-2 bottom-2"
        >
          <Send size={16} />
          <span className="sr-only">{t('simulation.chat.send')}</span>
        </Button>
      </div>
    </div>
  );
};

export default SimulationChat;
