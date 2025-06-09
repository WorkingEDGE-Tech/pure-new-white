
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { X, Send, Hash, Users, ChevronDown, MessageSquare } from 'lucide-react';
import { chatService } from '@/services/database';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface ChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChatPanel = ({ isOpen, onClose }: ChatPanelProps) => {
  const [channels, setChannels] = useState<any[]>([]);
  const [activeChannel, setActiveChannel] = useState<string>('');
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isChannelListOpen, setIsChannelListOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      loadChannels();
    }
  }, [isOpen]);

  useEffect(() => {
    if (activeChannel) {
      loadMessages();
      // Set up real-time subscription for messages
      const interval = setInterval(loadMessages, 3000); // Poll every 3 seconds for new messages
      return () => clearInterval(interval);
    }
  }, [activeChannel]);

  const loadChannels = async () => {
    try {
      setLoading(true);
      const data = await chatService.getChannels();
      setChannels(data || []);
      if (data && data.length > 0 && !activeChannel) {
        setActiveChannel(data[0].id);
      }
    } catch (error) {
      console.error('Error loading channels:', error);
      toast({
        title: "Error",
        description: "Failed to load chat channels",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async () => {
    if (!activeChannel) return;
    
    try {
      const data = await chatService.getMessages(activeChannel);
      setMessages(data || []);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !activeChannel) return;

    try {
      const messageData = {
        channel_id: activeChannel,
        user_name: 'User', // This will be replaced with actual user names when auth is implemented
        message: newMessage.trim()
      };

      await chatService.sendMessage(messageData);
      setNewMessage('');
      loadMessages(); // Reload messages to show the new one
      
      toast({
        title: "Message sent",
        description: "Your message has been sent successfully",
      });
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  };

  const activeChannelData = channels.find(ch => ch.id === activeChannel);
  const activeChannelName = activeChannelData?.name || 'General';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 md:relative md:inset-auto z-50 md:z-auto w-full md:w-80 h-full bg-white dark:bg-slate-800 border-l border-gray-200 dark:border-slate-700 shadow-lg flex flex-col transition-all duration-300 animate-slide-in-right">
      {/* Header */}
      <div className="p-3 md:p-4 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Staff Chat</h2>
        <Button variant="ghost" size="sm" onClick={onClose} className="transition-all duration-200 hover:scale-110">
          <X className="w-4 h-4" />
        </Button>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600 dark:text-gray-400">Loading channels...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Mobile Channel Selector */}
          <div className="md:hidden border-b border-gray-200 dark:border-slate-700">
            <button
              onClick={() => setIsChannelListOpen(!isChannelListOpen)}
              className="w-full p-3 flex items-center justify-between text-left hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
            >
              <span className="font-medium text-gray-900 dark:text-white">{activeChannelName}</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${isChannelListOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {isChannelListOpen && (
              <div className="border-t border-gray-200 dark:border-slate-700 animate-fade-in">
                {channels.map((channel) => (
                  <button
                    key={channel.id}
                    onClick={() => {
                      setActiveChannel(channel.id);
                      setIsChannelListOpen(false);
                    }}
                    className={`w-full flex items-center justify-between p-3 text-sm transition-all duration-200 ${
                      activeChannel === channel.id
                        ? 'bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      {channel.type === 'school' ? (
                        <Hash className="w-3 h-3" />
                      ) : (
                        <Users className="w-3 h-3" />
                      )}
                      <span>{channel.name}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Desktop Channels */}
          <div className="hidden md:block border-b border-gray-200 dark:border-slate-700">
            <div className="p-3">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Channels</h3>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {channels.map((channel) => (
                  <button
                    key={channel.id}
                    onClick={() => setActiveChannel(channel.id)}
                    className={`w-full flex items-center justify-between p-2 rounded text-sm transition-all duration-200 hover:scale-105 ${
                      activeChannel === channel.id
                        ? 'bg-blue-50 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      {channel.type === 'school' ? (
                        <Hash className="w-3 h-3" />
                      ) : (
                        <Users className="w-3 h-3" />
                      )}
                      <span className="truncate">{channel.name}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3 md:space-y-4">
            {messages.length > 0 ? (
              messages.map((message) => (
                <div key={message.id} className="animate-fade-in">
                  <div className="max-w-[85%] md:max-w-xs p-3 rounded-lg transition-all duration-200 hover:scale-105 bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-white">
                    <p className="text-xs font-medium mb-1 opacity-70">{message.user_name}</p>
                    <p className="text-sm break-words">{message.message}</p>
                    <p className="text-xs mt-1 opacity-70">
                      {format(new Date(message.created_at), 'HH:mm')}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-gray-600 dark:text-gray-400 py-8">
                <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No messages yet</p>
                <p className="text-sm">Start the conversation!</p>
              </div>
            )}
          </div>

          {/* Message Input */}
          <div className="p-3 md:p-4 border-t border-gray-200 dark:border-slate-700">
            <div className="flex space-x-2">
              <Input
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                className="transition-all duration-200 focus:scale-105 text-sm md:text-base"
              />
              <Button 
                size="sm" 
                className="px-3 transition-all duration-200 hover:scale-110 shrink-0" 
                onClick={sendMessage}
                disabled={!newMessage.trim()}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
