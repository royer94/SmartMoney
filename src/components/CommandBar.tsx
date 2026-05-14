import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, MicOff, Sparkles, Command as CommandIcon, Trash2, X, DollarSign, Camera, Image, FileUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { parseTransaction, generateVoiceReport } from '../lib/gemini';
import { Transaction, UserProfile, COMMANDS, FREE_LIMIT } from '../types';
import { cn, formatCurrency } from '../lib/utils';
import { FINANCE_TIPS } from '../lib/tips';
interface Message {
id: string;
role: 'user' | 'ai';
text: string;
transaction?: any;
}
export function CommandBar({ user, addTransaction, transactions, addGoal, autoStartRecording }: { user: UserProfile, addTransaction: any, transactions: Transaction[], addGoal: any, autoStartRecording?: boolean, key?: string }) {
const [input, setInput] = useState('');
const [messages, setMessages] = useState<Message[]>([]);
const [isRecording, setIsRecording] = useState(false);
const [isLoading, setIsLoading] = useState(false);
const scrollRef = useRef<HTMLDivElement>(null);
const mediaRecorder = useRef<MediaRecorder | null>(null);
const audioChunks = useRef<Blob[]>([]);
const silenceTimer = useRef<number | null>(null);
const audioContext = useRef<AudioContext | null>(null);
const streamRef = useRef<MediaStream | null>(null);
useEffect(() => {
if (autoStartRecording) {
// Delay slightly to ensure browser allows audio context if it was a user interaction that triggered this
const timer = setTimeout(() => {
startRecording();
}, 100);
return () => clearTimeout(timer);
}
}, [autoStartRecording]);
useEffect(() => {
if (scrollRef.current) {
scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
}
}, [messages]);
useEffect(() => {
return () => {
if (silenceTimer.current) cancelAnimationFrame(silenceTimer.current);
if (audioContext.current) audioContext.current.close().catch(() => {});
if (streamRef.current) {
streamRef.current.getTracks().forEach(track => track.stop());
}
};
}, []);
const addMessage = (role: 'user' | 'ai', text: string, transaction?: any) => {
setMessages(prev => [...prev, { id: Math.random().toString(), role, text, transaction }]);
};
const fileInputRef = useRef<HTMLInputElement>(null);
const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
const file = e.target.files?.[0];
if (!file) return;
