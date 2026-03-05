import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { Send, Bot, User, ExternalLink } from 'lucide-react';
import { sendMessage, AIBuilderResponse } from './aiService';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  type?: 'conversation' | 'planning' | 'build';
  issue_url?: string;
}

export function AIChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async () => {
    const text = input.trim();
    if (!text || isLoading) return;
    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setInput('');
    setIsLoading(true);
    try {
      const res: AIBuilderResponse = await sendMessage(text);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: res.message,
        type: res.type,
        issue_url: res.issue_url,
      }]);
    } catch (err) {
      toast({
        title: 'Erro',
        description: err instanceof Error ? err.message : 'Erro ao enviar mensagem',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
  };

  return (
    <div className='flex flex-col h-[calc(100vh-220px)] max-w-3xl mx-auto'>
      <div className='flex-1 overflow-y-auto space-y-4 mb-4 pr-2'>
        {messages.length === 0 && (
          <div className='text-center text-muted-foreground py-16'>
            <Bot className='h-12 w-12 mx-auto mb-3 opacity-30' />
            <p className='text-sm'>Descreva uma melhoria, peça um plano ou diga para construir algo.</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex gap-2 max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                {msg.role === 'user' ? <User className='h-4 w-4' /> : <Bot className='h-4 w-4' />}
              </div>
              <div>
                <div className={`rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap ${msg.role === 'user' ? 'bg-primary text-primary-foreground rounded-tr-sm' : 'bg-muted rounded-tl-sm'}`}>
                  {msg.content}
                </div>
                {msg.issue_url && (
                  <a
                    href={msg.issue_url}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='mt-1 flex items-center gap-1 text-xs text-primary hover:underline'
                  >
                    <ExternalLink className='h-3 w-3' />
                    Ver issue criada no GitHub
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className='flex justify-start'>
            <div className='flex gap-2'>
              <div className='h-8 w-8 rounded-full bg-muted flex items-center justify-center'>
                <Bot className='h-4 w-4' />
              </div>
              <div className='bg-muted rounded-2xl rounded-tl-sm px-4 py-3'>
                <span className='text-sm text-muted-foreground animate-pulse'>Pensando...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div className='border rounded-2xl p-3 flex gap-2 items-end bg-background shadow-sm'>
        <Textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder='Descreva uma melhoria, peça um plano ou diga para construir algo...'
          className='flex-1 resize-none border-0 focus-visible:ring-0 min-h-[60px] max-h-[200px] p-0'
          maxLength={2000}
        />
        <Button
          onClick={handleSubmit}
          disabled={!input.trim() || isLoading}
          size='icon'
          className='rounded-xl flex-shrink-0'
        >
          <Send className='h-4 w-4' />
        </Button>
      </div>
    </div>
  );
}
