/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import confetti from 'canvas-confetti';
import { 
  Sparkles, 
  Download, 
  User, 
  Palette, 
  MessageSquare, 
  Send, 
  Loader2, 
  CheckCircle2, 
  Image as ImageIcon,
  BookOpen,
  RefreshCw,
  Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { generateColoringPage, getChatResponse } from '@/lib/gemini';
import { motion, AnimatePresence } from 'motion/react';

type PageStatus = 'idle' | 'generating' | 'completed' | 'error';

interface ColoringPage {
  id: number;
  url: string | null;
  status: PageStatus;
}

interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

export default function App() {
  const [childName, setChildName] = useState('');
  const [theme, setTheme] = useState('');
  const [imageSize, setImageSize] = useState<'1K' | '2K' | '4K'>('1K');
  const [pages, setPages] = useState<ColoringPage[]>(
    Array.from({ length: 5 }, (_, i) => ({ id: i + 1, url: null, status: 'idle' }))
  );
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: 'model', content: "Hi! I'm your coloring book buddy. What should we draw today? Maybe 'space dinosaurs' or 'underwater unicorns'?" }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages]);

  const handleSendMessage = async () => {
    if (!chatInput.trim()) return;

    const userMsg: ChatMessage = { role: 'user', content: chatInput };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setIsChatLoading(true);

    try {
      const response = await getChatResponse([...chatMessages, userMsg]);
      setChatMessages(prev => [...prev, { role: 'model', content: response || "I'm not sure what to say, but let's keep drawing!" }]);
    } catch (error) {
      console.error("Chat error:", error);
      setChatMessages(prev => [...prev, { role: 'model', content: "Oops, I got a little confused. Can you try again?" }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const generatePage = async (pageId: number) => {
    if (!childName || !theme) return;

    setPages(prev => prev.map(p => p.id === pageId ? { ...p, status: 'generating' } : p));

    try {
      const url = await generateColoringPage(theme, childName, imageSize);
      setPages(prev => prev.map(p => p.id === pageId ? { ...p, url, status: 'completed' } : p));
    } catch (error) {
      console.error(`Error generating page ${pageId}:`, error);
      setPages(prev => prev.map(p => p.id === pageId ? { ...p, status: 'error' } : p));
    }
  };

  const generateAllPages = async () => {
    if (!childName || !theme) return;
    setIsGeneratingAll(true);
    
    // Reset pages
    setPages(Array.from({ length: 5 }, (_, i) => ({ id: i + 1, url: null, status: 'idle' })));

    // Generate sequentially to avoid rate limits and show progress
    for (let i = 1; i <= 5; i++) {
      await generatePage(i);
    }
    
    setIsGeneratingAll(false);
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#FF6B6B', '#4ECDC4', '#FFE66D', '#1A535C']
    });
  };

  const downloadPDF = () => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Cover Page
    doc.setFillColor(255, 245, 230); // Warm cream
    doc.rect(0, 0, pageWidth, pageHeight, 'F');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(40);
    doc.setTextColor(40, 40, 40);
    doc.text('My Magic', pageWidth / 2, 60, { align: 'center' });
    doc.text('Coloring Book', pageWidth / 2, 80, { align: 'center' });
    
    doc.setFontSize(24);
    doc.setTextColor(255, 107, 107); // Coral
    doc.text(`Created for ${childName}`, pageWidth / 2, 120, { align: 'center' });
    
    doc.setFontSize(16);
    doc.setTextColor(100, 100, 100);
    doc.text(`Theme: ${theme}`, pageWidth / 2, 140, { align: 'center' });

    // Add a simple border to cover
    doc.setDrawColor(255, 107, 107);
    doc.setLineWidth(2);
    doc.rect(10, 10, pageWidth - 20, pageHeight - 20);

    // Coloring Pages
    pages.forEach((page) => {
      if (page.url) {
        doc.addPage();
        // Add image to full page with some margin
        const margin = 10;
        doc.addImage(page.url, 'PNG', margin, margin, pageWidth - (margin * 2), pageHeight - (margin * 2));
        
        // Add page number or footer
        doc.setFontSize(10);
        doc.setTextColor(150, 150, 150);
        doc.text(`Page ${page.id} - ${childName}'s ${theme} Book`, pageWidth / 2, pageHeight - 5, { align: 'center' });
      }
    });

    doc.save(`${childName}_Coloring_Book.pdf`);
  };

  const isReadyToDownload = pages.every(p => p.status === 'completed');

  return (
    <div className="min-h-screen bg-[#FDFCF0] text-[#2D3436] font-sans selection:bg-[#FFE66D]">
      {/* Header */}
      <header className="border-b border-[#E0E0E0] bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-[#FF6B6B] p-2 rounded-xl rotate-3 shadow-lg">
              <Palette className="text-white w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[#1A535C]">
              Coloring <span className="text-[#FF6B6B]">Magic</span>
            </h1>
          </div>
          <div className="hidden md:flex items-center gap-4">
            <Badge variant="outline" className="bg-[#4ECDC4]/10 text-[#1A535C] border-[#4ECDC4]/30 px-3 py-1">
              AI Powered
            </Badge>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Controls & Chat */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="border-none shadow-xl bg-white rounded-3xl overflow-hidden">
            <CardHeader className="bg-[#4ECDC4] text-white">
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Book Settings
              </CardTitle>
              <CardDescription className="text-white/80">
                Tell us about the lucky child!
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold flex items-center gap-2">
                  <User className="w-4 h-4 text-[#FF6B6B]" />
                  Child's Name
                </label>
                <Input 
                  placeholder="e.g. Leo" 
                  value={childName}
                  onChange={(e) => setChildName(e.target.value)}
                  className="rounded-xl border-[#E0E0E0] focus:ring-[#4ECDC4] focus:border-[#4ECDC4]"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#FFE66D]" />
                  Book Theme
                </label>
                <Input 
                  placeholder="e.g. Space Dinosaurs" 
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                  className="rounded-xl border-[#E0E0E0] focus:ring-[#4ECDC4] focus:border-[#4ECDC4]"
                />
              </div>
              <div className="space-y-4 pt-2">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-semibold flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-[#4ECDC4]" />
                    Image Quality
                  </label>
                  <Badge variant="secondary" className="bg-[#FDFCF0]">{imageSize}</Badge>
                </div>
                <Tabs 
                  value={imageSize} 
                  onValueChange={(v) => setImageSize(v as any)}
                  className="w-full"
                >
                  <TabsList className="grid grid-cols-3 w-full rounded-xl bg-[#FDFCF0] p-1">
                    <TabsTrigger value="1K" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">1K</TabsTrigger>
                    <TabsTrigger value="2K" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">2K</TabsTrigger>
                    <TabsTrigger value="4K" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">4K</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </CardContent>
            <CardFooter className="bg-[#FDFCF0]/50 border-t border-[#E0E0E0]/50 p-4">
              <Button 
                onClick={generateAllPages} 
                disabled={!childName || !theme || isGeneratingAll}
                className="w-full rounded-2xl bg-[#FF6B6B] hover:bg-[#FF5252] text-white shadow-lg shadow-[#FF6B6B]/20 py-6 text-lg font-bold transition-all active:scale-95"
              >
                {isGeneratingAll ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Creating Magic...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-5 w-5" />
                    Generate Full Book
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>

          {/* Chat Assistant */}
          <Card className="border-none shadow-xl bg-white rounded-3xl overflow-hidden flex flex-col h-[400px]">
            <CardHeader className="bg-[#1A535C] text-white py-4">
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                Idea Buddy
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 p-0 overflow-hidden relative">
              <ScrollArea className="h-full p-4">
                <div className="space-y-4">
                  {chatMessages.map((msg, i) => (
                    <div 
                      key={i} 
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div 
                        className={`max-w-[85%] p-3 rounded-2xl text-sm ${
                          msg.role === 'user' 
                            ? 'bg-[#4ECDC4] text-white rounded-tr-none' 
                            : 'bg-[#FDFCF0] text-[#1A535C] rounded-tl-none border border-[#E0E0E0]'
                        }`}
                      >
                        {msg.content}
                      </div>
                    </div>
                  ))}
                  {isChatLoading && (
                    <div className="flex justify-start">
                      <div className="bg-[#FDFCF0] p-3 rounded-2xl rounded-tl-none border border-[#E0E0E0]">
                        <Loader2 className="w-4 h-4 animate-spin text-[#4ECDC4]" />
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
              </ScrollArea>
            </CardContent>
            <CardFooter className="p-3 border-t border-[#E0E0E0]/50">
              <form 
                onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
                className="flex w-full gap-2"
              >
                <Input 
                  placeholder="Need ideas?" 
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  className="rounded-xl border-[#E0E0E0] focus:ring-[#4ECDC4]"
                />
                <Button 
                  type="submit" 
                  size="icon" 
                  disabled={isChatLoading || !chatInput.trim()}
                  className="rounded-xl bg-[#4ECDC4] hover:bg-[#45B7AF]"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </CardFooter>
          </Card>
        </div>

        {/* Right Column: Preview & Pages */}
        <div className="lg:col-span-8 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-[#1A535C] flex items-center gap-2">
              <ImageIcon className="w-5 h-5" />
              Book Preview
            </h2>
            {isReadyToDownload && (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
              >
                <Button 
                  onClick={downloadPDF}
                  className="bg-[#1A535C] hover:bg-[#14424A] text-white rounded-xl shadow-lg"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download PDF
                </Button>
              </motion.div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {/* Cover Preview */}
            <Card className="border-2 border-dashed border-[#E0E0E0] bg-white rounded-3xl overflow-hidden aspect-[3/4] flex flex-col items-center justify-center p-6 text-center relative group">
              <div className="absolute inset-0 bg-[#FDFCF0] opacity-50 z-0" />
              <div className="z-10 space-y-4">
                <div className="w-20 h-20 bg-[#FF6B6B]/10 rounded-full flex items-center justify-center mx-auto">
                  <BookOpen className="w-10 h-10 text-[#FF6B6B]" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-[#1A535C]">Magic Book</h3>
                  <p className="text-[#FF6B6B] font-bold text-lg">{childName || "Child's Name"}</p>
                </div>
                <Separator className="bg-[#E0E0E0]" />
                <p className="text-xs text-[#1A535C]/60 uppercase tracking-widest font-bold">Cover Page</p>
              </div>
            </Card>

            {/* Generated Pages */}
            {pages.map((page) => (
              <Card 
                key={page.id} 
                className="border-none shadow-lg bg-white rounded-3xl overflow-hidden aspect-[3/4] flex flex-col relative group"
              >
                {page.status === 'idle' && (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
                    <div className="w-16 h-16 bg-[#FDFCF0] rounded-full flex items-center justify-center">
                      <ImageIcon className="w-8 h-8 text-[#E0E0E0]" />
                    </div>
                    <p className="text-sm text-[#1A535C]/40 font-medium">Page {page.id} is waiting for magic...</p>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => generatePage(page.id)}
                      disabled={!childName || !theme || isGeneratingAll}
                      className="text-[#4ECDC4] hover:text-[#45B7AF] hover:bg-[#4ECDC4]/5 rounded-xl"
                    >
                      Generate This Page
                    </Button>
                  </div>
                )}

                {page.status === 'generating' && (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
                    <div className="relative">
                      <Loader2 className="w-12 h-12 animate-spin text-[#4ECDC4]" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-[10px] font-bold text-[#4ECDC4]">{page.id}</span>
                      </div>
                    </div>
                    <p className="text-sm text-[#4ECDC4] font-bold animate-pulse">Drawing magic lines...</p>
                  </div>
                )}

                {page.status === 'completed' && page.url && (
                  <>
                    <div className="flex-1 relative overflow-hidden">
                      <img 
                        src={page.url} 
                        alt={`Coloring page ${page.id}`} 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <Button 
                          size="sm" 
                          variant="secondary"
                          onClick={() => generatePage(page.id)}
                          className="rounded-xl shadow-lg"
                        >
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Redraw
                        </Button>
                      </div>
                    </div>
                    <div className="p-3 bg-white border-t border-[#FDFCF0] flex items-center justify-between">
                      <span className="text-xs font-bold text-[#1A535C]/60">Page {page.id}</span>
                      <CheckCircle2 className="w-4 h-4 text-[#4ECDC4]" />
                    </div>
                  </>
                )}

                {page.status === 'error' && (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
                    <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center">
                      <Trash2 className="w-8 h-8 text-red-300" />
                    </div>
                    <p className="text-sm text-red-500 font-medium">Oops! The magic failed.</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => generatePage(page.id)}
                      className="border-red-200 text-red-500 hover:bg-red-50 rounded-xl"
                    >
                      Try Again
                    </Button>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-4 py-12 text-center">
        <Separator className="mb-8 bg-[#E0E0E0]" />
        <p className="text-sm text-[#1A535C]/40 font-medium">
          Made with magic and AI for little artists everywhere.
        </p>
      </footer>
    </div>
  );
}
